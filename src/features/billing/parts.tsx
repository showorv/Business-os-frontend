import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatMoney, type DigitStyle } from "@/lib/money";

// "৳599" rather than "৳599.00": plan prices are whole taka.
export const priceText = (minor: string, currency: string, digitStyle: DigitStyle) => {
  return formatMoney(minor, currency, { digitStyle, grouping: "lakh" }).replace(/\.[0০]{2}$/, "");
};

// 500 → "500 MB", 10240 → "10 GB".
export const storageText = (mb: number | null, locale: string, unlimited: string) => {
  if (mb === null) return unlimited;
  return mb >= 1024 ? `${(mb / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} GB` : `${mb.toLocaleString(locale)} MB`;
};

export const bytesText = (bytes: number, locale: string) => {
  const mb = bytes / 1024 / 1024;
  if (mb >= 1024) return `${(mb / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} GB`;
  return `${mb.toLocaleString(locale, { maximumFractionDigits: mb < 10 ? 1 : 0 })} MB`;
};

// Shown wherever something needs Pro: what it is, why, and the way to the Plan page.
export const UpgradePrompt = ({ title, body, className, compact = false }: { title: string; body: string; className?: string; compact?: boolean }) => {
  const { t } = useTranslation("billing");
  return (
    <div className={cn("animate-chart-fade overflow-hidden rounded-xl border bg-surface", compact ? "p-4" : "p-6 sm:p-8", className)} data-testid="upgrade-prompt">
      <div className={cn("flex gap-4", compact ? "items-start" : "flex-col items-center text-center")}>
        <span className={cn("flex shrink-0 items-center justify-center rounded-2xl bg-foreground text-background", compact ? "size-10" : "size-14 shadow-lg")}>
          <Sparkles className={compact ? "size-5" : "size-7"} />
        </span>
        <div className="min-w-0">
          <p className={cn("font-semibold tracking-tight", compact ? "" : "text-xl")}>{title}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
          <Button asChild size={compact ? "sm" : "md"} className={compact ? "mt-3" : "mt-5"}>
            <Link to="/settings/plan">
              {t("seePlans")}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

// A thin bar for "3 of 5": darker as it fills, red once full.
export const UsageMeter = ({ label, used, limit, usedText, limitText }: { label: string; used: number; limit: number | null; usedText: string; limitText: string }) => {
  const share = limit ? Math.min(1, used / limit) : 0;
  const full = limit !== null && used >= limit;
  return (
    <div className="space-y-2" data-testid="usage-meter">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {usedText} <span className="text-muted-foreground">/ {limitText}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={limit ?? used} aria-valuenow={used}>
        <div className={cn("animate-chart-grow h-full rounded-full", full ? "bg-danger" : "bg-foreground")} style={{ width: `${limit === null ? 4 : Math.max(2, share * 100)}%` }} />
      </div>
    </div>
  );
};
