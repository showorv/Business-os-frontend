import type { paths } from "@/api/schema";
import { api, unwrap } from "@/lib/api";
import type { Data } from "@/lib/api-types";
import { queryKeys, useAction, useApiMutation, useApiPages, useApiQuery } from "@/lib/query";

type Docs = "/api/v1/businesses/{businessId}/documents";
type Get<P extends keyof paths> = paths[P] extends { get: { responses: { 200: infer R } } } ? Data<R> : never;

export type Document = Get<Docs>[number];
export type SearchHit = Get<`${Docs}/search`>[number];
export const DOCUMENT_TYPES = ["INVOICE", "RECEIPT", "CONTRACT", "POLICY", "NOTE", "STATEMENT"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
// Statements are kept, but not read for search.
export const SEARCHABLE_TYPES = ["INVOICE", "RECEIPT", "CONTRACT", "POLICY", "NOTE"] as const;
export const UPLOAD_TYPES = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WEBP",
  "text/csv": "CSV",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
} as const;
export type UploadMime = keyof typeof UPLOAD_TYPES;
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const path = (businessId: string) => ({ path: { businessId } });
const docPath = (businessId: string, documentId: string) => ({ path: { businessId, documentId } });

// Still being read: the list checks again until each one is searchable or has failed.
export const isReading = (document: Pick<Document, "ingestStatus" | "type">) =>
  document.type !== "STATEMENT" && (document.ingestStatus === "NOT_STARTED" || document.ingestStatus === "PROCESSING");

// Checks again every few seconds while any document on the list is still being read.
export const useDocuments = (businessId: string, type: DocumentType | null) =>
  useApiPages(
    queryKeys.documentItem(businessId, "list", type ?? "all"),
    (cursor) => api.GET("/api/v1/businesses/{businessId}/documents", { params: { ...path(businessId), query: { cursor, limit: 50, ...(type ? { type } : {}) } } }),
    (rows) => (rows.some(isReading) ? 3_000 : false),
  );

export const useDocumentSearch = (businessId: string, q: string) =>
  useApiQuery(
    queryKeys.documentItem(businessId, "search", q),
    () => api.GET("/api/v1/businesses/{businessId}/documents/search", { params: { ...path(businessId), query: { q, limit: 20 } } }),
    { enabled: q.trim().length >= 2, staleTime: 30_000 },
  );

// Ask for an upload address, send the file straight to storage, then let the server check it.
export const useUploadDocument = (businessId: string) =>
  useAction(
    async ({ file, type }: { file: File; type: DocumentType }) => {
      const { document, uploadUrl } = await unwrap(
        api.POST("/api/v1/businesses/{businessId}/documents/uploads", { params: path(businessId), body: { type, fileName: file.name, mime: file.type as UploadMime, sizeBytes: file.size } }),
      );
      const stored = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!stored.ok) throw new Error("UPLOAD_FAILED");
      return unwrap(api.POST("/api/v1/businesses/{businessId}/documents/{documentId}/complete", { params: docPath(businessId, document.id) }));
    },
    { invalidates: [queryKeys.documents(businessId)] },
  );

export const useDeleteDocument = (businessId: string) =>
  useApiMutation((documentId: string) => api.DELETE("/api/v1/businesses/{businessId}/documents/{documentId}", { params: docPath(businessId, documentId) }), {
    invalidates: [queryKeys.documents(businessId)],
  });

export const useReindexDocument = (businessId: string) =>
  useApiMutation((documentId: string) => api.POST("/api/v1/businesses/{businessId}/documents/{documentId}/reindex", { params: docPath(businessId, documentId) }), {
    invalidates: [queryKeys.documents(businessId)],
  });
