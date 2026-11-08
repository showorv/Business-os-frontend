import type { paths } from "@/api/schema";
import { api, unwrap } from "@/lib/api";
import type { Body, Data } from "@/lib/api-types";
import { queryKeys, useAction, useApiMutation, useApiQuery } from "@/lib/query";

type Business = "/api/v1/businesses/{businessId}";
type Get<P extends keyof paths> = paths[P] extends { get: { responses: { 200: infer R } } } ? Data<R> : never;

export type Dashboard = Get<`${Business}/analytics/dashboard`>;
export type Comparison = Get<`${Business}/analytics/compare`>;
export type ProfitAndLoss = Get<`${Business}/reports/profit-and-loss`>;
export type BalanceSheet = Get<`${Business}/reports/balance-sheet`>;
export type CashFlow = Get<`${Business}/reports/cash-flow`>;
export type TrialBalance = Get<`${Business}/reports/trial-balance`>;
export type ReportLine = ProfitAndLoss["revenue"]["items"][number];
export type BudgetSummary = Get<`${Business}/budgets`>[number];
export type Budget = Get<`${Business}/budgets/{budgetId}`>;
export type BudgetLine = Budget["lines"][number];
export type NewBudget = Body<paths[`${Business}/budgets`]["post"]>;
export type Goal = Get<`${Business}/goals`>[number];
export type NewGoal = Body<paths[`${Business}/goals`]["post"]>;
export type GoalChanges = Body<paths[`${Business}/goals/{goalId}`]["patch"]>;
export type ReportExport = Get<`${Business}/report-exports`>[number];
export type NewExport = Body<paths[`${Business}/report-exports`]["post"]>;
export type Consolidated = Get<"/api/v1/consolidated/dashboard">;

export interface MonthRange {
  fromMonth: string;
  toMonth: string;
}
export interface DateRange {
  from: string;
  to: string;
}

const path = (businessId: string) => ({ path: { businessId } });

// ---- Dashboard ----

export const useDashboard = (businessId: string, range: MonthRange, enabled = true) =>
  useApiQuery(
    queryKeys.figure(businessId, "dashboard", `${range.fromMonth}:${range.toMonth}`),
    () => api.GET("/api/v1/businesses/{businessId}/analytics/dashboard", { params: { ...path(businessId), query: range } }),
    // The previous answer stays on screen while a new period loads, so nothing jumps.
    { enabled, placeholderData: (previous) => previous },
  );

// ---- Reports ----

export const useProfitAndLoss = (businessId: string, range: DateRange) =>
  useApiQuery(queryKeys.figure(businessId, "pnl", `${range.from}:${range.to}`), () => api.GET("/api/v1/businesses/{businessId}/reports/profit-and-loss", { params: { ...path(businessId), query: range } }), {
    placeholderData: (previous) => previous,
  });

export const useBalanceSheet = (businessId: string, asOf: string) =>
  useApiQuery(queryKeys.figure(businessId, "balance", asOf), () => api.GET("/api/v1/businesses/{businessId}/reports/balance-sheet", { params: { ...path(businessId), query: { asOf } } }), {
    placeholderData: (previous) => previous,
  });

export const useCashFlow = (businessId: string, range: DateRange) =>
  useApiQuery(queryKeys.figure(businessId, "cash", `${range.from}:${range.to}`), () => api.GET("/api/v1/businesses/{businessId}/reports/cash-flow", { params: { ...path(businessId), query: range } }), {
    placeholderData: (previous) => previous,
  });

export const useTrialBalance = (businessId: string, asOf: string) =>
  useApiQuery(queryKeys.figure(businessId, "trial", asOf), () => api.GET("/api/v1/businesses/{businessId}/reports/trial-balance", { params: { ...path(businessId), query: { asOf } } }), {
    placeholderData: (previous) => previous,
  });

// ---- Exports: PDF, Excel and CSV files made by the worker ----

// Checks every two seconds while a file is still being made, then stops.
export const useExports = (businessId: string) =>
  useApiQuery(queryKeys.exports(businessId), () => api.GET("/api/v1/businesses/{businessId}/report-exports", { params: { ...path(businessId), query: { limit: 10 } } }), {
    refetchInterval: (query) => (query.state.data?.some((item) => item.status === "QUEUED" || item.status === "RUNNING") ? 2000 : false),
  });

export const useCreateExport = (businessId: string) =>
  useApiMutation((body: NewExport) => api.POST("/api/v1/businesses/{businessId}/report-exports", { params: path(businessId), body }), {
    invalidates: [queryKeys.exports(businessId)],
  });

// Everything the business holds, as one Excel workbook. Owners and admins only.
export const useRequestDataExport = (businessId: string) =>
  useApiMutation(() => api.POST("/api/v1/businesses/{businessId}/report-exports/data", { params: path(businessId) }), {
    invalidates: [queryKeys.exports(businessId)],
  });

// The link lasts five minutes, so it's asked for at the moment of the click.
export const useDownloadExport = (businessId: string) =>
  useAction(async (exportId: string) => {
    const { url } = await unwrap(api.GET("/api/v1/businesses/{businessId}/report-exports/{exportId}/download", { params: { path: { businessId, exportId } } }));
    window.location.assign(url);
  });

// ---- Budgets ----

export const useBudgets = (businessId: string, includeArchived = false) =>
  useApiQuery(queryKeys.figure(businessId, "budgets", String(includeArchived)), () =>
    api.GET("/api/v1/businesses/{businessId}/budgets", { params: { ...path(businessId), query: { includeArchived: includeArchived ? "true" : "false" } } }),
  );

export const useBudget = (businessId: string, budgetId: string, enabled = true) =>
  useApiQuery(queryKeys.figure(businessId, "budget", budgetId), () => api.GET("/api/v1/businesses/{businessId}/budgets/{budgetId}", { params: { path: { businessId, budgetId } } }), { enabled });

export const useCreateBudget = (businessId: string) =>
  useApiMutation((body: NewBudget) => api.POST("/api/v1/businesses/{businessId}/budgets", { params: path(businessId), body }), {
    invalidates: [queryKeys.figures(businessId)],
  });

export const useUpdateBudget = (businessId: string, budgetId: string) =>
  useApiMutation((body: { name?: string; status?: "ACTIVE" | "ARCHIVED" }) => api.PATCH("/api/v1/businesses/{businessId}/budgets/{budgetId}", { params: { path: { businessId, budgetId } }, body }), {
    invalidates: [queryKeys.figures(businessId)],
  });

export const useSetBudgetLine = (businessId: string, budgetId: string) =>
  useApiMutation(
    (body: { categoryId: string; amountMinor: string; alertPercent: number }) => api.POST("/api/v1/businesses/{businessId}/budgets/{budgetId}/lines", { params: { path: { businessId, budgetId } }, body }),
    { invalidates: [queryKeys.figures(businessId)] },
  );

// ---- Goals ----

export const useGoals = (businessId: string) =>
  useApiQuery(queryKeys.figure(businessId, "goals"), () => api.GET("/api/v1/businesses/{businessId}/goals", { params: { ...path(businessId), query: {} } }));

export const useCreateGoal = (businessId: string) =>
  useApiMutation((body: NewGoal) => api.POST("/api/v1/businesses/{businessId}/goals", { params: path(businessId), body }), { invalidates: [queryKeys.figures(businessId)] });

export const useUpdateGoal = (businessId: string) =>
  useApiMutation(
    ({ goalId, ...body }: GoalChanges & { goalId: string }) => api.PATCH("/api/v1/businesses/{businessId}/goals/{goalId}", { params: { path: { businessId, goalId } }, body }),
    { invalidates: [queryKeys.figures(businessId)] },
  );

// ---- All businesses ----

export const useConsolidated = (range: MonthRange, reportingCurrency?: string) =>
  useApiQuery(
    queryKeys.consolidated(`${range.fromMonth}:${range.toMonth}:${reportingCurrency ?? ""}`),
    () => api.GET("/api/v1/consolidated/dashboard", { params: { query: { ...range, ...(reportingCurrency ? { reportingCurrency } : {}) } } }),
    { placeholderData: (previous) => previous },
  );
