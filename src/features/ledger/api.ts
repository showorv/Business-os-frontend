import type { paths } from "@/api/schema";
import { api } from "@/lib/api";
import type { Body, Data } from "@/lib/api-types";
import { queryKeys, useApiMutation, useApiPages, useApiQuery } from "@/lib/query";

type Business = "/api/v1/businesses/{businessId}";
type Get<P extends keyof paths> = paths[P] extends { get: { responses: { 200: infer R } } } ? Data<R> : never;

export type LedgerAccount = Get<`${Business}/ledger-accounts`>[number];
export type LedgerType = LedgerAccount["type"];
export type NewLedgerAccount = Body<paths[`${Business}/ledger-accounts`]["post"]>;
export type LedgerAccountChanges = Body<paths[`${Business}/ledger-accounts/{ledgerAccountId}`]["patch"]>;
export type JournalSummary = Get<`${Business}/journals`>[number];
export type Journal = Get<`${Business}/journals/{journalId}`>;
export type JournalKind = JournalSummary["kind"];
export type NewJournal = Body<paths[`${Business}/journals`]["post"]>;
export type FiscalPeriod = Get<`${Business}/fiscal-periods`>[number];
export type PeriodStatus = FiscalPeriod["status"];
export type ReconciliationSummary = Get<`${Business}/reconciliations`>[number];
export type Reconciliation = Get<`${Business}/reconciliations/{reconciliationId}`>;
export type ReconciliationLine = Reconciliation["unmatchedLines"][number];
export type NewReconciliation = Body<paths[`${Business}/reconciliations`]["post"]>;

export const LEDGER_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;
export const JOURNAL_KINDS = ["STANDARD", "ADJUSTING", "REVERSAL", "OPENING", "CLOSING"] as const;

const path = (businessId: string) => ({ path: { businessId } });

// Posting to the books moves balances, reports and the ledger itself.
const reloadBooks = (businessId: string) => ({
  invalidates: [queryKeys.ledger(businessId), queryKeys.accounts(businessId), queryKeys.figures(businessId), queryKeys.consolidated()],
});

// ---- Chart of accounts ----

export const useLedgerAccounts = (businessId: string, includeInactive = true) =>
  useApiQuery(queryKeys.ledgerItem(businessId, "accounts", String(includeInactive)), () =>
    api.GET("/api/v1/businesses/{businessId}/ledger-accounts", { params: { ...path(businessId), query: { includeInactive: String(includeInactive) } } }),
  );

export const useCreateLedgerAccount = (businessId: string) =>
  useApiMutation((body: NewLedgerAccount) => api.POST("/api/v1/businesses/{businessId}/ledger-accounts", { params: path(businessId), body }), {
    invalidates: [queryKeys.ledger(businessId)],
  });

export const useUpdateLedgerAccount = (businessId: string) =>
  useApiMutation(
    ({ ledgerAccountId, ...body }: LedgerAccountChanges & { ledgerAccountId: string }) =>
      api.PATCH("/api/v1/businesses/{businessId}/ledger-accounts/{ledgerAccountId}", { params: { path: { businessId, ledgerAccountId } }, body }),
    // Names show up in reports too.
    { invalidates: [queryKeys.ledger(businessId), queryKeys.figures(businessId)] },
  );

// ---- Journals ----

export interface JournalFilters {
  kind?: JournalKind;
  ledgerAccountId?: string;
  from?: string;
  to?: string;
}

export const useJournals = (businessId: string, filters: JournalFilters) =>
  useApiPages(queryKeys.ledgerItem(businessId, "journals", JSON.stringify(filters)), (cursor) =>
    api.GET("/api/v1/businesses/{businessId}/journals", { params: { ...path(businessId), query: { ...filters, limit: 30, cursor } } }),
  );

export const useJournal = (businessId: string, journalId: string) =>
  useApiQuery(queryKeys.ledgerItem(businessId, "journal", journalId), () =>
    api.GET("/api/v1/businesses/{businessId}/journals/{journalId}", { params: { path: { businessId, journalId } } }),
  );

// `requestKey` stays the same while the form is open, so a double click or a retry posts once.
export const useCreateJournal = (businessId: string) =>
  useApiMutation(
    ({ requestKey, ...body }: NewJournal & { requestKey: string }) =>
      api.POST("/api/v1/businesses/{businessId}/journals", { params: { ...path(businessId), header: { "idempotency-key": requestKey } }, body }),
    reloadBooks(businessId),
  );

export const useReverseJournal = (businessId: string) =>
  useApiMutation(
    ({ journalId, ...body }: { journalId: string; entryDate?: string; memo?: string }) =>
      api.POST("/api/v1/businesses/{businessId}/journals/{journalId}/reverse", { params: { path: { businessId, journalId } }, body }),
    reloadBooks(businessId),
  );

// ---- Months (fiscal periods) ----

export const usePeriods = (businessId: string) =>
  useApiQuery(queryKeys.ledgerItem(businessId, "periods"), () => api.GET("/api/v1/businesses/{businessId}/fiscal-periods", { params: { ...path(businessId), query: {} } }));

export const useOpenYear = (businessId: string) =>
  useApiMutation((fiscalYear: number) => api.POST("/api/v1/businesses/{businessId}/fiscal-periods/years", { params: path(businessId), body: { fiscalYear } }), {
    invalidates: [queryKeys.ledger(businessId)],
  });

// Closing needs recent two-step verification when it's on; callers wrap these in useStepUpRetry.
export const useChangePeriodStatus = (businessId: string) =>
  useApiMutation(
    ({ periodId, status }: { periodId: string; status: PeriodStatus }) =>
      api.POST("/api/v1/businesses/{businessId}/fiscal-periods/{periodId}/status", { params: { path: { businessId, periodId } }, body: { status } }),
    { invalidates: [queryKeys.ledger(businessId)] },
  );

export const useCloseYear = (businessId: string) =>
  useApiMutation(
    (fiscalYear: number) => api.POST("/api/v1/businesses/{businessId}/fiscal-periods/years/{fiscalYear}/close", { params: { path: { businessId, fiscalYear } } }),
    reloadBooks(businessId),
  );

// ---- Reconciliation ----

export const useReconciliations = (businessId: string) =>
  useApiQuery(queryKeys.ledgerItem(businessId, "reconciliations"), () =>
    api.GET("/api/v1/businesses/{businessId}/reconciliations", { params: { ...path(businessId), query: {} } }),
  );

export const useReconciliation = (businessId: string, reconciliationId: string) =>
  useApiQuery(queryKeys.ledgerItem(businessId, "reconciliation", reconciliationId), () =>
    api.GET("/api/v1/businesses/{businessId}/reconciliations/{reconciliationId}", { params: { path: { businessId, reconciliationId } } }),
  );

export const useStartReconciliation = (businessId: string) =>
  useApiMutation((body: NewReconciliation) => api.POST("/api/v1/businesses/{businessId}/reconciliations", { params: path(businessId), body }), {
    invalidates: [queryKeys.ledgerItem(businessId, "reconciliations")],
  });

const reconciliationPath = (businessId: string, reconciliationId: string) => ({ path: { businessId, reconciliationId } });

export const useMatchLines = (businessId: string, reconciliationId: string) =>
  useApiMutation(
    (journalLineIds: string[]) =>
      api.POST("/api/v1/businesses/{businessId}/reconciliations/{reconciliationId}/lines", { params: reconciliationPath(businessId, reconciliationId), body: { journalLineIds } }),
    { invalidates: [queryKeys.ledgerItem(businessId, "reconciliation", reconciliationId)] },
  );

export const useUnmatchLine = (businessId: string, reconciliationId: string) =>
  useApiMutation(
    (journalLineId: string) =>
      api.DELETE("/api/v1/businesses/{businessId}/reconciliations/{reconciliationId}/lines/{journalLineId}", {
        params: { path: { businessId, reconciliationId, journalLineId } },
      }),
    { invalidates: [queryKeys.ledgerItem(businessId, "reconciliation", reconciliationId)] },
  );

export const useCloseReconciliation = (businessId: string, reconciliationId: string) =>
  useApiMutation(
    (adjust: boolean) =>
      api.POST("/api/v1/businesses/{businessId}/reconciliations/{reconciliationId}/close", { params: reconciliationPath(businessId, reconciliationId), body: { adjust } }),
    // An adjustment is a posting, so balances and reports move too.
    reloadBooks(businessId),
  );
