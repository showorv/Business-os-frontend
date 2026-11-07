import { api, ApiError } from "@/lib/api";
import { queryKeys, useAction, useApiMutation, useApiPages, useApiQuery } from "@/lib/query";
import type { paths } from "@/api/schema";
import type { Body, Data } from "@/lib/api-types";

type InvoicesPath = paths["/api/v1/businesses/{businessId}/invoices"];
type InvoicePath = paths["/api/v1/businesses/{businessId}/invoices/{invoiceId}"];

export type InvoiceKind = "SALE" | "BILL";
export type InvoiceSummary = Data<InvoicesPath["get"]["responses"][200]>[number];
export type Invoice = Data<InvoicePath["get"]["responses"][200]>;
export type InvoiceStatus = Invoice["status"];
export type NewInvoice = Body<InvoicesPath["post"]>;
export type InvoiceChanges = Body<InvoicePath["patch"]>;
export type InvoiceLineInput = NewInvoice["lines"][number];
export type NewPayment = Body<paths["/api/v1/businesses/{businessId}/invoices/{invoiceId}/payments"]["post"]>;
export type Aging = Data<paths["/api/v1/businesses/{businessId}/invoices/aging"]["get"]["responses"][200]>;
export const AGING_BUCKETS = ["current", "days1to30", "days31to60", "days61to90", "over90"] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

export interface InvoiceFilters {
  status?: InvoiceStatus;
  overdue?: boolean;
  contactId?: string;
  search?: string;
}

const path = (businessId: string) => ({ path: { businessId } });
const invoicePath = (businessId: string, invoiceId: string) => ({ path: { businessId, invoiceId } });

// An invoice or bill moves money, so everything worked out from the books reloads too.
const reloadAll = (businessId: string) => ({
  invalidates: [
    queryKeys.invoices(businessId),
    queryKeys.contacts(businessId),
    queryKeys.accounts(businessId),
    queryKeys.figures(businessId),
    queryKeys.ledger(businessId),
    queryKeys.consolidated(),
  ],
});

// Newest first, 30 at a time.
export const useInvoices = (businessId: string, kind: InvoiceKind, filters: InvoiceFilters = {}) => {
  const query = {
    kind,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.overdue ? { overdue: "true" as const } : {}),
    ...(filters.contactId ? { contactId: filters.contactId } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  };
  return useApiPages(queryKeys.invoiceItem(businessId, "list", JSON.stringify(query)), (cursor) =>
    api.GET("/api/v1/businesses/{businessId}/invoices", { params: { ...path(businessId), query: { ...query, limit: 30, cursor } } }),
  );
};

export const useInvoice = (businessId: string, invoiceId: string) =>
  useApiQuery(queryKeys.invoiceItem(businessId, "one", invoiceId), () =>
    api.GET("/api/v1/businesses/{businessId}/invoices/{invoiceId}", { params: invoicePath(businessId, invoiceId) }),
  );

// Baki: what is still owed, per contact, by how long past due.
export const useAging = (businessId: string, kind: InvoiceKind, contactId?: string, enabled = true) =>
  useApiQuery(
    queryKeys.invoiceItem(businessId, "aging", `${kind}:${contactId ?? ""}`),
    () => api.GET("/api/v1/businesses/{businessId}/invoices/aging", { params: { ...path(businessId), query: { kind, ...(contactId ? { contactId } : {}) } } }),
    { enabled },
  );

export const useCreateInvoice = (businessId: string) =>
  useApiMutation((body: NewInvoice) => api.POST("/api/v1/businesses/{businessId}/invoices", { params: path(businessId), body }), reloadAll(businessId));

export const useUpdateInvoice = (businessId: string, invoiceId: string) =>
  useApiMutation(
    (body: InvoiceChanges) => api.PATCH("/api/v1/businesses/{businessId}/invoices/{invoiceId}", { params: invoicePath(businessId, invoiceId), body }),
    reloadAll(businessId),
  );

export const useDeleteInvoice = (businessId: string, invoiceId: string) =>
  useAction(async () => {
    const { error, response } = await api.DELETE("/api/v1/businesses/{businessId}/invoices/{invoiceId}", { params: invoicePath(businessId, invoiceId) });
    if (!response.ok) {
      const body = (error ?? {}) as { error?: { code?: string; params?: Record<string, unknown> } };
      throw new ApiError(response.status, body.error?.code ?? "NETWORK_ERROR", body.error?.params);
    }
  }, reloadAll(businessId));

export const useIssueInvoice = (businessId: string, invoiceId: string) =>
  useApiMutation(() => api.POST("/api/v1/businesses/{businessId}/invoices/{invoiceId}/issue", { params: invoicePath(businessId, invoiceId) }), reloadAll(businessId));

export const useVoidInvoice = (businessId: string, invoiceId: string) =>
  useApiMutation(
    (reason: string) => api.POST("/api/v1/businesses/{businessId}/invoices/{invoiceId}/void", { params: invoicePath(businessId, invoiceId), body: { reason } }),
    reloadAll(businessId),
  );

export const useRecordPayment = (businessId: string, invoiceId: string) =>
  useApiMutation(
    (body: NewPayment) => api.POST("/api/v1/businesses/{businessId}/invoices/{invoiceId}/payments", { params: invoicePath(businessId, invoiceId), body }),
    reloadAll(businessId),
  );

export const useVoidPayment = (businessId: string, invoiceId: string) =>
  useApiMutation(
    (paymentId: string) =>
      api.POST("/api/v1/businesses/{businessId}/invoices/{invoiceId}/payments/{paymentId}/void", { params: { path: { businessId, invoiceId, paymentId } } }),
    reloadAll(businessId),
  );

export const useEmailInvoice = (businessId: string, invoiceId: string) =>
  useApiMutation(
    (body: { to?: string; message?: string }) =>
      api.POST("/api/v1/businesses/{businessId}/invoices/{invoiceId}/email", { params: invoicePath(businessId, invoiceId), body }),
    { invalidates: [queryKeys.invoices(businessId)] },
  );

// Fetches the PDF with the signed-in session and hands it to the browser as a download.
export const useDownloadInvoicePdf = (businessId: string, invoiceId: string) =>
  useAction(async ({ locale, fileName }: { locale: "en" | "bn-BD"; fileName: string }) => {
    const { data, response } = await api.GET("/api/v1/businesses/{businessId}/invoices/{invoiceId}/pdf", {
      params: { ...invoicePath(businessId, invoiceId), query: { locale } },
      parseAs: "blob",
    });
    if (!response.ok || !data) throw new ApiError(response.status, "DOWNLOAD_FAILED");
    const url = URL.createObjectURL(data as Blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
