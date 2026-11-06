import { ArrowDownRight, ArrowUpRight, ChartLine, Minus, Table2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Sparkline } from "@/components/charts/Figures";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/numbers";
import { useFormatting } from "@/lib/preferences";

// How a figure moved against the previous period. Up isn't always good (expenses), so `goodWhenUp`
// says which way is good: the good direction gets the filled pill, the bad one an outline.
export const Delta = ({ value, goodWhenUp = true, className }: { value: number | null; goodWhenUp?: boolean; className?: string }) => {
  const { t } = useTranslation("analytics");
  const { locale, digitStyle } = useFormatting();
  if (value === null) return <span className={cn("text-xs text-muted-foreground", className)}>{t("noComparison")}</span>;
  const flat = Math.abs(value) < 0.0005;
  const up = value > 0;
  const good = flat ? null : up === goodWhenUp;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        good === true && "bg-foreground text-background",
        good === false && "border border-foreground/30 text-foreground",
        good === null && "bg-muted text-muted-foreground",
        className,
      )}
      title={t(good === false ? "changeWorse" : good ? "changeBetter" : "changeFlat")}
    >
      <Icon className="size-3.5" aria-hidden />
      {formatPercent(Math.abs(value), locale, digitStyle)}
      <span className="sr-only">{t(up ? "up" : "down")}</span>
    </span>
  );
};

interface StatTileProps {
  label: string;
  value: string;
  delta?: ReactNode;
  footnote?: ReactNode;
  trend?: number[];
  icon?: ReactNode;
}

// A labelled number, how it moved, and its shape over the period.
export const StatTile = ({ label, value, delta, footnote, trend, icon }: StatTileProps) => (
  <Card className="flex flex-col gap-3 p-5 transition-shadow hover:shadow-md">
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {icon ? <span className="text-muted-foreground [&_svg]:size-4">{icon}</span> : null}
    </div>
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-2xl font-semibold tracking-tight" data-testid={`stat-${label}`}>
        {value}
      </span>
      {delta}
    </div>
    {trend && trend.length > 1 ? <Sparkline values={trend} height={36} /> : null}
    {footnote ? <p className="mt-auto text-xs text-muted-foreground">{footnote}</p> : null}
  </Card>
);

interface ChartCardProps {
  title: string;
  description?: string;
  legend?: ReactNode;
  action?: ReactNode;
  // When given, a Chart | Table switch appears and the table replaces the chart on demand.
  table?: ReactNode;
  children: ReactNode;
  className?: string;
  // While a new period loads, the old chart stays, faded, so nothing jumps.
  stale?: boolean;
}

export const ChartCard = ({ title, description, legend, action, table, children, className, stale }: ChartCardProps) => {
  const { t } = useTranslation("analytics");
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Card className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {table ? (
            <div role="radiogroup" aria-label={t("view")} className="inline-flex rounded-md border bg-muted p-0.5">
              {(["chart", "table"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={view === option}
                  aria-label={t(option === "chart" ? "showChart" : "showTable")}
                  onClick={() => setView(option)}
                  className={cn("rounded px-2 py-1 transition-colors", view === option ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
                >
                  {option === "chart" ? <ChartLine className="size-4" /> : <Table2 className="size-4" />}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {legend && view === "chart" ? <div className="px-5 pb-2">{legend}</div> : null}
      <div className={cn("min-w-0 flex-1 px-5 pb-5 transition-opacity", stale && "opacity-50")}>{view === "table" && table ? table : children}</div>
    </Card>
  );
};

// A plain table for a chart's numbers: the same figures, readable without hovering or seeing the chart.
export const FigureTable = ({ head, rows }: { head: string[]; rows: ReactNode[][] }) => (
  <div className="-mx-1 max-h-80 overflow-auto">
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-surface">
        <tr className="border-b text-left text-muted-foreground">
          {head.map((cell, index) => (
            <th key={cell} className={cn("px-1 py-2 font-medium", index > 0 && "text-right")}>
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, index) => (
              <td key={index} className={cn("px-1 py-2", index > 0 && "text-right tabular-nums")}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
