import { api } from "@/lib/api";
import { queryKeys, useApiMutation, useApiPages, useApiQuery } from "@/lib/query";
import type { paths } from "@/api/schema";
import type { Body, Data } from "@/lib/api-types";

type ContactsPath = paths["/api/v1/businesses/{businessId}/contacts"];
type ContactPath = paths["/api/v1/businesses/{businessId}/contacts/{contactId}"];

export type Contact = Data<ContactsPath["get"]["responses"][200]>[number];
export type ContactKind = Contact["kind"];
export type NewContact = Body<ContactsPath["post"]>;
export type ContactChanges = Body<ContactPath["patch"]>;
export const CONTACT_KINDS = ["CUSTOMER", "SUPPLIER", "BOTH"] as const;

export interface ContactFilters {
  kind?: "CUSTOMER" | "SUPPLIER";
  search?: string;
  includeArchived?: boolean;
}

const path = (businessId: string) => ({ path: { businessId } });

// By name, 50 at a time, with what was received from and paid to each.
export const useContacts = (businessId: string, filters: ContactFilters = {}) => {
  const query = {
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.includeArchived ? { includeArchived: "true" as const } : {}),
  };
  return useApiPages(queryKeys.contactList(businessId, JSON.stringify(query)), (cursor) =>
    api.GET("/api/v1/businesses/{businessId}/contacts", { params: { ...path(businessId), query: { ...query, limit: 50, cursor } } }),
  );
};

// Everyone, archived too, for pickers and for naming the contact on old transactions.
export const useAllContacts = (businessId: string, enabled = true) =>
  useApiQuery(
    queryKeys.contactList(businessId, "all"),
    () => api.GET("/api/v1/businesses/{businessId}/contacts", { params: { ...path(businessId), query: { limit: 200, includeArchived: "true" } } }),
    { enabled },
  );

export const useContact = (businessId: string, contactId: string) =>
  useApiQuery(queryKeys.contact(businessId, contactId), () =>
    api.GET("/api/v1/businesses/{businessId}/contacts/{contactId}", { params: { path: { businessId, contactId } } }),
  );

export const useCreateContact = (businessId: string) =>
  useApiMutation((body: NewContact) => api.POST("/api/v1/businesses/{businessId}/contacts", { params: path(businessId), body }), {
    invalidates: [queryKeys.contacts(businessId)],
  });

export const useUpdateContact = (businessId: string) =>
  useApiMutation(
    ({ contactId, ...body }: ContactChanges & { contactId: string }) =>
      api.PATCH("/api/v1/businesses/{businessId}/contacts/{contactId}", { params: { path: { businessId, contactId } }, body }),
    { invalidates: [queryKeys.contacts(businessId)] },
  );

// Names the customer or supplier on a transaction, posted ones too. Totals on the contacts move with it.
export const useSetTransactionContact = (businessId: string, transactionId: string) =>
  useApiMutation(
    (contactId: string | null) =>
      api.POST("/api/v1/businesses/{businessId}/transactions/{transactionId}/contact", { params: { path: { businessId, transactionId } }, body: { contactId } }),
    { invalidates: [queryKeys.transactions(businessId), queryKeys.contacts(businessId)] },
  );
