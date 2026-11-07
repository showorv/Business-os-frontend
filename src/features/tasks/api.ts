import type { paths } from "@/api/schema";
import { api } from "@/lib/api";
import type { Body, Data } from "@/lib/api-types";
import { queryKeys, useApiMutation, useApiPages, useApiQuery } from "@/lib/query";

type Business = "/api/v1/businesses/{businessId}";
type Get<P extends keyof paths> = paths[P] extends { get: { responses: { 200: infer R } } } ? Data<R> : never;

export type Task = Get<`${Business}/tasks`>["items"][number];
export type TaskDetail = Get<`${Business}/tasks/{taskId}`>;
export type TaskStatus = Task["status"];
export type TaskPriority = Task["priority"];
export type TaskSummary = Get<`${Business}/tasks/summary`>;
export type TaskComment = Get<`${Business}/tasks/{taskId}/comments`>[number];
export type CalendarItem = Get<`${Business}/tasks/calendar`>[number];
export type NewTask = Body<paths[`${Business}/tasks`]["post"]>;
export type TaskChanges = Body<paths[`${Business}/tasks/{taskId}`]["patch"]>;
export type Reminder = Get<`${Business}/reminders`>["items"][number];
export type NewReminder = Body<paths[`${Business}/reminders`]["post"]>;
export type ReminderChanges = Body<paths[`${Business}/reminders/{reminderId}`]["patch"]>;
export type Channel = Reminder["channels"][number];

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const;
export const BOARD_COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];
export const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const CHANNELS: Channel[] = ["IN_APP", "EMAIL", "PUSH"];

// The same moves the server allows. Done and cancelled tasks can only go back to To do.
export const ALLOWED_MOVES: Record<TaskStatus, TaskStatus[]> = {
  TODO: ["IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"],
  IN_PROGRESS: ["TODO", "BLOCKED", "DONE", "CANCELLED"],
  BLOCKED: ["TODO", "IN_PROGRESS", "CANCELLED"],
  DONE: ["TODO"],
  CANCELLED: ["TODO"],
};
export const canMove = (from: TaskStatus, to: TaskStatus) => from === to || ALLOWED_MOVES[from].includes(to);

const path = (businessId: string) => ({ path: { businessId } });
const taskPath = (businessId: string, taskId: string) => ({ path: { businessId, taskId } });

// A task's due date also makes a reminder, so task changes reload both.
const reloadTasks = (businessId: string) => ({ invalidates: [queryKeys.tasks(businessId)] });

export interface TaskFilters {
  mine?: boolean;
  overdue?: boolean;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export const useTasks = (businessId: string, filters: TaskFilters) =>
  useApiPages(queryKeys.taskItem(businessId, "list", JSON.stringify(filters)), (cursor) =>
    api.GET("/api/v1/businesses/{businessId}/tasks", {
      params: {
        ...path(businessId),
        query: {
          cursor,
          limit: 100,
          ...(filters.mine ? { mine: "true" } : {}),
          ...(filters.overdue ? { overdue: "true" } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.priority ? { priority: filters.priority } : {}),
        },
      },
    }),
  );

export const useTaskSummary = (businessId: string) =>
  useApiQuery(queryKeys.taskItem(businessId, "summary"), () => api.GET("/api/v1/businesses/{businessId}/tasks/summary", { params: path(businessId) }));

export const useCalendar = (businessId: string, from: string, to: string) =>
  useApiQuery(queryKeys.taskItem(businessId, "calendar", `${from}:${to}`), () =>
    api.GET("/api/v1/businesses/{businessId}/tasks/calendar", { params: { ...path(businessId), query: { from, to } } }),
  );

export const useTask = (businessId: string, taskId: string) =>
  useApiQuery(queryKeys.taskItem(businessId, "one", taskId), () => api.GET("/api/v1/businesses/{businessId}/tasks/{taskId}", { params: taskPath(businessId, taskId) }));

export const useCreateTask = (businessId: string) =>
  useApiMutation((body: NewTask) => api.POST("/api/v1/businesses/{businessId}/tasks", { params: path(businessId), body }), reloadTasks(businessId));

export const useUpdateTask = (businessId: string) =>
  useApiMutation(
    ({ taskId, ...body }: TaskChanges & { taskId: string }) => api.PATCH("/api/v1/businesses/{businessId}/tasks/{taskId}", { params: taskPath(businessId, taskId), body }),
    reloadTasks(businessId),
  );

export const useComments = (businessId: string, taskId: string) =>
  useApiQuery(queryKeys.taskItem(businessId, "comments", taskId), () =>
    api.GET("/api/v1/businesses/{businessId}/tasks/{taskId}/comments", { params: taskPath(businessId, taskId) }),
  );

export const useAddComment = (businessId: string, taskId: string) =>
  useApiMutation(
    (text: string) => api.POST("/api/v1/businesses/{businessId}/tasks/{taskId}/comments", { params: taskPath(businessId, taskId), body: { body: text } }),
    { invalidates: [queryKeys.taskItem(businessId, "comments", taskId)] },
  );

// ---- Reminders ----

export const useReminders = (businessId: string, mine: boolean) =>
  useApiPages(queryKeys.taskItem(businessId, "reminders", String(mine)), (cursor) =>
    api.GET("/api/v1/businesses/{businessId}/reminders", { params: { ...path(businessId), query: { cursor, limit: 100, ...(mine ? { mine: "true" } : {}) } } }),
  );

export const useCreateReminder = (businessId: string) =>
  useApiMutation((body: NewReminder) => api.POST("/api/v1/businesses/{businessId}/reminders", { params: path(businessId), body }), reloadTasks(businessId));

export const useUpdateReminder = (businessId: string) =>
  useApiMutation(
    ({ reminderId, ...body }: ReminderChanges & { reminderId: string }) =>
      api.PATCH("/api/v1/businesses/{businessId}/reminders/{reminderId}", { params: { path: { businessId, reminderId } }, body }),
    reloadTasks(businessId),
  );
