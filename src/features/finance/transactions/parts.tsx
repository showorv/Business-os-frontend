import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { TransactionStatus, TransactionType } from "../api";

// Black and white only: each status differs by fill and line, never by colour.
const STATUS_STYLE: Record<TransactionStatus, string> = {
  DRAFT: "border border-dashed border-foreground/40 bg-transparent text-foreground",
  PENDING_APPROVAL: "bg-foreground text-background",
  POSTED: "border bg-surface text-foreground",
  REJECTED: "bg-muted text-muted-foreground line-through",
  VOID: "bg-muted text-muted-foreground line-through",
};

export const StatusBadge = ({ status, className }: { status: string; className?: string }) => {
  const { t } = useTranslation("finance");
  return <Badge className={cn(STATUS_STYLE[status as TransactionStatus], className)}>{t(`status_${status}`)}</Badge>;
};

// Money in shows "+", money out shows "−". Transfers and adjustments move money without a direction here.
export const amountSign = (type: string) => (type === "INCOME" ? "+" : type === "EXPENSE" || type === "REFUND" ? "−" : "");

export const isTransactionType = (value: string | null): value is TransactionType =>
  value === "INCOME" || value === "EXPENSE" || value === "TRANSFER" || value === "REFUND" || value === "ADJUSTMENT";
