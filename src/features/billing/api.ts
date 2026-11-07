import type { paths } from "@/api/schema";
import { api } from "@/lib/api";
import type { Data } from "@/lib/api-types";
import { queryKeys, useApiQuery } from "@/lib/query";

type Get<P extends keyof paths> = paths[P] extends { get: { responses: { 200: infer R } } } ? Data<R> : never;

export type Plan = Get<"/api/v1/billing/plans">[number];
export type MyPlan = Get<"/api/v1/billing/me">;
export type PlanState = MyPlan["state"];

export const usePlans = () => useApiQuery(queryKeys.plans, () => api.GET("/api/v1/billing/plans"), { staleTime: 5 * 60_000 });
export const useMyPlan = () => useApiQuery(queryKeys.myPlan, () => api.GET("/api/v1/billing/me"), { staleTime: 60_000 });

const DAY_MS = 86_400_000;
// Whole days left, rounded up, so "ends tomorrow evening" reads as 1 day, never 0.
export const daysUntil = (iso: string | null | undefined, now: number) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - now) / DAY_MS)) : null);

// The plan's name in the reader's language.
export const planName = (plan: Pick<Plan, "name" | "nameBn">, language: string) => (language.startsWith("bn") && plan.nameBn) || plan.name;
export const planDescription = (plan: Pick<Plan, "description" | "descriptionBn">, language: string) => (language.startsWith("bn") && plan.descriptionBn) || plan.description || "";
