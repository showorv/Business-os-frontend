import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { LineStatus } from "./api";

// Money in points into the account, money out points away. Both stay in greys; the sign carries the meaning.
export const DirectionIcon = ({ direction, className }: { direction: "IN" | "OUT"; className?: string }) => {
  const Icon = direction === "IN" ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full",
        direction === "IN" ? "bg-foreground text-background" : "border bg-surface text-foreground",
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
};

// To review is the loud one; settled lines are quiet.
export const StatusBadge = ({ status, className }: { status: LineStatus; className?: string }) => {
  const { t } = useTranslation("statements");
  return (
    <Badge
      className={cn(
        status === "UNMATCHED" && "bg-foreground text-background",
        status === "AWAITING_POSTING" && "border border-dashed border-foreground/40 bg-transparent text-foreground",
        status === "IGNORED" && "bg-transparent line-through",
        className,
      )}
    >
      {t(`status_${status}`)}
    </Badge>
  );
};

// A signed amount: "+৳1,200.00" for money in, "−৳300.00" for money out.
export const signed = (direction: "IN" | "OUT", text: string) => `${direction === "IN" ? "+" : "−"}${text}`;

// An on/off switch, for things like a rule being active.
export const Toggle = ({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50",
      checked ? "border-foreground bg-foreground" : "bg-muted",
    )}
  >
    <span className={cn("inline-block size-3.5 rounded-full shadow-xs transition-transform", checked ? "translate-x-[18px] bg-background" : "translate-x-0.5 bg-muted-foreground")} />
  </button>
);
