import { CalendarClock, ListChecks, MoreHorizontal } from "lucide-react";
import { useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { ALLOWED_MOVES, BOARD_COLUMNS, canMove, useTasks, useUpdateTask, type Task, type TaskFilters, type TaskStatus } from "./api";
import { Avatar, PriorityBadge, useMemberNames } from "./parts";

const PRIORITY_ORDER = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

// Most pressing first: overdue, then by priority, then the soonest due.
const byUrgency = (a: Task, b: Task) =>
  Number(b.isOverdue) - Number(a.isOverdue) ||
  PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
  (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999");

// Four columns. Drag a card to move it along, or use its menu.
export const Board = ({ businessId, filters, canWrite, onOpen }: { businessId: string; filters: TaskFilters; canWrite: boolean; onOpen: (taskId: string) => void }) => {
  const { t } = useTranslation("tasks");
  const tasks = useTasks(businessId, filters);
  const update = useUpdateTask(businessId);
  const { nameOf } = useMemberNames(businessId);
  // A moved card shows in its new column straight away, before the list reloads.
  const [moved, setMoved] = useState<Record<string, TaskStatus>>({});
  const [dragging, setDragging] = useState<Task | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const list = (tasks.data ?? []).map((task) => (moved[task.id] ? { ...task, status: moved[task.id]! } : task));

  const move = (task: Task, status: TaskStatus) => {
    if (task.status === status || !canMove(task.status, status)) return;
    setMoved((current) => ({ ...current, [task.id]: status }));
    update.mutate(
      { taskId: task.id, status },
      {
        onSuccess: () => toast.success(t("movedTo", { status: t(`status_${status}`) })),
        onError: (error) => toast.error(errorMessage(error)),
        onSettled: () =>
          setMoved((current) => {
            const { [task.id]: _, ...rest } = current;
            return rest;
          }),
      },
    );
  };

  const drop = (event: DragEvent, status: TaskStatus) => {
    event.preventDefault();
    setOver(null);
    if (dragging) move(dragging, status);
    setDragging(null);
  };

  if (tasks.isError) return <Alert tone="danger">{errorMessage(tasks.error)}</Alert>;
  if (tasks.isLoading) return <Spinner className="mt-12" />;
  if (list.filter((task) => task.status !== "CANCELLED").length === 0) {
    return (
      <Card>
        <EmptyState icon={ListChecks} title={t(filters.mine || filters.overdue ? "noneInView" : "noTasks")} body={t(filters.mine || filters.overdue ? "noneInViewHint" : "noTasksHint")} />
      </Card>
    );
  }

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible">
      {BOARD_COLUMNS.map((status) => {
        const cards = list.filter((task) => task.status === status).sort(byUrgency);
        const allowed = dragging ? canMove(dragging.status, status) : true;
        return (
          <section
            key={status}
            aria-label={t(`status_${status}`)}
            data-testid={`column-${status}`}
            onDragOver={(event) => {
              if (!dragging || !allowed) return;
              event.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver((current) => (current === status ? null : current))}
            onDrop={(event) => drop(event, status)}
            className={cn(
              "flex w-[78vw] max-w-xs shrink-0 snap-start flex-col rounded-xl border bg-muted/40 p-2 transition-colors sm:w-72 lg:w-auto lg:max-w-none",
              over === status && "border-foreground bg-muted",
              dragging && !allowed && "opacity-40",
            )}
          >
            <header className="flex items-center justify-between px-2 py-1.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <span className={cn("size-2 rounded-full", status === "TODO" && "border border-foreground", status === "IN_PROGRESS" && "bg-foreground/60", status === "BLOCKED" && "bg-danger", status === "DONE" && "bg-foreground")} />
                {t(`status_${status}`)}
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">{cards.length}</span>
            </header>
            <ul className="flex min-h-24 flex-1 flex-col gap-2">
              {cards.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assignee={nameOf(task.assigneeId)}
                  canWrite={canWrite}
                  onOpen={() => onOpen(task.id)}
                  onMove={(next) => move(task, next)}
                  onDragStart={() => setDragging(task)}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

const TaskCard = ({
  task,
  assignee,
  canWrite,
  onOpen,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  assignee: string;
  canWrite: boolean;
  onOpen: () => void;
  onMove: (status: TaskStatus) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) => {
  const { t } = useTranslation("tasks");
  const { locale, digitStyle } = useFormatting();
  const done = task.status === "DONE";

  return (
    <li
      draggable={canWrite}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      data-testid="task-card"
      className={cn(
        "group relative rounded-lg border bg-surface p-3 shadow-xs transition-shadow hover:shadow-md",
        canWrite && "cursor-grab active:cursor-grabbing",
        task.isOverdue && "border-l-2 border-l-danger",
      )}
    >
      <div className="flex items-start gap-2">
        <button type="button" onClick={onOpen} className={cn("min-w-0 flex-1 text-left text-sm font-medium after:absolute after:inset-0", done && "text-muted-foreground line-through")}>
          {task.title}
        </button>
        {canWrite ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative z-10 -mt-1 -mr-1 size-7 opacity-60 group-hover:opacity-100" aria-label={t("moveTask", { title: task.title })}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("moveTo")}</DropdownMenuLabel>
              {ALLOWED_MOVES[task.status].map((status) => (
                <DropdownMenuItem key={status} onSelect={() => onMove(status)}>
                  {t(`status_${status}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {task.priority !== "MEDIUM" ? <PriorityBadge priority={task.priority} /> : null}
        {task.dueAt ? (
          <span className={cn("inline-flex items-center gap-1 text-xs", task.isOverdue ? "font-medium text-danger" : "text-muted-foreground")}>
            <CalendarClock className="size-3.5" />
            {formatRelative(task.dueAt, locale, digitStyle)}
          </span>
        ) : null}
        {assignee ? <Avatar name={assignee} className="ml-auto" /> : null}
      </div>
    </li>
  );
};
