import { api } from "@/lib/api";
import type { Permission, RoleKey } from "@/lib/permissions";
import { queryKeys, useApiMutation, useApiQuery } from "@/lib/query";
import type { paths } from "@/api/schema";

type BusinessPath = paths["/api/v1/businesses/{businessId}"];

export type Business = paths["/api/v1/businesses"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type NewBusiness = NonNullable<paths["/api/v1/businesses"]["post"]["requestBody"]>["content"]["application/json"];
export type BusinessChanges = NonNullable<BusinessPath["patch"]["requestBody"]>["content"]["application/json"];
export type BusinessStatus = Business["status"];

// The business settings the screens use. The server keeps more, and fills in defaults for old rows.
export interface BusinessSettings {
  locale: "en" | "bn-BD";
  currencyDisplay: "symbol" | "code";
  numberGrouping: "lakh" | "western";
  weekStart: "saturday" | "sunday" | "monday";
  transactionPrefix: string;
  // Expenses above this (in paisa) need an owner or admin to approve them. null: no limit.
  approvalThresholdMinor: string | null;
  // VAT (11.6): only a registered business charges VAT on invoices and claims it back on bills.
  vatRegistered?: boolean;
  // The rate new invoice lines start with, in basis points: 1500 is 15%.
  defaultVatRateBp?: number;
}

export const BUSINESS_TYPES = ["RETAIL", "SERVICES", "AGENCY", "ECOMMERCE", "MANUFACTURING", "CUSTOM"] as const;

// Which status a business can move to from each status. Mirrors the backend's rule.
export const NEXT_STATUSES: Record<BusinessStatus, BusinessStatus[]> = {
  ACTIVE: ["INACTIVE", "ARCHIVED"],
  INACTIVE: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: ["ACTIVE"],
};

// Archived businesses are included, so they can still be opened and reactivated.
export const useBusinesses = () =>
  useApiQuery(queryKeys.businesses, () => api.GET("/api/v1/businesses", { params: { query: { includeArchived: "true" } } }));

export const useCreateBusiness = () =>
  useApiMutation((body: NewBusiness) => api.POST("/api/v1/businesses", { body }), { invalidates: [queryKeys.businesses] });

// One business, with this person's role and permissions in it.
export const useBusiness = (businessId: string | undefined) =>
  useApiQuery(queryKeys.business(businessId ?? ""), () => api.GET("/api/v1/businesses/{businessId}", { params: { path: { businessId: businessId! } } }), {
    enabled: Boolean(businessId),
  });

// What this person may do in a business. Buttons they can't use are hidden; the server checks again.
export const useAccess = (businessId: string | undefined) => {
  const business = useBusiness(businessId);
  const membership = business.data?.membership;
  const permissions = new Set(membership?.permissions ?? []);
  return {
    isLoading: business.isLoading,
    roleKey: membership?.roleKey as RoleKey | undefined,
    isOwner: membership?.roleKey === "OWNER",
    // Only an active business can change. Inactive and archived ones are read-only, and so is one
    // beyond the plan's business limit after the plan lapsed.
    writable: business.data?.status === "ACTIVE" && !business.data.plan.locked,
    // The plan of the workspace that owns this business.
    plan: business.data?.plan,
    can: (permission: Permission) => permissions.has(permission),
  };
};

export const useUpdateBusiness = (businessId: string) =>
  useApiMutation((body: BusinessChanges) => api.PATCH("/api/v1/businesses/{businessId}", { params: { path: { businessId } }, body }), {
    invalidates: [queryKeys.businesses],
  });

export const useChangeBusinessStatus = (businessId: string) =>
  useApiMutation((status: BusinessStatus) => api.POST("/api/v1/businesses/{businessId}/status", { params: { path: { businessId } }, body: { status } }), {
    invalidates: [queryKeys.businesses],
  });
