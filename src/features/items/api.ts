import { api } from "@/lib/api";
import { queryKeys, useApiMutation, useApiPages, useApiQuery } from "@/lib/query";
import type { paths } from "@/api/schema";
import type { Body, Data } from "@/lib/api-types";

type ItemsPath = paths["/api/v1/businesses/{businessId}/items"];
type ItemPath = paths["/api/v1/businesses/{businessId}/items/{itemId}"];

export type Item = Data<ItemsPath["get"]["responses"][200]>[number];
export type NewItem = Body<ItemsPath["post"]>;
export type ItemChanges = Body<ItemPath["patch"]>;

export interface ItemFilters {
  search?: string;
  includeArchived?: boolean;
}

const path = (businessId: string) => ({ path: { businessId } });

// By name, 50 at a time, with how much was sold and bought.
export const useItems = (businessId: string, filters: ItemFilters = {}) => {
  const query = {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.includeArchived ? { includeArchived: "true" as const } : {}),
  };
  return useApiPages(queryKeys.itemList(businessId, JSON.stringify(query)), (cursor) =>
    api.GET("/api/v1/businesses/{businessId}/items", { params: { ...path(businessId), query: { ...query, limit: 50, cursor } } }),
  );
};

// The active items with a price for this side, for the picker on invoice and bill lines.
export const useItemsFor = (businessId: string, use: "SALE" | "BILL") =>
  useApiQuery(queryKeys.itemList(businessId, `use:${use}`), () =>
    api.GET("/api/v1/businesses/{businessId}/items", { params: { ...path(businessId), query: { limit: 200, use } } }),
  );

export const useCreateItem = (businessId: string) =>
  useApiMutation((body: NewItem) => api.POST("/api/v1/businesses/{businessId}/items", { params: path(businessId), body }), {
    invalidates: [queryKeys.items(businessId)],
  });

export const useUpdateItem = (businessId: string) =>
  useApiMutation(
    ({ itemId, ...body }: ItemChanges & { itemId: string }) =>
      api.PATCH("/api/v1/businesses/{businessId}/items/{itemId}", { params: { path: { businessId, itemId } }, body }),
    { invalidates: [queryKeys.items(businessId)] },
  );
