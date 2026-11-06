// The same names the backend uses (src/app/constants/permissions.ts there). The server always checks;
// the app only uses these to hide buttons someone couldn't use anyway.
export const Permission = {
  BUSINESS_MANAGE: "business.manage",
  MEMBERS_MANAGE: "members.manage",
  FINANCE_READ: "finance.read",
  FINANCE_WRITE: "finance.write",
  LEDGER_POST: "ledger.post",
  LEDGER_REVERSE: "ledger.reverse",
  PERIOD_CLOSE: "period.close",
  TRANSACTIONS_APPROVE: "transactions.approve",
  INTEGRATIONS_MANAGE: "integrations.manage",
  TASKS_READ: "tasks.read",
  TASKS_WRITE: "tasks.write",
  DOCUMENTS_READ: "documents.read",
  DOCUMENTS_WRITE: "documents.write",
  AI_USE: "ai.use",
  AUDIT_READ: "audit.read",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ROLE_KEYS = ["OWNER", "ADMIN", "ACCOUNTANT", "MANAGER", "VIEWER"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

// Owners are made from existing members, never invited by email.
export const INVITABLE_ROLES: RoleKey[] = ["ADMIN", "ACCOUNTANT", "MANAGER", "VIEWER"];
