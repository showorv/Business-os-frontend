import { AlertTriangle, Plus, UserRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { PillTabs } from "@/features/ledger/parts";
import { cn } from "@/lib/cn";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { useTaskSummary, type TaskFilters } from "./api";
import { Board } from "./Board";
import { CalendarTab } from "./CalendarTab";
import { NewTaskDialog } from "./NewTaskDialog";
import { RemindersTab } from "./RemindersTab";
import { TaskList } from "./TaskList";
import { TaskPanel } from "./TaskPanel";

const TABS = ["board", "list", "calendar", "reminders"] as const;
type Tab = (typeof TABS)[number];
const VIEWS = ["all", "mine", "overdue"] as const;
type View = (typeof VIEWS)[number];

// Everyone's work in one place: a board to move tasks along, a list, a calendar and reminders.
export const TasksPage = () => {
  const { t } = useTranslation(["tasks", "shell"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const tab: Tab = TABS.includes(params.get("tab") as Tab) ? (params.get("tab") as Tab) : "board";
  const view: View = VIEWS.includes(params.get("view") as View) ? (params.get("view") as View) : "all";
  const openTask = params.get("task");

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  if (!business || access.isLoading) return <Spinner className="mt-16" />;
  const canWrite = access.can(Permission.TASKS_WRITE) && access.writable;
  const filters: TaskFilters = { ...(view === "mine" ? { mine: true } : {}), ...(view === "overdue" ? { overdue: true } : {}) };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("shell:tasks")}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{t("tasks:subtitle")}</p>
        </div>
        {canWrite ? (
          <Button onClick={() => setAdding(true)}>
            <Plus />
            {t("tasks:newTask")}
          </Button>
        ) : null}
      </header>

      <Summary businessId={businessId} view={view} onView={(value) => update({ view: value === "all" ? null : value, tab: tab === "calendar" || tab === "reminders" ? null : tab })} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillTabs label={t("shell:tasks")} value={tab} options={TABS.map((value) => ({ value, label: t(`tasks:tab_${value}`) }))} onChange={(value) => update({ tab: value === "board" ? null : value })} />
        {tab === "board" || tab === "list" ? (
          <div role="radiogroup" aria-label={t("tasks:show")} className="inline-flex rounded-md border bg-muted p-1 text-sm">
            {VIEWS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={view === value}
                onClick={() => update({ view: value === "all" ? null : value })}
                className={cn("rounded px-3 py-1 font-medium transition-colors", view === value ? "bg-surface shadow-xs" : "text-muted-foreground hover:text-foreground")}
              >
                {t(`tasks:view_${value}`)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {tab === "board" ? <Board businessId={businessId} filters={filters} canWrite={canWrite} onOpen={(id) => update({ task: id })} /> : null}
      {tab === "list" ? <TaskList businessId={businessId} filters={filters} onOpen={(id) => update({ task: id })} /> : null}
      {tab === "calendar" ? <CalendarTab businessId={businessId} business={business} onOpenTask={(id) => update({ task: id })} /> : null}
      {tab === "reminders" ? <RemindersTab businessId={businessId} business={business} canWrite={canWrite} /> : null}

      {openTask ? <TaskPanel key={openTask} businessId={businessId} taskId={openTask} canWrite={canWrite} onClose={() => update({ task: null })} /> : null}
      {adding ? <NewTaskDialog businessId={businessId} onClose={() => setAdding(false)} onCreated={(id) => update({ task: id })} /> : null}
    </div>
  );
};

// The counts on top. "Mine" and "Overdue" also act as quick filters.
const Summary = ({ businessId, view, onView }: { businessId: string; view: View; onView: (view: View) => void }) => {
  const { t } = useTranslation("tasks");
  const { locale } = useFormatting();
  const summary = useTaskSummary(businessId);
  const data = summary.data;
  const open = data ? data.todo + data.inProgress + data.blocked : 0;
  const finished = data ? data.done : 0;
  const percent = open + finished ? Math.round((finished / (open + finished)) * 100) : 0;
  const number = (value: number | undefined) => (value ?? 0).toLocaleString(locale);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("openTasks")}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{number(open)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("openBreakdown", { todo: number(data?.todo), doing: number(data?.inProgress), blocked: number(data?.blocked) })}</p>
      </Card>
      <Card className="p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">{t("completed")}</p>
          <p className="text-sm font-medium tabular-nums">{t("percent", { value: number(percent) })}</p>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{number(finished)}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
      </Card>
      <QuickFilter active={view === "mine"} onClick={() => onView(view === "mine" ? "all" : "mine")} icon={UserRound} label={t("assignedToMe")} value={number(data?.assignedToMe)} />
      <QuickFilter active={view === "overdue"} onClick={() => onView(view === "overdue" ? "all" : "overdue")} icon={AlertTriangle} label={t("overdue")} value={number(data?.overdue)} danger={(data?.overdue ?? 0) > 0} />
    </div>
  );
};

const QuickFilter = ({ active, onClick, icon: Icon, label, value, danger }: { active: boolean; onClick: () => void; icon: typeof UserRound; label: string; value: string; danger?: boolean }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      "rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand",
      active ? "border-foreground bg-foreground text-background" : "bg-surface hover:border-foreground/40",
    )}
  >
    <span className={cn("flex items-center gap-1.5 text-sm", !active && "text-muted-foreground")}>
      <Icon className="size-4" />
      {label}
    </span>
    <span className={cn("mt-1 block text-2xl font-semibold tabular-nums", danger && !active && "text-danger")}>{value}</span>
  </button>
);
