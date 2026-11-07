import type { paths } from "@/api/schema";
import { api } from "@/lib/api";
import type { Data } from "@/lib/api-types";
import { queryKeys, useApiMutation, useApiQuery } from "@/lib/query";

type Get<P extends keyof paths> = paths[P] extends { get: { responses: { 200: infer R } } } ? Data<R> : never;
type Body<P extends keyof paths, M extends "post" | "patch"> = paths[P] extends Record<M, { requestBody?: { content: { "application/json": infer B } } }> ? B : never;

export type Overview = Get<"/api/v1/admin/overview">;
export type WorkspacePage = Get<"/api/v1/admin/workspaces">;
export type WorkspaceRow = WorkspacePage["items"][number];
export type WorkspaceDetail = Get<"/api/v1/admin/workspaces/{workspaceId}">;
export type UserRow = Get<"/api/v1/admin/users">["items"][number];
export type AdminPlan = Get<"/api/v1/admin/plans">[number];
export type Coupon = Get<"/api/v1/admin/coupons">[number];
export type AdminPayment = Get<"/api/v1/admin/payments">["items"][number];
export type Settings = Get<"/api/v1/admin/settings">;
export type ActivityRow = Get<"/api/v1/admin/activity">["items"][number];
export type SubscriptionBody = Body<"/api/v1/admin/workspaces/{workspaceId}/subscription", "post">;
export type PlanBody = Body<"/api/v1/admin/plans", "post">;
export type CouponBody = Body<"/api/v1/admin/coupons", "post">;
export type SettingsBody = Body<"/api/v1/admin/settings", "patch">;

const key = queryKeys.adminItem;
// Every admin change can move counts, states and prices, so each one reloads the panel and the plans.
const after = { invalidates: [queryKeys.admin, queryKeys.plans, queryKeys.announcement] };

export const useOverview = () => useApiQuery(key("overview"), () => api.GET("/api/v1/admin/overview"));

export const useWorkspaces = (query: { search?: string; state?: WorkspaceRow["state"]; suspended?: "true"; page: number }) =>
  useApiQuery(key("workspaces", JSON.stringify(query)), () => api.GET("/api/v1/admin/workspaces", { params: { query: { ...query, pageSize: 25 } } }));

export const useWorkspace = (workspaceId: string) =>
  useApiQuery(key("workspace", workspaceId), () => api.GET("/api/v1/admin/workspaces/{workspaceId}", { params: { path: { workspaceId } } }));

export const useSetSubscription = (workspaceId: string) =>
  useApiMutation((body: SubscriptionBody) => api.POST("/api/v1/admin/workspaces/{workspaceId}/subscription", { params: { path: { workspaceId } }, body }), after);

export const useSuspend = (workspaceId: string) =>
  useApiMutation((reason: string | null) =>
    reason === null
      ? api.POST("/api/v1/admin/workspaces/{workspaceId}/unsuspend", { params: { path: { workspaceId } } })
      : api.POST("/api/v1/admin/workspaces/{workspaceId}/suspend", { params: { path: { workspaceId } }, body: { reason } }),
  after);

export const useUsers = (query: { search?: string; page: number }) =>
  useApiQuery(key("users", JSON.stringify(query)), () => api.GET("/api/v1/admin/users", { params: { query: { ...query, pageSize: 25 } } }));

export const useAdminPlans = () => useApiQuery(key("plans"), () => api.GET("/api/v1/admin/plans"));
export const useCreatePlan = () => useApiMutation((body: PlanBody) => api.POST("/api/v1/admin/plans", { body }), after);
export const useUpdatePlan = () =>
  useApiMutation(({ planKey, body }: { planKey: string; body: Partial<Omit<PlanBody, "key">> }) => api.PATCH("/api/v1/admin/plans/{planKey}", { params: { path: { planKey } }, body }), after);

export const useCoupons = () => useApiQuery(key("coupons"), () => api.GET("/api/v1/admin/coupons"));
export const useCreateCoupon = () => useApiMutation((body: CouponBody) => api.POST("/api/v1/admin/coupons", { body }), after);
export const useUpdateCoupon = () =>
  useApiMutation(
    ({ couponId, body }: { couponId: string; body: Body<"/api/v1/admin/coupons/{couponId}", "patch"> }) => api.PATCH("/api/v1/admin/coupons/{couponId}", { params: { path: { couponId } }, body }),
    after,
  );

export const useAdminPayments = (query: { status?: AdminPayment["status"]; search?: string; page: number }) =>
  useApiQuery(key("payments", JSON.stringify(query)), () => api.GET("/api/v1/admin/payments", { params: { query: { ...query, pageSize: 25 } } }));

export const useSettings = () => useApiQuery(key("settings"), () => api.GET("/api/v1/admin/settings"));
export const useUpdateSettings = () => useApiMutation((body: SettingsBody) => api.PATCH("/api/v1/admin/settings", { body }), after);

export const useActivity = (page: number) => useApiQuery(key("activity", String(page)), () => api.GET("/api/v1/admin/activity", { params: { query: { page, pageSize: 25 } } }));

// The message at the top of the app, for everyone.
export const useAnnouncement = () => useApiQuery(queryKeys.announcement, () => api.GET("/api/v1/platform/announcement"), { staleTime: 5 * 60_000 });
