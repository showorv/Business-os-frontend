import { ChevronRight, ListChecks } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { PRIORITIES, TASK_STATUSES, useTasks, type TaskFilters, type TaskPriority, type TaskStatus } from "./api";
import { Avatar, PriorityBadge, useMemberNames } from "./parts";

// Every task as rows, including cancelled ones, with status and priority filters.
export const TaskList = ({ businessId, filters, onOpen }: { businessId: string; filters: TaskFilters; onOpen: (taskId: string) => void }) => {
  const { t } = useTranslation("tasks");
  const { locale, digitStyle } = useFormatting();
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const tasks = useTasks(businessId, { ...filters, ...(status ? { status } : {}), ...(priority ? { priority } : {}) });
  const { nameOf } = useMemberNames(businessId);
  const list = tasks.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select aria-label={t("status")} value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | "")} className="w-auto">
          <option value="">{t("anyStatus")}</option>
          {TASK_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`status_${value}`)}
            </option>
          ))}
        </Select>
        <Select aria-label={t("priority")} value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority | "")} className="w-auto">
          <option value="">{t("anyPriority")}</option>
          {PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {t(`priority_${value}`)}
            </option>
          ))}
        </Select>
      </div>
      {tasks.isError ? <Alert tone="danger">{errorMessage(tasks.error)}</Alert> : null}
      {tasks.isLoading ? <Spinner className="mt-12" /> : null}
      {tasks.isSuccess && list.length === 0 ? (
        <Card>
          <EmptyState icon={ListChecks} title={t("noneInView")} body={t("noneInViewHint")} />
        </Card>
      ) : null}
      {list.length > 0 ? (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {list.map((task) => (
              <li key={task.id} className="group relative flex items-center gap-3 px-4 py-3 hover:bg-muted/50 sm:px-5">
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => onOpen(task.id)} className={cn("block max-w-full truncate text-left font-medium after:absolute after:inset-0", (task.status === "DONE" || task.status === "CANCELLED") && "text-muted-foreground line-through")}>
                    {task.title}
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge className={cn(task.status === "BLOCKED" && "bg-danger-soft text-danger")}>{t(`status_${task.status}`)}</Badge>
                    <PriorityBadge priority={task.priority} />
                    {task.dueAt ? <span className={cn(task.isOverdue && "font-medium text-danger")}>{t("dueOn", { when: formatDateTime(task.dueAt, locale, digitStyle) })}</span> : null}
                  </div>
                </div>
                {task.assigneeId ? (
                  <span className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
                    <Avatar name={nameOf(task.assigneeId)} />
                    <span className="max-w-32 truncate">{nameOf(task.assigneeId)}</span>
                  </span>
                ) : null}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </li>
            ))}
          </ul>
          {tasks.hasNextPage ? (
            <div className="border-t p-3 text-center">
              <Button variant="ghost" onClick={() => void tasks.fetchNextPage()}>
                {t("loadMore")}
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
};
