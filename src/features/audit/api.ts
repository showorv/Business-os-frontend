import type { paths } from "@/api/schema";
import { api } from "@/lib/api";
import type { Data } from "@/lib/api-types";
import { queryKeys, useApiPages } from "@/lib/query";

type Get<P extends keyof paths> = paths[P] extends { get: { responses: { 200: infer R } } } ? Data<R> : never;
export type AuditEntry = Get<"/api/v1/businesses/{businessId}/audit">["items"][number];

export const useBusinessAudit = (businessId: string, filters: { actorUserId: string | null; action: string | null }) =>
  useApiPages(queryKeys.audit(businessId, JSON.stringify(filters)), (cursor) =>
    api.GET("/api/v1/businesses/{businessId}/audit", {
      params: { path: { businessId }, query: { cursor, limit: 50, ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}), ...(filters.action ? { action: filters.action } : {}) } },
    }),
  );

export const useMyAudit = () => useApiPages(queryKeys.myAudit(), (cursor) => api.GET("/api/v1/audit/me", { params: { query: { cursor, limit: 50 } } }));

// The actions people can filter by, grouped the way the app is laid out.
export const ACTION_GROUPS: { key: string; actions: string[] }[] = [
  { key: "money", actions: ["transaction.created", "transaction.updated", "transaction.submitted", "transaction.posted", "transaction.rejected", "transaction.voided", "transaction.reversed", "intercompany.transferred"] },
  { key: "books", actions: ["journal.posted", "journal.reversed", "reconciliation.started", "reconciliation.closed", "period.status_changed", "fiscal_year.created", "fiscal_year.closed"] },
  { key: "planning", actions: ["budget.created", "budget.updated", "budget.line_set", "goal.created", "goal.updated", "recurring_schedule.created", "recurring_schedule.updated"] },
  { key: "work", actions: ["task.created", "task.updated", "task.assigned", "task.comment_added", "reminder.created", "reminder.updated"] },
  { key: "files", actions: ["document.uploaded", "document.deleted", "document.reindex_requested", "statement_import.requested", "report.export_requested"] },
  { key: "people", actions: ["invitation.created", "invitation.accepted", "invitation.revoked", "member.updated", "member.removed", "permission.denied"] },
  { key: "setup", actions: ["business.updated", "business.status_changed", "account.created", "account.updated", "category.created", "category.updated", "exchange_rate.saved", "ai.proposal_confirmed"] },
];

// Where a changed thing lives in the app, when it has a page of its own.
export const entityLink = (businessId: string | null, entry: Pick<AuditEntry, "entityType" | "entityId">) => {
  if (!businessId || !entry.entityId) return null;
  const base = `/b/${businessId}`;
  switch (entry.entityType) {
    case "transaction":
      return `${base}/transactions/${entry.entityId}`;
    case "task":
      return `${base}/tasks?task=${entry.entityId}`;
    case "budget":
      return `${base}/budgets/${entry.entityId}`;
    case "journal_entry":
      return `${base}/ledger/journals/${entry.entityId}`;
    case "reconciliation":
      return `${base}/ledger/reconcile/${entry.entityId}`;
    case "recurring_schedule":
      return `${base}/recurring?schedule=${entry.entityId}`;
    case "goal":
      return `${base}/goals`;
    case "document":
      return `${base}/documents`;
    case "financial_account":
    case "category":
      return `${base}/accounts`;
    case "statement_import":
    case "statement_line":
    case "statement_rule":
    case "statement_template":
      return `${base}/statements`;
    case "business_member":
    case "invitation":
      return `${base}/team`;
    default:
      return null;
  }
};
