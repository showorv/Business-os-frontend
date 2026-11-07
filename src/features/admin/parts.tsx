import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatCount } from "@/lib/numbers";
import { formatMoney } from "@/lib/money";
import { useFormatting } from "@/lib/preferences";
import { dhakaDay, type PlanState } from "@/features/billing/api";

// Money and dates the way the admin reads them: whole taka where it's whole, Bangladesh dates.
export const useAdminFormat = () => {
  const { locale, digitStyle } = useFormatting();
  return {
    money: (minor: string, currency = "BDT") => formatMoney(minor, currency, { digitStyle, grouping: "lakh" }).replace(/\.[0০]{2}$/, ""),
    day: (iso: string | null | undefined) => (iso ? formatDate(dhakaDay(iso), locale, digitStyle) : "—"),
    dateTime: (iso: string) => formatDateTime(iso, locale, digitStyle),
    count: (value: number) => formatCount(value, locale, digitStyle),
  };
};

export const PageTitle = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
    {action}
  </div>
);

export const StatTile = ({ label, value, note, testId }: { label: string; value: string; note?: string; testId?: string }) => (
  <div className="rounded-xl border bg-surface p-5" data-testid={testId}>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
  </div>
);

// Grace and expired stand out; the rest are quiet outlines, in black and white.
export const StateBadge = ({ state }: { state: PlanState }) => {
  const { t } = useTranslation("admin");
  return (
    <Badge className={cn("border bg-transparent", (state === "grace" || state === "expired") && "border-danger/40 text-danger", state === "active" && "border-foreground")}>
      {t(`state_${state}`)}
    </Badge>
  );
};

export const Pager = ({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (page: number) => void }) => {
  const { t } = useTranslation("admin");
  if (pages <= 1) return <p className="mt-3 text-sm text-muted-foreground">{t("total", { count: total })}</p>;
  return (
    <div className="mt-3 flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{t("pageOf", { page, pages, count: total })}</span>
      <div className="flex gap-1">
        <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("previous")}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={t("next")}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
};

// A plain table that scrolls sideways on a phone rather than squashing.
export const Table = ({ head, children, testId }: { head: ReactNode[]; children: ReactNode; testId?: string }) => (
  <div className="overflow-x-auto rounded-xl border bg-surface" data-testid={testId}>
    <table className="w-full min-w-[640px] text-sm">
      <thead className="border-b text-left text-xs text-muted-foreground">
        <tr>
          {head.map((cell, index) => (
            <th key={index} className="px-4 py-2.5 font-medium">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">{children}</tbody>
    </table>
  </div>
);

export const Cell = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
