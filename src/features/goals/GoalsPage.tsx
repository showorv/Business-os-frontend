import { MoreHorizontal, Plus, Target, Trophy } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { ProgressRing } from "@/components/charts/Figures";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { useCreateGoal, useGoals, useUpdateGoal, type Goal, type NewGoal } from "@/features/analytics/api";
import { useAccess } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { cn } from "@/lib/cn";
import { todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { minorToInput, parseMoney } from "@/lib/money";
import { addMonths, fiscalYearStart, formatMonthRange, toMonth } from "@/lib/months";
import { formatPercent } from "@/lib/numbers";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";

const METRICS = ["REVENUE", "NET_PROFIT", "CASH_BALANCE"] as const;

export const GoalsPage = () => {
  const { t } = useTranslation(["goals", "shell"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const goals = useGoals(businessId);
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Goal | null>(null);
  if (!business || access.isLoading) return <Spinner className="mt-16" />;
  const canWrite = access.can(Permission.FINANCE_WRITE) && access.writable;
  const list = [...(goals.data ?? [])].sort((a, b) => (a.status === "CANCELLED" ? 1 : 0) - (b.status === "CANCELLED" ? 1 : 0));
  const now = toMonth(todayIn(business.timezone));
  const close = () => {
    setEditing(null);
    setParams({}, { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("shell:goals")}</h1>
          <p className="mt-1 text-muted-foreground">{t("goals:subtitle")}</p>
        </div>
        {canWrite ? (
          <Button onClick={() => setParams({ new: "1" }, { replace: true })}>
            <Plus />
            {t("goals:newGoal")}
          </Button>
        ) : null}
      </header>
      {goals.isError ? <Alert tone="danger">{errorMessage(goals.error)}</Alert> : null}
      {goals.isLoading ? <Spinner /> : null}
      {goals.isSuccess && list.length === 0 ? (
        <Card>
          <EmptyState icon={Target} title={t("goals:empty")} body={t("goals:emptyHint")} />
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((goal) => (
          <GoalCard key={goal.id} businessId={businessId} goal={goal} currency={business.baseCurrency} canWrite={canWrite} onEdit={() => setEditing(goal)} />
        ))}
      </div>
      {params.get("new") === "1" || editing ? (
        <GoalDialog
          businessId={businessId}
          currency={business.baseCurrency}
          goal={editing ?? undefined}
          startMonth={fiscalYearStart(now, business.fiscalYearStartMonth)}
          endMonth={addMonths(fiscalYearStart(now, business.fiscalYearStartMonth), 11)}
          onClose={close}
        />
      ) : null}
    </div>
  );
};

const GoalCard = ({ businessId, goal, currency, canWrite, onEdit }: { businessId: string; goal: Goal; currency: string; canWrite: boolean; onEdit: () => void }) => {
  const { t } = useTranslation(["goals", "common"]);
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const update = useUpdateGoal(businessId);
  const [cancelling, setCancelling] = useState(false);
  const percent = Number(goal.progressPercent ?? 0);
  const cancelled = goal.status === "CANCELLED";
  const achieved = goal.status === "ACHIEVED" || percent >= 100;
  const remaining = BigInt(goal.remainingMinor);

  return (
    <Card className={cn("flex flex-col gap-5 p-5", cancelled && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(`goals:metric_${goal.metric}`)}</p>
          <h2 className="truncate text-lg font-semibold">{goal.name}</h2>
          <p className="text-sm text-muted-foreground">{formatMonthRange(goal.startMonth, goal.endMonth, locale, digitStyle)}</p>
        </div>
        {canWrite && !cancelled ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mt-2 -mr-2" aria-label={t("goals:options", { name: goal.name })}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>{t("goals:edit")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setCancelling(true)} className="text-danger">
                {t("goals:cancelGoal")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : cancelled ? (
          <Badge>{t("goals:cancelled")}</Badge>
        ) : null}
      </div>
      <div className="flex items-center gap-5">
        <ProgressRing percent={percent} size={96} stroke={9} label={goal.name}>
          {achieved && !cancelled ? <Trophy className="size-6" /> : <span className="text-base">{formatPercent(Math.min(percent, 999) / 100, locale, digitStyle)}</span>}
        </ProgressRing>
        <div className="min-w-0 space-y-1">
          <p className="text-2xl font-semibold tracking-tight">{money(goal.currentMinor, currency)}</p>
          <p className="text-sm text-muted-foreground">{t("goals:ofTarget", { amount: money(goal.targetMinor, currency) })}</p>
          <p className="text-sm font-medium">{achieved ? t("goals:reached") : remaining > 0n ? t("goals:toGo", { amount: money(remaining, currency) }) : null}</p>
        </div>
      </div>
      <ConfirmDialog
        open={cancelling}
        onOpenChange={setCancelling}
        title={t("goals:cancelTitle")}
        description={t("goals:cancelBody")}
        confirmLabel={t("goals:cancelGoal")}
        danger
        pending={update.isPending}
        onConfirm={() => update.mutate({ goalId: goal.id, status: "CANCELLED" }, { onSuccess: () => setCancelling(false) })}
      />
    </Card>
  );
};

interface GoalDialogProps {
  businessId: string;
  currency: string;
  goal?: Goal;
  startMonth: string;
  endMonth: string;
  onClose: () => void;
}

// New goal: what to measure, how much, over which months. Editing changes only the name and target.
const GoalDialog = ({ businessId, currency, goal, startMonth, endMonth, onClose }: GoalDialogProps) => {
  const { t } = useTranslation(["goals", "common"]);
  const create = useCreateGoal(businessId);
  const update = useUpdateGoal(businessId);
  const [name, setName] = useState(goal?.name ?? "");
  const [metric, setMetric] = useState<NewGoal["metric"]>((goal?.metric as NewGoal["metric"]) ?? "REVENUE");
  const [target, setTarget] = useState(goal ? minorToInput(goal.targetMinor, currency) : "");
  const [from, setFrom] = useState(goal?.startMonth ?? startMonth);
  const [to, setTo] = useState(goal?.endMonth ?? endMonth);
  const [problem, setProblem] = useState<string | null>(null);
  const action = goal ? update : create;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const targetMinor = parseMoney(target, currency);
    if (!name.trim()) return setProblem(t("goals:nameNeeded"));
    if (targetMinor === null || targetMinor === "0") return setProblem(t("goals:targetWrong"));
    if (!goal && (!from || !to || from > to)) return setProblem(t("goals:monthsWrong"));
    setProblem(null);
    const done = () => {
      toast.success(t(goal ? "goals:saved" : "goals:created"));
      onClose();
    };
    if (goal) update.mutate({ goalId: goal.id, name: name.trim(), targetMinor }, { onSuccess: done });
    else create.mutate({ name: name.trim(), metric, targetMinor, startMonth: from, endMonth: to }, { onSuccess: done });
  };

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent title={goal ? t("goals:editGoal") : t("goals:newGoal")} description={goal ? undefined : t("goals:newGoalHint")}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {problem ? <Alert tone="danger">{problem}</Alert> : null}
          {action.isError ? <Alert tone="danger">{errorMessage(action.error)}</Alert> : null}
          <Field label={t("goals:name")}>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("goals:namePlaceholder")} maxLength={120} autoFocus />
          </Field>
          {!goal ? (
            <Field label={t("goals:measure")} hint={t(`goals:metricHint_${metric}`)}>
              <Select value={metric} onChange={(event) => setMetric(event.target.value as NewGoal["metric"])}>
                {METRICS.map((value) => (
                  <option key={value} value={value}>
                    {t(`goals:metric_${value}`)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label={t("goals:target")}>
            <MoneyInput currency={currency} placeholder="0.00" value={target} onChange={(event) => setTarget(event.target.value)} />
          </Field>
          {!goal ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("goals:fromMonth")}>
                <Input type="month" value={from} onChange={(event) => setFrom(event.target.value)} />
              </Field>
              <Field label={t("goals:toMonth")}>
                <Input type="month" value={to} onChange={(event) => setTo(event.target.value)} />
              </Field>
            </div>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={action.isPending}>
              {goal ? t("common:save") : t("goals:create")}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
