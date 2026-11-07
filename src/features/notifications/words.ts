import { AlertTriangle, Bell, CreditCard, FileDown, FileSpreadsheet, KeyRound, ListChecks, MessageSquare, PiggyBank, Plug, Receipt, Repeat, ShieldAlert, Trophy, UserPlus, type LucideIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useMoney } from "@/features/businesses/useMoney";
import { formatDate, formatDateTime } from "@/lib/dates";
import { useFormatting } from "@/lib/preferences";
import type { Notification } from "./api";

export interface NotificationText {
  title: string;
  body: string;
  icon: LucideIcon;
  // Where opening it goes, or null when there's nowhere useful.
  href: string | null;
  // Problems get a red mark.
  urgent: boolean;
}

const ICONS: Record<string, LucideIcon> = {
  "task.assigned": ListChecks,
  "task.commented": MessageSquare,
  "task.overdue": ListChecks,
  "reminder.due": Bell,
  "transaction.pending_approval": Receipt,
  "budget.threshold": PiggyBank,
  "goal.achieved": Trophy,
  "export.ready": FileDown,
  "export.failed": FileDown,
  "recurring.failed": Repeat,
  "ledger.check_failed": ShieldAlert,
  "audit.check_failed": ShieldAlert,
  "statement_import.finished": FileSpreadsheet,
  "integration.needs_reauth": Plug,
  "integration.sync_failing": Plug,
  invitation: UserPlus,
  "billing.payment_received": CreditCard,
  "billing.plan_ending": CreditCard,
  "billing.plan_ended": CreditCard,
};

const URGENT = new Set(["task.overdue", "export.failed", "recurring.failed", "ledger.check_failed", "audit.check_failed", "integration.needs_reauth", "integration.sync_failing", "auth.account_locked", "auth.session_reuse_detected", "billing.plan_ended"]);

// Where each kind of notification leads inside the app.
const linkFor = (notification: Notification) => {
  const params = notification.params as Record<string, string | undefined>;
  const base = notification.businessId ? `/b/${notification.businessId}` : null;
  if (notification.type === "invitation") return "/";
  if (notification.type.startsWith("auth.")) return "/settings/security";
  if (notification.type === "billing.payment_received" && params.paymentId) return `/settings/plan/receipts/${params.paymentId}`;
  if (notification.type.startsWith("billing.")) return "/settings/plan";
  if (!base) return null;
  switch (notification.type) {
    case "task.assigned":
    case "task.commented":
    case "task.overdue":
      return notification.entityId ? `${base}/tasks?task=${notification.entityId}` : `${base}/tasks`;
    case "reminder.due":
      return `${base}/tasks?tab=reminders`;
    case "transaction.pending_approval":
      return params.transactionId ? `${base}/transactions/${params.transactionId}` : `${base}/transactions`;
    case "budget.threshold":
      return params.budgetId ? `${base}/budgets/${params.budgetId}` : `${base}/budgets`;
    case "goal.achieved":
      return `${base}/goals`;
    case "export.ready":
    case "export.failed":
      return `${base}/reports`;
    case "recurring.failed":
      return params.scheduleId ? `${base}/recurring?schedule=${params.scheduleId}` : `${base}/recurring`;
    case "ledger.check_failed":
      return `${base}/ledger`;
    case "statement_import.finished":
    case "integration.needs_reauth":
    case "integration.sync_failing":
      return `${base}/statements`;
    default:
      return null;
  }
};

// The backend sends only a type and values. This turns them into words in the reader's language.
export const useNotificationText = () => {
  const { t } = useTranslation(["notifications", "errors"]);
  const money = useMoney();
  const { businesses } = useCurrentBusiness();
  const { locale, digitStyle } = useFormatting();

  return useCallback(
    (notification: Notification): NotificationText => {
      const params = notification.params as Record<string, unknown>;
      const key = notification.type.replace(/\./g, "_");
      const values: Record<string, unknown> = { ...params };
      // Budgets don't send a currency: they're always in the business's own.
      const currency = typeof params.currency === "string" ? params.currency : (businesses.find((item) => item.id === notification.businessId)?.baseCurrency ?? "BDT");
      if (typeof params.amountMinor === "string") values.amount = money(params.amountMinor, currency);
      if (typeof params.actualMinor === "string") values.actual = money(params.actualMinor, currency);
      const business = businesses.find((item) => item.id === notification.businessId);
      if (business) values.business = business.name;
      if (typeof params.dueAt === "string") values.dueAt = formatDateTime(params.dueAt, locale, digitStyle);
      if (typeof params.occurrenceAt === "string") values.occurrenceAt = formatDateTime(params.occurrenceAt, locale, digitStyle);
      if (typeof params.occurrenceDate === "string") values.occurrenceDate = formatDate(params.occurrenceDate, locale, digitStyle);
      if (typeof params.errorCode === "string") values.reason = t(`errors:${params.errorCode}`, { defaultValue: t("errors:UNKNOWN") });
      if (typeof params.format === "string") values.format = params.format.toUpperCase();
      if (typeof params.provider === "string") values.provider = params.provider;
      // Plan messages: amounts and days in the reader's own style, and words that depend on the stage.
      if (typeof params.amount === "string") values.amount = money(params.amount, currency);
      for (const day of ["periodEnd", "endsOn", "until"]) if (typeof params[day] === "string") values[day] = formatDate(params[day], locale, digitStyle);
      const stage = typeof params.stage === "string" ? params.stage : "";
      const titleKey =
        notification.type === "billing.plan_ending" ? `${key}_${stage}` : notification.type === "billing.plan_ended" ? `${key}_${stage === "grace" || stage === "trial" ? stage : "other"}` : key;
      const bodyKey = notification.type === "billing.plan_ended" && stage === "grace" ? `${key}_grace` : key;
      return {
        title: t(`notifications:${titleKey}_title`, { ...values, defaultValue: t("notifications:other_title") }),
        body: t(`notifications:${bodyKey}_body`, { ...values, defaultValue: "" }),
        icon: ICONS[notification.type] ?? (notification.type.startsWith("auth.") ? KeyRound : AlertTriangle),
        href: linkFor(notification),
        urgent: URGENT.has(notification.type),
      };
    },
    [t, money, locale, digitStyle, businesses],
  );
};
