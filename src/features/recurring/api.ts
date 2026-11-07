import type { paths } from "@/api/schema";
import { api } from "@/lib/api";
import type { Body, Data } from "@/lib/api-types";
import { queryKeys, useApiMutation, useApiPages, useApiQuery } from "@/lib/query";

type Business = "/api/v1/businesses/{businessId}";
type Get<P extends keyof paths> = paths[P] extends { get: { responses: { 200: infer R } } } ? Data<R> : never;

export type Schedule = Get<`${Business}/recurring-schedules`>["items"][number];
export type ScheduleDetail = Get<`${Business}/recurring-schedules/{scheduleId}`>;
export type ScheduleRun = ScheduleDetail["runs"][number];
export type NewSchedule = Body<paths[`${Business}/recurring-schedules`]["post"]>;
export type ScheduleChanges = Body<paths[`${Business}/recurring-schedules/{scheduleId}`]["patch"]>;

const path = (businessId: string) => ({ path: { businessId } });
const schedulePath = (businessId: string, scheduleId: string) => ({ path: { businessId, scheduleId } });

// Running one makes transactions, which move balances and reports; its reminders show in tasks.
const reloadAll = (businessId: string) => ({
  invalidates: [queryKeys.schedules(businessId), queryKeys.transactions(businessId), queryKeys.accounts(businessId), queryKeys.figures(businessId), queryKeys.ledger(businessId), queryKeys.tasks(businessId)],
});

export const useSchedules = (businessId: string) =>
  useApiPages(queryKeys.scheduleItem(businessId, "list"), (cursor) =>
    api.GET("/api/v1/businesses/{businessId}/recurring-schedules", { params: { ...path(businessId), query: { cursor, limit: 100 } } }),
  );

export const useSchedule = (businessId: string, scheduleId: string) =>
  useApiQuery(queryKeys.scheduleItem(businessId, "one", scheduleId), () =>
    api.GET("/api/v1/businesses/{businessId}/recurring-schedules/{scheduleId}", { params: schedulePath(businessId, scheduleId) }),
  );

export const useCreateSchedule = (businessId: string) =>
  useApiMutation((body: NewSchedule) => api.POST("/api/v1/businesses/{businessId}/recurring-schedules", { params: path(businessId), body }), reloadAll(businessId));

export const useUpdateSchedule = (businessId: string) =>
  useApiMutation(
    ({ scheduleId, ...body }: ScheduleChanges & { scheduleId: string }) =>
      api.PATCH("/api/v1/businesses/{businessId}/recurring-schedules/{scheduleId}", { params: schedulePath(businessId, scheduleId), body }),
    reloadAll(businessId),
  );

export const useRunSchedule = (businessId: string) =>
  useApiMutation(
    (scheduleId: string) => api.POST("/api/v1/businesses/{businessId}/recurring-schedules/{scheduleId}/run", { params: schedulePath(businessId, scheduleId) }),
    reloadAll(businessId),
  );
