import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, Pause, Play, Square, X, Zap } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Spinner } from "@/components/ui/spinner";
import type { Business } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { useAccounts, useCategories } from "@/features/finance/api";
import { categoryName } from "@/features/finance/names";
import i18n from "@/i18n";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { minorToInput, parseMoney } from "@/lib/money";
import { useFormatting } from "@/lib/preferences";
import { repeatOf, ruleFor } from "@/lib/repeat";
import { useRunSchedule, useSchedule, useUpdateSchedule, type ScheduleDetail } from "./api";
import { describeRepeat, SCHEDULE_REPEATS, type ScheduleRepeat } from "./parts";
import { REMIND_DAYS } from "./ScheduleDialog";

// One schedule: what it does, when it runs next, what it has made so far, and the controls.
export const SchedulePanel = ({ businessId, business, scheduleId, canWrite, onClose }: { businessId: string; business: Business; scheduleId: string; canWrite: boolean; onClose: () => void }) => {
  const { t } = useTranslation(["recurring", "common"]);
  const schedule = useSchedule(businessId, scheduleId);

  return (
    <Dialog.Root open onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Content className="animate-chart-fade fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto border-l bg-surface shadow-xl outline-none">
          <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
            <Dialog.Description className="text-sm text-muted-foreground">{t("recurring:schedule")}</Dialog.Description>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label={t("common:close")}>
                <X />
              </Button>
            </Dialog.Close>
          </div>
          {schedule.isError ? (
            <div className="p-5">
              <Dialog.Title className="sr-only">{t("recurring:schedule")}</Dialog.Title>
              <Alert tone="danger">{errorMessage(schedule.error)}</Alert>
            </div>
          ) : null}
          {schedule.isLoading ? <Spinner className="mt-16" /> : null}
          {schedule.data ? <Body businessId={businessId} business={business} schedule={schedule.data} canWrite={canWrite} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const Body = ({ businessId, business, schedule, canWrite }: { businessId: string; business: Business; schedule: ScheduleDetail; canWrite: boolean }) => {
  const { t } = useTranslation(["recurring", "finance", "common"]);
  const { locale, digitStyle } = useFormatting();
  const money = useMoney();
  const accounts = useAccounts(businessId);
  const categories = useCategories(businessId);
  const update = useUpdateSchedule(businessId);
  const run = useRunSchedule(businessId);
  const [ending, setEnding] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const account = accounts.data?.find((item) => item.id === schedule.accountId);
  const toAccount = accounts.data?.find((item) => item.id === schedule.toAccountId);
  const category = categories.data?.find((item) => item.id === schedule.categoryId);
  const currency = account?.currency ?? business.baseCurrency;
  const active = schedule.status === "ACTIVE";
  const ended = schedule.status === "ENDED";
  const due = active && schedule.nextRunAt !== null && new Date(schedule.nextRunAt).getTime() <= openedAt;
  const nextDate = schedule.nextRunAt ? new Intl.DateTimeFormat("en-CA", { timeZone: schedule.timezone }).format(new Date(schedule.nextRunAt)) : null;
  const made = schedule.runs.filter((item) => item.status === "CREATED").length;

  const setStatus = (status: "ACTIVE" | "PAUSED" | "ENDED", message: string) =>
    update.mutate(
      { scheduleId: schedule.id, status },
      {
        onSuccess: () => {
          toast.success(message);
          setEnding(false);
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  const runNow = () =>
    run.mutate(schedule.id, {
      onSuccess: (after) => toast.success(after.runs.length > schedule.runs.length ? t("recurring:ranNow") : t("recurring:nothingDue")),
      onError: (error) => toast.error(errorMessage(error)),
    });

  return (
    <>
      <div className="space-y-5 border-b p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{t(`recurring:kind_${schedule.kind}`)}</Badge>
            <Badge className={cn(active ? "bg-foreground text-background" : "border bg-transparent")}>{t(`recurring:status_${schedule.status}`)}</Badge>
          </div>
          <Dialog.Title className="mt-3 text-xl leading-snug font-semibold break-words">{schedule.name}</Dialog.Title>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {schedule.type === "INCOME" ? "+" : schedule.type === "EXPENSE" ? "−" : ""}
            {money(schedule.amountMinor, currency)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{describeRepeat(t, repeatOf(schedule.rrule), schedule.startDate, locale, digitStyle)}</p>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t("finance:type")}</dt>
            <dd className="mt-0.5 font-medium">{t(`finance:type_${schedule.type}`)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{schedule.type === "TRANSFER" ? t("recurring:fromTo") : t("finance:account")}</dt>
            <dd className="mt-0.5 flex min-w-0 items-center gap-1 font-medium">
              <span className="truncate">{account?.name ?? "—"}</span>
              {toAccount ? (
                <>
                  <ArrowRight className="size-3.5 shrink-0" />
                  <span className="truncate">{toAccount.name}</span>
                </>
              ) : null}
            </dd>
          </div>
          {category ? (
            <div>
              <dt className="text-xs text-muted-foreground">{t("finance:category")}</dt>
              <dd className="mt-0.5 font-medium">{categoryName(category, locale)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-muted-foreground">{t("recurring:whenRun")}</dt>
            <dd className="mt-0.5 flex items-center gap-1 font-medium">
              {schedule.autoPost ? <Zap className="size-3.5" /> : null}
              {schedule.autoPost ? t("recurring:postsItself") : t("recurring:makesDrafts")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("recurring:remindMe")}</dt>
            <dd className="mt-0.5 font-medium">{schedule.remindDaysBefore === null ? t("recurring:noReminder") : t("recurring:daysBefore", { count: schedule.remindDaysBefore })}</dd>
          </div>
        </dl>

        {active && nextDate ? (
          <div className={cn("flex items-center gap-3 rounded-lg border p-3", due && "border-foreground")}>
            <CalendarClock className="size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{due ? t("recurring:dueNow") : t("recurring:nextRun")}</p>
              <p className="font-medium">{formatDate(nextDate, locale, digitStyle)}</p>
            </div>
            {canWrite && due ? (
              <Button size="sm" onClick={runNow} disabled={run.isPending}>
                <Play />
                {t("recurring:runNow")}
              </Button>
            ) : null}
          </div>
        ) : null}

        {canWrite && !ended ? (
          <div className="flex flex-wrap gap-2">
            {active ? (
              <Button variant="outline" size="sm" onClick={() => setStatus("PAUSED", t("recurring:paused"))} disabled={update.isPending}>
                <Pause />
                {t("recurring:pause")}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setStatus("ACTIVE", t("recurring:resumed"))} disabled={update.isPending}>
                <Play />
                {t("recurring:resume")}
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-danger" onClick={() => setEnding(true)}>
              <Square />
              {t("recurring:end")}
            </Button>
          </div>
        ) : null}
      </div>

      {canWrite && !ended && accounts.data && categories.data ? <EditForm businessId={businessId} schedule={schedule} currency={currency} /> : null}

      <section className="p-5" aria-labelledby="runs-heading">
        <h3 id="runs-heading" className="text-sm font-semibold">
          {t("recurring:history")}
          {made > 0 ? <span className="ml-1.5 font-normal text-muted-foreground">{t("recurring:madeCount", { count: made })}</span> : null}
        </h3>
        {schedule.runs.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{t("recurring:noRuns")}</p> : null}
        <ol className="mt-3 space-y-1">
          {schedule.runs.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/50" data-testid="schedule-run">
              {item.status === "CREATED" ? <CheckCircle2 className="size-4 shrink-0" /> : <CircleAlert className="size-4 shrink-0 text-danger" />}
              <span className="w-28 shrink-0 tabular-nums">{formatDate(item.occurrenceDate, locale, digitStyle)}</span>
              {item.transactionId ? (
                <Link to={`/b/${businessId}/transactions/${item.transactionId}`} className="flex-1 truncate font-medium hover:underline">
                  {t("recurring:openTransaction")}
                </Link>
              ) : (
                <span className="flex-1 truncate text-danger">{item.errorCode ? i18n.t(`errors:${item.errorCode}`, { defaultValue: i18n.t("errors:UNKNOWN") }) : t("recurring:failed")}</span>
              )}
              <span className="hidden text-xs text-muted-foreground sm:inline">{formatDateTime(item.createdAt, locale, digitStyle)}</span>
            </li>
          ))}
        </ol>
      </section>

      <ConfirmDialog
        open={ending}
        onOpenChange={setEnding}
        title={t("recurring:endTitle", { name: schedule.name })}
        description={t("recurring:endHint")}
        confirmLabel={t("recurring:end")}
        danger
        pending={update.isPending}
        onConfirm={() => setStatus("ENDED", t("recurring:endedToast"))}
      />
    </>
  );
};

const EditForm = ({ businessId, schedule, currency }: { businessId: string; schedule: ScheduleDetail; currency: string }) => {
  const { t } = useTranslation(["recurring", "common"]);
  const update = useUpdateSchedule(businessId);
  const original = repeatOf(schedule.rrule);
  const [name, setName] = useState(schedule.name);
  const [amount, setAmount] = useState(minorToInput(schedule.amountMinor, currency));
  const [repeat, setRepeat] = useState<ScheduleRepeat | "CUSTOM">(original === "NONE" ? "CUSTOM" : original);
  const [remind, setRemind] = useState(schedule.remindDaysBefore === null ? "" : String(schedule.remindDaysBefore));
  const amountMinor = parseMoney(amount, currency);
  const changed = name.trim() !== schedule.name || amountMinor !== schedule.amountMinor || repeat !== original || remind !== (schedule.remindDaysBefore === null ? "" : String(schedule.remindDaysBefore));
  const valid = Boolean(name.trim()) && Boolean(amountMinor) && amountMinor !== "0";

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!valid || !amountMinor) return;
    update.mutate(
      {
        scheduleId: schedule.id,
        name: name.trim(),
        amountMinor,
        ...(repeat !== original && repeat !== "CUSTOM" ? { rrule: ruleFor(repeat, schedule.startDate)! } : {}),
        remindDaysBefore: remind === "" ? null : Number(remind),
      },
      { onSuccess: () => toast.success(t("recurring:saved")) },
    );
  };

  return (
    <form onSubmit={save} className="space-y-4 border-b p-5" noValidate>
      <h3 className="text-sm font-semibold">{t("recurring:change")}</h3>
      {update.isError ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}
      <Field label={t("recurring:name")}>
        <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("recurring:amount")}>
          <MoneyInput currency={currency} value={amount} onChange={(event) => setAmount(event.target.value)} />
        </Field>
        <Field label={t("recurring:repeats")}>
          <Select value={repeat} onChange={(event) => setRepeat(event.target.value as ScheduleRepeat)}>
            {repeat === "CUSTOM" ? <option value="CUSTOM">{t("recurring:repeat_CUSTOM")}</option> : null}
            {SCHEDULE_REPEATS.map((value) => (
              <option key={value} value={value}>
                {t(`recurring:repeat_${value}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("recurring:remindMe")}>
        <Select value={remind} onChange={(event) => setRemind(event.target.value)}>
          <option value="">{t("recurring:noReminder")}</option>
          {REMIND_DAYS.map((days) => (
            <option key={days} value={days}>
              {t("recurring:daysBefore", { count: days })}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" className="w-full" disabled={!changed || !valid || update.isPending}>
        {t("common:save")}
      </Button>
    </form>
  );
};
