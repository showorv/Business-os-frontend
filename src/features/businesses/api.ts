import { api } from "@/lib/api";
import { queryKeys, useApiMutation, useApiQuery } from "@/lib/query";
import type { paths } from "@/api/schema";

export type Business = paths["/api/v1/businesses"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type NewBusiness = NonNullable<paths["/api/v1/businesses"]["post"]["requestBody"]>["content"]["application/json"];

export const BUSINESS_TYPES = ["RETAIL", "SERVICES", "AGENCY", "ECOMMERCE", "MANUFACTURING", "CUSTOM"] as const;

export const useBusinesses = () => useApiQuery(queryKeys.businesses, () => api.GET("/api/v1/businesses"));

export const useCreateBusiness = () =>
  useApiMutation((body: NewBusiness) => api.POST("/api/v1/businesses", { body }), { invalidates: [queryKeys.businesses] });
