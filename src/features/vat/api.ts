import { api } from "@/lib/api";
import { queryKeys, useApiQuery } from "@/lib/query";
import type { paths } from "@/api/schema";
import type { Data } from "@/lib/api-types";

export type VatSummary = Data<paths["/api/v1/businesses/{businessId}/vat/summary"]["get"]["responses"][200]>;

// VAT for a period, from issued invoices and bills. It reloads with them.
export const useVatSummary = (businessId: string, from: string, to: string) =>
  useApiQuery(queryKeys.invoiceItem(businessId, "vat", `${from}:${to}`), () =>
    api.GET("/api/v1/businesses/{businessId}/vat/summary", { params: { path: { businessId }, query: { from, to } } }),
  );
