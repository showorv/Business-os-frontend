import { api, newRequestKey, unwrap, withShape } from "@/lib/api";
import { queryKeys, useAction, useApiMutation, useApiPages, useApiQuery } from "@/lib/query";
import type { paths } from "@/api/schema";
import type { Body, Data } from "@/lib/api-types";

type AccountsPath = paths["/api/v1/businesses/{businessId}/accounts"];
type TransactionsPath = paths["/api/v1/businesses/{businessId}/transactions"];
type TransactionPath = paths["/api/v1/businesses/{businessId}/transactions/{transactionId}"];

export type Account = Data<AccountsPath["get"]["responses"][200]>[number];
export type NewAccount = Body<AccountsPath["post"]>;
export type AccountChanges = Body<paths["/api/v1/businesses/{businessId}/accounts/{accountId}"]["patch"]>;
export type Category = Data<paths["/api/v1/businesses/{businessId}/categories"]["get"]["responses"][200]>[number];
export type NewCategory = Body<paths["/api/v1/businesses/{businessId}/categories"]["post"]>;
export type Transaction = Data<TransactionsPath["get"]["responses"][200]>[number];
export type TransactionDetail = Data<TransactionPath["get"]["responses"][200]>;
export type Attachment = TransactionDetail["attachments"][number];
export type NewTransaction = Body<TransactionsPath["post"]>;
export type TransactionChanges = Body<TransactionPath["patch"]>;
export type TransactionFilters = NonNullable<TransactionsPath["get"]["parameters"]["query"]>;

export const ACCOUNT_TYPES = ["CASH", "BANK", "BKASH", "NAGAD", "MFS_OTHER", "CUSTOM"] as const;
export const TRANSACTION_TYPES = ["INCOME", "EXPENSE", "TRANSFER", "REFUND", "ADJUSTMENT"] as const;
export const TRANSACTION_STATUSES = ["DRAFT", "PENDING_APPROVAL", "POSTED", "REJECTED", "VOID"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

// The category type a transaction type must use. Transfers use none; adjustments may use either.
export const CATEGORY_TYPE_FOR: Partial<Record<TransactionType, "INCOME" | "EXPENSE">> = { INCOME: "INCOME", EXPENSE: "EXPENSE", REFUND: "INCOME" };

const path = (businessId: string) => ({ path: { businessId } });
const txnPath = (businessId: string, transactionId: string) => ({ path: { businessId, transactionId } });

// ---- Accounts: cash, bank and mobile wallets ----

// Up to 100 accounts, which is far more than a small business has. Inactive ones are included,
// so old accounts stay readable in past transactions.
export const useAccounts = (businessId: string, enabled = true) =>
  useApiQuery(
    queryKeys.accounts(businessId),
    () => api.GET("/api/v1/businesses/{businessId}/accounts", { params: { ...path(businessId), query: { limit: 100, includeInactive: "true" } } }),
    { enabled },
  );

export const useCreateAccount = (businessId: string) =>
  useApiMutation((body: NewAccount) => api.POST("/api/v1/businesses/{businessId}/accounts", { params: path(businessId), body }), {
    // An opening balance is posted to the books, so the figures move too.
    invalidates: [queryKeys.accounts(businessId), queryKeys.figures(businessId)],
  });

export const useUpdateAccount = (businessId: string) =>
  useApiMutation(
    ({ accountId, ...body }: AccountChanges & { accountId: string }) =>
      api.PATCH("/api/v1/businesses/{businessId}/accounts/{accountId}", { params: { path: { businessId, accountId } }, body }),
    { invalidates: [queryKeys.accounts(businessId)] },
  );

// ---- Categories: what money came in for, or went out on ----

export const useCategories = (businessId: string, enabled = true) =>
  useApiQuery(
    queryKeys.categories(businessId),
    () => api.GET("/api/v1/businesses/{businessId}/categories", { params: { ...path(businessId), query: { limit: 200, includeInactive: "true" } } }),
    { enabled },
  );

export const useCreateCategory = (businessId: string) =>
  useApiMutation((body: NewCategory) => api.POST("/api/v1/businesses/{businessId}/categories", { params: path(businessId), body }), {
    invalidates: [queryKeys.categories(businessId)],
  });

export const useUpdateCategory = (businessId: string) =>
  useApiMutation(
    ({ categoryId, ...body }: { categoryId: string; name?: string; nameBn?: string | null; isActive?: boolean }) =>
      api.PATCH("/api/v1/businesses/{businessId}/categories/{categoryId}", { params: { path: { businessId, categoryId } }, body }),
    { invalidates: [queryKeys.categories(businessId)] },
  );

// ---- Transactions ----

// Newest first, 30 at a time. Filters that are empty are left out of the address.
export const useTransactions = (businessId: string, filters: Omit<TransactionFilters, "limit" | "cursor">) => {
  const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== "")) as TransactionFilters;
  return useApiPages(queryKeys.transactionList(businessId, JSON.stringify(query)), (cursor) =>
    api.GET("/api/v1/businesses/{businessId}/transactions", { params: { ...path(businessId), query: { ...query, limit: 30, cursor } } }),
  );
};

export const useTransaction = (businessId: string, transactionId: string) =>
  useApiQuery(queryKeys.transaction(businessId, transactionId), () =>
    api.GET("/api/v1/businesses/{businessId}/transactions/{transactionId}", { params: txnPath(businessId, transactionId) }),
  );

// A change to one transaction can move balances and every list, so all of them reload.
const reloadMoney = (businessId: string) => ({
  invalidates: [queryKeys.transactions(businessId), queryKeys.accounts(businessId), queryKeys.figures(businessId), queryKeys.ledger(businessId), queryKeys.consolidated(), queryKeys.contacts(businessId)],
});

// `requestKey` stays the same while one form is open, so a double click or a retry creates it once.
export const useCreateTransaction = (businessId: string) =>
  useApiMutation(
    ({ requestKey, ...body }: NewTransaction & { requestKey: string }) =>
      api.POST("/api/v1/businesses/{businessId}/transactions", { params: { ...path(businessId), header: { "idempotency-key": requestKey } }, body }),
    reloadMoney(businessId),
  );

export const useUpdateTransaction = (businessId: string, transactionId: string) =>
  useApiMutation(
    (body: TransactionChanges) => api.PATCH("/api/v1/businesses/{businessId}/transactions/{transactionId}", { params: txnPath(businessId, transactionId), body }),
    reloadMoney(businessId),
  );

// The one-click steps on a transaction. Each is a POST with no body.
type Params = ReturnType<typeof txnPath>;
const STEPS = {
  // A draft goes to the books, or waits for approval if it's an expense above the business's limit.
  post: (params: Params) => api.POST("/api/v1/businesses/{businessId}/transactions/{transactionId}/post", { params }),
  approve: (params: Params) => api.POST("/api/v1/businesses/{businessId}/transactions/{transactionId}/approve", { params }),
  reject: (params: Params) => api.POST("/api/v1/businesses/{businessId}/transactions/{transactionId}/reject", { params }),
  // Only drafts can be voided. A posted transaction is reversed instead.
  void: (params: Params) => api.POST("/api/v1/businesses/{businessId}/transactions/{transactionId}/void", { params }),
  dismissDuplicate: (params: Params) => api.POST("/api/v1/businesses/{businessId}/transactions/{transactionId}/dismiss-duplicate", { params }),
};
export type TransactionStep = keyof typeof STEPS;

export const useTransactionStep = (businessId: string) =>
  useApiMutation(
    ({ transactionId, step }: { transactionId: string; step: TransactionStep }) => withShape<unknown>(STEPS[step](txnPath(businessId, transactionId))),
    reloadMoney(businessId),
  );

// Undoes a posted transaction with an opposite journal. The original stays in the history.
export const useReverseTransaction = (businessId: string) =>
  useApiMutation(
    ({ transactionId, memo }: { transactionId: string; memo?: string }) =>
      api.POST("/api/v1/businesses/{businessId}/transactions/{transactionId}/reverse", { params: txnPath(businessId, transactionId), body: memo ? { memo } : {} }),
    reloadMoney(businessId),
  );

// ---- Attachments: receipts and invoices on a transaction ----

export const ATTACHMENT_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

// Three steps: ask for an upload address, send the file straight to storage, then tell the server it's
// there (it checks the file really is what it says). Then the document is attached to the transaction.
export const useAttachFile = (businessId: string, transactionId: string) =>
  useAction(
    async (file: File) => {
      const { document, uploadUrl } = await unwrap(
        api.POST("/api/v1/businesses/{businessId}/documents/uploads", {
          params: path(businessId),
          body: { type: file.type === "application/pdf" ? "INVOICE" : "RECEIPT", fileName: file.name, mime: file.type as "application/pdf", sizeBytes: file.size },
        }),
      );
      const stored = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!stored.ok) throw new Error("UPLOAD_FAILED");
      await unwrap(api.POST("/api/v1/businesses/{businessId}/documents/{documentId}/complete", { params: { path: { businessId, documentId: document.id } } }));
      await unwrap(
        api.POST("/api/v1/businesses/{businessId}/transactions/{transactionId}/attachments", { params: txnPath(businessId, transactionId), body: { documentId: document.id } }),
      );
    },
    { invalidates: [queryKeys.transaction(businessId, transactionId)] },
  );

export const useDetachFile = (businessId: string, transactionId: string) =>
  useApiMutation(
    (documentId: string) =>
      api.DELETE("/api/v1/businesses/{businessId}/transactions/{transactionId}/attachments/{documentId}", { params: { path: { businessId, transactionId, documentId } } }),
    { invalidates: [queryKeys.transaction(businessId, transactionId)] },
  );

// A short-lived link to download a file. Opened straight away, so it never sits in the page.
export const openDocument = async (businessId: string, documentId: string) => {
  const { url } = await unwrap(api.GET("/api/v1/businesses/{businessId}/documents/{documentId}/download", { params: { path: { businessId, documentId } } }));
  window.location.assign(url);
};

export { newRequestKey };
