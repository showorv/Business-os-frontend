import {
  BookOpen,
  Bot,
  Building2,
  ChartColumn,
  FileText,
  House,
  Landmark,
  LayoutDashboard,
  ListChecks,
  ReceiptText,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  key: string;
  icon: LucideIcon;
  // Path inside the business, or null while the screen isn't built yet.
  path: string | null;
  // The step that brings it, shown as "Coming in step 9.x".
  step?: string;
}

// One list drives the sidebar and the phone menu. A later step fills in its path and drops `step`.
export const NAV_ITEMS: NavItem[] = [
  { key: "overview", icon: House, path: "" },
  { key: "dashboard", icon: LayoutDashboard, path: null, step: "9.4" },
  { key: "transactions", icon: ReceiptText, path: null, step: "9.3" },
  { key: "accounts", icon: WalletCards, path: null, step: "9.3" },
  { key: "reports", icon: ChartColumn, path: null, step: "9.4" },
  { key: "ledger", icon: BookOpen, path: null, step: "9.5" },
  { key: "statements", icon: Landmark, path: null, step: "9.6" },
  { key: "tasks", icon: ListChecks, path: null, step: "9.7" },
  { key: "documents", icon: FileText, path: null, step: "9.8" },
  { key: "assistant", icon: Bot, path: null, step: "9.8" },
  { key: "team", icon: Users, path: "team" },
  { key: "businessSettings", icon: Building2, path: "settings" },
];
