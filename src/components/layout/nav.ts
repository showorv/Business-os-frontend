import {
  BookOpen,
  BookUser,
  Bot,
  Building2,
  ChartColumn,
  FileSpreadsheet,
  FileText,
  HandCoins,
  History,
  Landmark,
  LayoutDashboard,
  ListChecks,
  PiggyBank,
  Repeat,
  ScrollText,
  ReceiptText,
  Target,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Permission } from "@/lib/permissions";

export interface NavItem {
  key: string;
  icon: LucideIcon;
  // Path inside the business, or null while the screen isn't built yet.
  path: string | null;
  // The step that brings it, shown as "Coming in step 9.x".
  step?: string;
  // Hidden from people without this permission in the business.
  permission?: Permission;
}

// One list drives the sidebar and the phone menu. A later step fills in its path and drops `step`.
export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", icon: LayoutDashboard, path: "" },
  { key: "transactions", icon: ReceiptText, path: "transactions", permission: Permission.FINANCE_READ },
  { key: "accounts", icon: WalletCards, path: "accounts", permission: Permission.FINANCE_READ },
  { key: "invoices", icon: FileSpreadsheet, path: "invoices", permission: Permission.FINANCE_READ },
  { key: "bills", icon: ScrollText, path: "bills", permission: Permission.FINANCE_READ },
  { key: "dues", icon: HandCoins, path: "dues", permission: Permission.FINANCE_READ },
  { key: "contacts", icon: BookUser, path: "contacts", permission: Permission.FINANCE_READ },
  { key: "reports", icon: ChartColumn, path: "reports", permission: Permission.FINANCE_READ },
  { key: "budgets", icon: PiggyBank, path: "budgets", permission: Permission.FINANCE_READ },
  { key: "goals", icon: Target, path: "goals", permission: Permission.FINANCE_READ },
  { key: "ledger", icon: BookOpen, path: "ledger", permission: Permission.FINANCE_READ },
  { key: "statements", icon: Landmark, path: "statements", permission: Permission.FINANCE_READ },
  { key: "recurring", icon: Repeat, path: "recurring", permission: Permission.FINANCE_READ },
  { key: "tasks", icon: ListChecks, path: "tasks", permission: Permission.TASKS_READ },
  { key: "documents", icon: FileText, path: "documents", permission: Permission.DOCUMENTS_READ },
  { key: "assistant", icon: Bot, path: "assistant", permission: Permission.AI_USE },
  { key: "team", icon: Users, path: "team" },
  { key: "audit", icon: History, path: "audit", permission: Permission.AUDIT_READ },
  { key: "businessSettings", icon: Building2, path: "settings" },
];
