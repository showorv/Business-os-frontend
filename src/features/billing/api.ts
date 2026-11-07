import type { paths } from "@/api/schema";
import { api } from "@/lib/api";
import type { Data } from "@/lib/api-types";
import { queryKeys, useApiMutation, useApiQuery } from "@/lib/query";

type Get<P extends keyof paths> = paths[P] extends { get: { responses: { 200: infer R } } } ? Data<R> : never;

export type Plan = Get<"/api/v1/billing/plans">[number];
export type MyPlan = Get<"/api/v1/billing/me">;
export type PlanState = MyPlan["state"];
export type Payment = Get<"/api/v1/billing/payments/{paymentId}">;
export type BillingCycle = Payment["billingCycle"];
export type PayMethod = "bkash" | "nagad" | "card";

export const usePlans = () => useApiQuery(queryKeys.plans, () => api.GET("/api/v1/billing/plans"), { staleTime: 5 * 60_000 });
export const useMyPlan = () => useApiQuery(queryKeys.myPlan, () => api.GET("/api/v1/billing/me"), { staleTime: 60_000 });
export const usePayments = () => useApiQuery(queryKeys.payments, () => api.GET("/api/v1/billing/payments"));
export const usePayment = (paymentId: string) =>
  useApiQuery(queryKeys.payment(paymentId), () => api.GET("/api/v1/billing/payments/{paymentId}", { params: { path: { paymentId } } }));

// Starts paying: the server sets the price and says where the payment page is.
export const useCheckout = () =>
  useApiMutation((body: { planKey: string; billingCycle: BillingCycle }) => api.POST("/api/v1/billing/checkout", { body }));

// The demo payment page's answer. Paying changes the plan, which can unlock businesses.
export const useDemoAnswer = (paymentId: string) =>
  useApiMutation(
    (body: { outcome: "PAID" | "FAILED" | "CANCELLED"; method?: PayMethod }) =>
      api.POST("/api/v1/billing/payments/{paymentId}/demo", { params: { path: { paymentId } }, body }),
    { invalidates: [queryKeys.plans, queryKeys.businesses] },
  );

const DAY_MS = 86_400_000;
// Whole days left, rounded up, so "ends tomorrow evening" reads as 1 day, never 0.
export const daysUntil = (iso: string | null | undefined, now: number) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - now) / DAY_MS)) : null);

// The calendar day in Bangladesh for a moment, as plans and receipts show it.
export const dhakaDay = (iso: string) => new Date(new Date(iso).getTime() + 6 * 3_600_000).toISOString().slice(0, 10);

// The plan's name in the reader's language.
export const planName = (plan: Pick<Plan, "name" | "nameBn">, language: string) => (language.startsWith("bn") && plan.nameBn) || plan.name;
export const planDescription = (plan: Pick<Plan, "description" | "descriptionBn">, language: string) => (language.startsWith("bn") && plan.descriptionBn) || plan.description || "";
export const paymentPlanName = (payment: Pick<Payment, "planName" | "planNameBn">, language: string) => (language.startsWith("bn") && payment.planNameBn) || payment.planName;
