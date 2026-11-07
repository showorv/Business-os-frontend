import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarClock, Plus, Repeat as RepeatIcon, Users, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useMoney } from "@/features/businesses/useMoney";
import { useAccounts, type Account } from "@/features/finance/api";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { repeatOf } from "@/lib/repeat";
import { useSchedules, type Schedule } from "./api";
import { ScheduleDialog } from "./ScheduleDialog";
import { SchedulePanel } from "./SchedulePanel";

// How many times a month each choice happens, for the monthly totals on top.
const PER_MONTH = { DAILY: 30, WEEKLY: 52 / 12, MONTHLY: 1, YEARLY: 1 / 12, NONE: 0, CUSTOM: 1 } as const;

export const TYPE_ICON = { INCOME: ArrowDownLeft, EXPENSE: ArrowUpRight, TRANSFER: ArrowLeftRight } as const;

// Rent, salaries, subscriptions: anything that happens on a timetable is recorded by itself.
export const RecurringPage = () => {
  const { t } = useTranslation(["recurring", "shell"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const schedules = useSchedules(businessId);
  const accounts = useAccounts(businessId);
  const money = useMoney();
  const { locale } = useFormatting();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const openId = params.get("schedule");
  if (!business || access.isLoading) return <Spinner className="mt-16" />;
  const canWrite = access.can(Permission.FINANCE_WRITE) && access.writable;
  const canPost = canWrite && access.can(Permission.LEDGER_POST);
  const list = (schedules.data ?? []).filter((schedule) => schedule.status !== "ENDED");
  const ended = (schedules.data ?? []).filter((schedule) => schedule.status === "ENDED");
  const accountOf = (id: string | null) => accounts.data?.find((account) => account.id === id);

  // Only active ones in the business's own currency count towards the totals.
  const monthly = (type: "INCOME" | "EXPENSE") =>
    list
      .filter((schedule) => schedule.status === "ACTIVE" && schedule.type === type && (accountOf(schedule.accountId)?.currency ?? business.baseCurrency) === business.baseCurrency)
      .reduce((sum, schedule) => sum + Number(schedule.amountMinor) * PER_MONTH[repeatOf(schedule.rrule)], 0);
  const out = BigInt(Math.round(monthly("EXPENSE")));
  const into = BigInt(Math.round(monthly("INCOME")));
  const active = list.filter((schedule) => schedule.status === "ACTIVE").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("shell:recurring")}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{t("recurring:subtitle")}</p>
        </div>
        {canWrite ? (
          <Button onClick={() => setAdding(true)}>
            <Plus />
            {t("recurring:newSchedule")}
          </Button>
        ) : null}
      </header>

      {list.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t("recurring:activeCount")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{active.toLocaleString(locale)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t("recurring:monthlyOut")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{money(out, business.baseCurrency)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t("recurring:monthlyIn")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{money(into, business.baseCurrency)}</p>
          </Card>
        </div>
      ) : null}

      {schedules.isError ? <Alert tone="danger">{errorMessage(schedules.error)}</Alert> : null}
      {schedules.isLoading ? <Spinner className="mt-12" /> : null}
      {schedules.isSuccess && list.length === 0 ? (
        <Card>
          <EmptyState
            icon={RepeatIcon}
            title={t("recurring:none")}
            body={t("recurring:noneHint")}
            action={
              canWrite ? (
                <Button onClick={() => setAdding(true)}>
                  <Plus />
                  {t("recurring:newSchedule")}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : null}

      {list.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((schedule) => (
            <ScheduleCard key={schedule.id} schedule={schedule} account={accountOf(schedule.accountId)} onOpen={() => setParams({ schedule: schedule.id })} />
          ))}
        </div>
      ) : null}

      {ended.length > 0 ? (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">{t("recurring:endedCount", { count: ended.length })}</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {ended.map((schedule) => (
              <ScheduleCard key={schedule.id} schedule={schedule} account={accountOf(schedule.accountId)} onOpen={() => setParams({ schedule: schedule.id })} />
            ))}
          </div>
        </details>
      ) : null}

      {openId ? <SchedulePanel key={openId} businessId={businessId} business={business} scheduleId={openId} canWrite={canWrite} onClose={() => setParams({})} /> : null}
      {adding ? <ScheduleDialog businessId={businessId} business={business} canPost={canPost} onClose={() => setAdding(false)} onCreated={(id) => setParams({ schedule: id })} /> : null}
    </div>
  );
};

const ScheduleCard = ({ schedule, account, onOpen }: { schedule: Schedule; account: Account | undefined; onOpen: () => void }) => {
  const { t } = useTranslation("recurring");
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const { business } = useCurrentBusiness();
  const Icon = schedule.kind === "SALARY" ? Users : TYPE_ICON[schedule.type];
  const repeat = repeatOf(schedule.rrule);
  const running = schedule.status === "ACTIVE";
  const sign = schedule.type === "INCOME" ? "+" : schedule.type === "EXPENSE" ? "−" : "";

  return (
    <Card className={cn("group relative p-4 transition-shadow hover:shadow-md sm:p-5", !running && "opacity-70")} data-testid="schedule-card">
      <div className="flex items-start gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", running ? "bg-foreground text-background" : "bg-muted")}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onOpen} className="block max-w-full truncate text-left font-medium after:absolute after:inset-0">
            {schedule.name}
          </button>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {t(`repeat_${repeat}`)} · {account?.name}
          </p>
        </div>
        <p className="shrink-0 font-semibold tabular-nums">
          {sign}
          {money(schedule.amountMinor, account?.currency ?? business?.baseCurrency ?? "BDT")}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {schedule.kind === "SALARY" ? <Badge>{t("salary")}</Badge> : null}
        {schedule.autoPost ? (
          <Badge className="gap-1 bg-foreground text-background">
            <Zap className="size-3" />
            {t("postsItself")}
          </Badge>
        ) : (
          <Badge className="border bg-transparent">{t("makesDrafts")}</Badge>
        )}
        {!running ? <Badge>{t(`status_${schedule.status}`)}</Badge> : null}
        {running && schedule.nextRunAt ? (
          <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
            <CalendarClock className="size-3.5" />
            {t("nextOn", { date: formatDate(new Intl.DateTimeFormat("en-CA", { timeZone: schedule.timezone }).format(new Date(schedule.nextRunAt)), locale, digitStyle) })}
          </span>
        ) : null}
      </div>
    </Card>
  );
};
