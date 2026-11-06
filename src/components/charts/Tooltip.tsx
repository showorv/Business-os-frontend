import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// The box that follows the pointer. It sits beside the point and flips to the other side near the
// right edge, so it never covers what it describes or leaves the chart.
export const ChartTooltip = ({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) => {
  const flip = x > width - 180;
  return (
    <div
      role="presentation"
      className={cn("pointer-events-none absolute z-10 min-w-36 rounded-md border bg-surface/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm", "animate-chart-fade")}
      style={{ left: flip ? undefined : x + 14, right: flip ? width - x + 14 : undefined, top: Math.max(0, y) }}
    >
      {children}
    </div>
  );
};

export const TooltipTitle = ({ children }: { children: ReactNode }) => <p className="mb-1.5 text-xs font-medium text-muted-foreground">{children}</p>;

// One line of the tooltip: the value first and strong, the series name after it, keyed by a short
// stroke in the series' shade.
export const TooltipRow = ({ color, label, value, dashed }: { color?: string; label: ReactNode; value: ReactNode; dashed?: boolean }) => (
  <div className="flex items-center gap-2 py-0.5">
    {color ? <span className={cn("h-0.5 w-3 shrink-0 rounded-full", dashed && "opacity-60")} style={{ background: color }} /> : null}
    <span className="font-semibold tabular-nums">{value}</span>
    <span className="text-muted-foreground">{label}</span>
  </div>
);
