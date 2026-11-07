import { Bell, BellOff, Mail, MoreHorizontal, Plus, Repeat as RepeatIcon, Smartphone } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import type { Business } from "@/features/businesses/api";
import { useAppSelector } from "@/app/store";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { REPEATS, repeatOf, ruleFor, type Repeat } from "@/lib/repeat";
import { CHANNELS, useCreateReminder, useReminders, useUpdateReminder, type Channel, type Reminder } from "./api";
import { fromLocalInput, useMemberNames } from "./parts";

const LEADS = [0, 15, 60, 1440, 10080] as const;
const CHANNEL_ICON = { IN_APP: Bell, EMAIL: Mail, PUSH: Smartphone } as const;

// One-off and repeating reminders. Tasks with a due date and recurring transactions add their own.
export const RemindersTab = ({ businessId, business, canWrite }: { businessId: string; business: Business; canWrite: boolean }) => {
  const { t } = useTranslation("tasks");
  const [mine, setMine] = useState(false);
  const reminders = useReminders(businessId, mine);
  const [adding, setAdding] = useState(false);
  const list = (reminders.data ?? []).filter((reminder) => reminder.status !== "CANCELLED");
  // Still to come first, soonest at the top; finished and paused ones after.
  const sorted = [...list].sort((a, b) => Number(b.status === "ACTIVE") - Number(a.status === "ACTIVE") || (a.nextFireAt ?? "9").localeCompare(b.nextFireAt ?? "9"));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={mine} onChange={(event) => setMine(event.target.checked)} className="size-4 accent-foreground" />
          {t("onlyMine")}
        </label>
        {canWrite ? (
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus />
            {t("newReminder")}
          </Button>
        ) : null}
      </div>
      {reminders.isError ? <Alert tone="danger">{errorMessage(reminders.error)}</Alert> : null}
      {reminders.isLoading ? <Spinner className="mt-12" /> : null}
      {reminders.isSuccess && sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title={t("noReminders")}
            body={t("noRemindersHint")}
            action={
              canWrite ? (
                <Button onClick={() => setAdding(true)}>
                  <Plus />
                  {t("newReminder")}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : null}
      {sorted.length > 0 ? (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {sorted.map((reminder) => (
              <ReminderRow key={reminder.id} businessId={businessId} reminder={reminder} canWrite={canWrite} />
            ))}
          </ul>
        </Card>
      ) : null}
      {adding ? <ReminderDialog businessId={businessId} business={business} onClose={() => setAdding(false)} /> : null}
    </div>
  );
};

const ReminderRow = ({ businessId, reminder, canWrite }: { businessId: string; reminder: Reminder; canWrite: boolean }) => {
  const { t } = useTranslation("tasks");
  const { locale, digitStyle } = useFormatting();
  const me = useAppSelector((state) => state.auth.user);
  const update = useUpdateReminder(businessId);
  const { nameOf } = useMemberNames(businessId);
  const repeat = repeatOf(reminder.rrule);
  const active = reminder.status === "ACTIVE";
  const manual = reminder.sourceType === "MANUAL";
  const next = reminder.nextOccurrenceAt ?? reminder.startsAt;

  const change = (status: "ACTIVE" | "PAUSED" | "CANCELLED", message: string) =>
    update.mutate({ reminderId: reminder.id, status }, { onSuccess: () => toast.success(message), onError: (error) => toast.error(errorMessage(error)) });

  return (
    <li className={cn("flex items-start gap-3 px-4 py-4 sm:items-center sm:px-5", !active && "opacity-60")} data-testid="reminder-row">
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", active ? "bg-foreground text-background" : "bg-muted")}>{active ? <Bell className="size-4" /> : <BellOff className="size-4" />}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{reminder.title}</p>
          {!active ? <Badge>{t(`reminder_${reminder.status}`)}</Badge> : null}
          {!manual ? <Badge className="bg-transparent border">{t(`source_${reminder.sourceType}`)}</Badge> : null}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>{formatDateTime(next, locale, digitStyle)}</span>
          {repeat !== "NONE" ? (
            <span className="inline-flex items-center gap-1">
              <RepeatIcon className="size-3.5" />
              {t(`repeat_${repeat}`)}
            </span>
          ) : null}
          {reminder.leadMinutes ? <span>· {t(`lead_${reminder.leadMinutes}`, { defaultValue: t("leadMinutes", { count: reminder.leadMinutes }) })}</span> : null}
          {reminder.recipientUserId !== me?.id ? <span>· {t("forName", { name: nameOf(reminder.recipientUserId) })}</span> : null}
        </p>
      </div>
      <span className="hidden items-center gap-1 text-muted-foreground sm:flex" aria-label={reminder.channels.map((channel) => t(`channel_${channel}`)).join(", ")}>
        {reminder.channels.map((channel) => {
          const Icon = CHANNEL_ICON[channel];
          return <Icon key={channel} className="size-4" aria-hidden />;
        })}
      </span>
      {canWrite && manual && reminder.status !== "COMPLETED" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("reminderOptions", { title: reminder.title })}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {active ? <DropdownMenuItem onSelect={() => change("PAUSED", t("reminderPaused"))}>{t("pause")}</DropdownMenuItem> : <DropdownMenuItem onSelect={() => change("ACTIVE", t("reminderResumed"))}>{t("resume")}</DropdownMenuItem>}
            <DropdownMenuItem className="text-danger" onSelect={() => change("CANCELLED", t("reminderCancelled"))}>
              {t("cancelReminder")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
};

const ReminderDialog = ({ businessId, business, onClose }: { businessId: string; business: Business; onClose: () => void }) => {
  const { t } = useTranslation(["tasks", "common"]);
  const me = useAppSelector((state) => state.auth.user);
  const create = useCreateReminder(businessId);
  const { members } = useMemberNames(businessId);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [repeat, setRepeat] = useState<Repeat>("NONE");
  const [lead, setLead] = useState(0);
  const [channels, setChannels] = useState<Channel[]>(["IN_APP", "EMAIL", "PUSH"]);
  const [recipient, setRecipient] = useState(me?.id ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const startsAt = fromLocalInput(when);
    if (!title.trim() || !startsAt) return setProblem(t("tasks:reminderIncomplete"));
    if (channels.length === 0) return setProblem(t("tasks:channelNeeded"));
    setProblem(null);
    const rrule = ruleFor(repeat, when.slice(0, 10));
    create.mutate(
      { title: title.trim(), startsAt, timezone: business.timezone, leadMinutes: lead, channels, ...(rrule ? { rrule } : {}), ...(recipient ? { recipientUserId: recipient } : {}) },
      {
        onSuccess: () => {
          toast.success(t("tasks:reminderAdded"));
          onClose();
        },
      },
    );
  };

  return (
    <Modal open onOpenChange={(next) => !next && onClose()}>
      <ModalContent title={t("tasks:newReminder")} description={t("tasks:newReminderHint")}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {problem ? <Alert tone="danger">{problem}</Alert> : null}
          {create.isError ? <Alert tone="danger">{errorMessage(create.error)}</Alert> : null}
          <Field label={t("tasks:whatFor")}>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder={t("tasks:reminderPlaceholder")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("tasks:when")}>
              <Input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} />
            </Field>
            <Field label={t("tasks:repeats")}>
              <Select value={repeat} onChange={(event) => setRepeat(event.target.value as Repeat)}>
                {REPEATS.map((value) => (
                  <option key={value} value={value}>
                    {t(`tasks:repeat_${value}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("tasks:notifyBefore")}>
              <Select value={String(lead)} onChange={(event) => setLead(Number(event.target.value))}>
                {LEADS.map((value) => (
                  <option key={value} value={value}>
                    {t(`tasks:lead_${value}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("tasks:remind")}>
              <Select value={recipient} onChange={(event) => setRecipient(event.target.value)}>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.userId === me?.id ? t("tasks:me") : member.name || member.email}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">{t("tasks:sendBy")}</legend>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((channel) => {
                const Icon = CHANNEL_ICON[channel];
                const on = channels.includes(channel);
                return (
                  <label key={channel} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm", on && "border-foreground")}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setChannels((current) => (on ? current.filter((item) => item !== channel) : [...current, channel]))}
                      className="size-4 accent-foreground"
                    />
                    <Icon className="size-4" />
                    {t(`tasks:channel_${channel}`)}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {t("tasks:addReminder")}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
