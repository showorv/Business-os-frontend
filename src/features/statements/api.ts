import type { paths } from "@/api/schema";
import { api, unwrap } from "@/lib/api";
import type { Body, Data } from "@/lib/api-types";
import { queryKeys, useAction, useApiMutation, useApiPages, useApiQuery } from "@/lib/query";

type Business = "/api/v1/businesses/{businessId}";
type Get<P extends keyof paths> = paths[P] extends { get: { responses: { 200: infer R } } } ? Data<R> : never;
type Post<P extends keyof paths> = paths[P] extends { post: { responses: infer R } } ? (R extends { 200: infer O } ? Data<O> : R extends { 201: infer C } ? Data<C> : R extends { 202: infer A } ? Data<A> : never) : never;

export type StatementLine = Get<`${Business}/statement-lines`>["items"][number];
export type StatementLineDetail = Get<`${Business}/statement-lines/{lineId}`>;
export type Suggestion = StatementLineDetail["suggestions"][number];
export type LineStatus = StatementLine["status"];
export type LineSummary = Get<`${Business}/statement-lines/summary`>;
export type StatementImport = Get<`${Business}/statement-imports/{importId}`>;
export type Preview = Post<`${Business}/statement-imports/preview`>;
export type Template = Get<`${Business}/statement-templates`>[number];
export type Rule = Get<`${Business}/statement-rules`>[number];
export type NewRule = Body<paths[`${Business}/statement-rules`]["post"]>;
export type RuleChanges = Body<paths[`${Business}/statement-rules/{ruleId}`]["patch"]>;
export type Mapping = NonNullable<Body<paths[`${Business}/statement-imports/preview`]["post"]>["mapping"]>;
export type DateFormat = Mapping["dateFormat"];
export type MappingField = Exclude<keyof Mapping, "headerRow" | "dateFormat">;

export const LINE_STATUSES = ["UNMATCHED", "AWAITING_POSTING", "MATCHED", "IGNORED"] as const;
export const DATE_FORMATS: DateFormat[] = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD-MM-YYYY", "DD-MMM-YYYY", "DD.MM.YYYY", "YYYY/MM/DD", "DD MMM YYYY"];
export const STATEMENT_TYPES: Record<string, string> = { csv: "text/csv", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
export const MAX_STATEMENT_BYTES = 10 * 1024 * 1024;

const path = (businessId: string) => ({ path: { businessId } });
const linePath = (businessId: string, lineId: string) => ({ path: { businessId, lineId } });

// Settling a line can create transactions, which move balances, reports and the books.
const reloadAll = (businessId: string) => ({
  invalidates: [
    queryKeys.statements(businessId),
    queryKeys.transactions(businessId),
    queryKeys.accounts(businessId),
    queryKeys.figures(businessId),
    queryKeys.ledger(businessId),
    queryKeys.consolidated(),
  ],
});
const reloadStatements = (businessId: string) => ({ invalidates: [queryKeys.statements(businessId)] });

// ---- The review inbox ----

export interface LineFilters {
  status?: LineStatus;
  financialAccountId?: string;
  importId?: string;
}

export const useStatementLines = (businessId: string, filters: LineFilters) =>
  useApiPages(queryKeys.statementItem(businessId, "lines", JSON.stringify(filters)), (cursor) =>
    api.GET("/api/v1/businesses/{businessId}/statement-lines", { params: { ...path(businessId), query: { ...filters, cursor, limit: 50 } } }),
  );

export const useLineSummary = (businessId: string, financialAccountId?: string) =>
  useApiQuery(queryKeys.statementItem(businessId, "summary", financialAccountId ?? ""), () =>
    api.GET("/api/v1/businesses/{businessId}/statement-lines/summary", { params: { ...path(businessId), query: financialAccountId ? { financialAccountId } : {} } }),
  );

export const useStatementLine = (businessId: string, lineId: string) =>
  useApiQuery(queryKeys.statementItem(businessId, "line", lineId), () =>
    api.GET("/api/v1/businesses/{businessId}/statement-lines/{lineId}", { params: linePath(businessId, lineId) }),
  );

export const useRunMatcher = (businessId: string) =>
  useApiMutation(
    (financialAccountId: string | undefined) =>
      api.POST("/api/v1/businesses/{businessId}/statement-lines/run-matcher", { params: path(businessId), body: financialAccountId ? { financialAccountId } : {} }),
    reloadAll(businessId),
  );

export const useMatchLine = (businessId: string) =>
  useApiMutation(
    ({ lineId, journalLineIds }: { lineId: string; journalLineIds: string[] }) =>
      api.POST("/api/v1/businesses/{businessId}/statement-lines/{lineId}/match", { params: linePath(businessId, lineId), body: { journalLineIds } }),
    reloadAll(businessId),
  );

export const useCategorizeLine = (businessId: string) =>
  useApiMutation(
    ({ lineId, ...body }: Body<paths[`${Business}/statement-lines/{lineId}/categorize`]["post"]> & { lineId: string }) =>
      api.POST("/api/v1/businesses/{businessId}/statement-lines/{lineId}/categorize", { params: linePath(businessId, lineId), body }),
    reloadAll(businessId),
  );

export const useSplitLine = (businessId: string) =>
  useApiMutation(
    ({ lineId, ...body }: Body<paths[`${Business}/statement-lines/{lineId}/split`]["post"]> & { lineId: string }) =>
      api.POST("/api/v1/businesses/{businessId}/statement-lines/{lineId}/split", { params: linePath(businessId, lineId), body }),
    reloadAll(businessId),
  );

// Unmatch, ignore and restore take only the line.
export const useLineStep = (businessId: string) =>
  useApiMutation(
    ({ lineId, step }: { lineId: string; step: "unmatch" | "ignore" | "restore" }) =>
      api.POST(`/api/v1/businesses/{businessId}/statement-lines/{lineId}/${step}`, { params: linePath(businessId, lineId) }),
    reloadAll(businessId),
  );

// ---- Imports ----

export const useImports = (businessId: string) =>
  useApiQuery(
    queryKeys.statementItem(businessId, "imports"),
    () => api.GET("/api/v1/businesses/{businessId}/statement-imports", { params: { ...path(businessId), query: { limit: 50 } } }),
    // While a file is still being read, check every two seconds; the inbox counts reload with it.
    { refetchInterval: (query) => (query.state.data?.items.some((item) => item.status === "QUEUED" || item.status === "RUNNING") ? 2000 : false) },
  );

// The file goes straight to storage through a short-lived link, then the server checks it.
export const useUploadStatement = (businessId: string) =>
  useAction(async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mime = STATEMENT_TYPES[extension] ?? file.type;
    const { document, uploadUrl } = await unwrap(
      api.POST("/api/v1/businesses/{businessId}/documents/uploads", {
        params: path(businessId),
        body: { type: "STATEMENT", fileName: file.name, mime: mime as "text/csv", sizeBytes: file.size },
      }),
    );
    const stored = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": mime } });
    if (!stored.ok) throw new Error("UPLOAD_FAILED");
    await unwrap(api.POST("/api/v1/businesses/{businessId}/documents/{documentId}/complete", { params: { path: { businessId, documentId: document.id } } }));
    return document.id;
  });

export const usePreview = (businessId: string) =>
  useApiMutation((body: Body<paths[`${Business}/statement-imports/preview`]["post"]>) =>
    api.POST("/api/v1/businesses/{businessId}/statement-imports/preview", { params: path(businessId), body }),
  );

export const useStartImport = (businessId: string) =>
  useApiMutation(
    (body: Body<paths[`${Business}/statement-imports`]["post"]>) => api.POST("/api/v1/businesses/{businessId}/statement-imports", { params: path(businessId), body }),
    reloadStatements(businessId),
  );

// ---- Saved file formats ----

export const useTemplates = (businessId: string) =>
  useApiQuery(queryKeys.statementItem(businessId, "templates"), () => api.GET("/api/v1/businesses/{businessId}/statement-templates", { params: path(businessId) }));

export const useCreateTemplate = (businessId: string) =>
  useApiMutation(
    (body: { name: string; mapping: Mapping }) => api.POST("/api/v1/businesses/{businessId}/statement-templates", { params: path(businessId), body }),
    reloadStatements(businessId),
  );

export const useRenameTemplate = (businessId: string) =>
  useApiMutation(
    ({ templateId, name }: { templateId: string; name: string }) =>
      api.PATCH("/api/v1/businesses/{businessId}/statement-templates/{templateId}", { params: { path: { businessId, templateId } }, body: { name } }),
    reloadStatements(businessId),
  );

export const useDeleteTemplate = (businessId: string) =>
  useApiMutation(
    (templateId: string) => api.DELETE("/api/v1/businesses/{businessId}/statement-templates/{templateId}", { params: { path: { businessId, templateId } } }),
    reloadStatements(businessId),
  );

// ---- Rules ----

export const useRules = (businessId: string) =>
  useApiQuery(queryKeys.statementItem(businessId, "rules"), () => api.GET("/api/v1/businesses/{businessId}/statement-rules", { params: path(businessId) }));

export const useCreateRule = (businessId: string) =>
  useApiMutation((body: NewRule) => api.POST("/api/v1/businesses/{businessId}/statement-rules", { params: path(businessId), body }), reloadStatements(businessId));

export const useUpdateRule = (businessId: string) =>
  useApiMutation(
    ({ ruleId, ...body }: RuleChanges & { ruleId: string }) =>
      api.PATCH("/api/v1/businesses/{businessId}/statement-rules/{ruleId}", { params: { path: { businessId, ruleId } }, body }),
    reloadStatements(businessId),
  );

export const useDeleteRule = (businessId: string) =>
  useApiMutation(
    (ruleId: string) => api.DELETE("/api/v1/businesses/{businessId}/statement-rules/{ruleId}", { params: { path: { businessId, ruleId } } }),
    reloadStatements(businessId),
  );
