import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { linear, smoothPath } from "./scale";
import { useWidth } from "./useSize";

// Small charts that sit inside cards and rows: a sparkline, a meter, a ring, a split bar, ranked bars.

// The shape of a figure over time, with no axes: the number beside it is the point.
export const Sparkline = ({ values, height = 40, className }: { values: number[]; height?: number; className?: string }) => {
  const [box, width] = useWidth<HTMLDivElement>();
  const gradient = useId();
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const x = (index: number) => (values.length <= 1 ? width / 2 : 2 + (index * (width - 6)) / (values.length - 1));
  const y = linear([min, max === min ? min + 1 : max], [height - 3, 3]);
  const points = values.map((value, index) => [x(index), y(value)] as [number, number]);
  const line = smoothPath(points);
  return (
    <div ref={box} className={cn("w-full", className)} style={{ height }} aria-hidden>
      {width > 0 && values.length > 0 ? (
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--chart-1)", stopOpacity: 0.14 }} />
              <stop offset="100%" style={{ stopColor: "var(--chart-1)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {values.length > 1 ? <path d={`${line}L${x(values.length - 1)},${height}L${x(0)},${height}Z`} fill={`url(#${gradient})`} /> : null}
          <path d={line} fill="none" className="stroke-chart-2" strokeWidth={1.5} strokeLinecap="round" />
          <circle cx={x(values.length - 1)} cy={y(values[values.length - 1]!)} r={3} className="fill-chart-1 stroke-surface" strokeWidth={1.5} />
        </svg>
      ) : null}
    </div>
  );
};

export type MeterTone = "ok" | "near" | "over";

// How full something is: a budget line, a goal. Past 100% the fill turns red and the overflow shows
// as a notch, so "over" can't be missed. `mark` draws a tick at an alert level.
export const Meter = ({ percent, tone = "ok", mark, label, className }: { percent: number; tone?: MeterTone; mark?: number; label: string; className?: string }) => {
  const shown = Math.max(0, Math.min(100, percent));
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-chart-track", className)}>
      <div
        className={cn(
          "animate-chart-grow h-full rounded-full",
          tone === "over" ? "bg-danger" : "bg-chart-1",
          tone === "near" && "bg-[repeating-linear-gradient(135deg,var(--chart-1)_0_4px,var(--chart-2)_4px_6px)]",
        )}
        style={{ width: `${shown}%` }}
      />
      {mark !== undefined && mark < 100 ? <span className="absolute inset-y-0 w-0.5 bg-surface" style={{ left: `${mark}%` }} /> : null}
    </div>
  );
};

// A ring that fills clockwise, with anything in the middle (usually the percent).
export const ProgressRing = ({ percent, size = 72, stroke = 7, tone = "ok", children, label }: { percent: number; size?: number; stroke?: number; tone?: MeterTone; children?: ReactNode; label: string }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const shown = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-chart-track" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn("transition-[stroke-dashoffset] duration-700 ease-out", tone === "over" ? "stroke-danger" : "stroke-chart-1")}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{children}</div>
    </div>
  );
};

export interface Part {
  key: string;
  label: string;
  value: number;
  display: string;
  share: string;
}

const SHADES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

// One whole split into parts, biggest first, such as where the cash is kept. Past five parts the rest
// fold into the last shade. Hovering a part or its legend row lights up both.
export const SplitBar = ({ parts, label }: { parts: Part[]; label: string }) => {
  const [active, setActive] = useState<string | null>(null);
  const positive = parts.filter((part) => part.value > 0);
  const total = positive.reduce((sum, part) => sum + part.value, 0);
  const shade = (part: Part) => SHADES[Math.min(positive.indexOf(part), SHADES.length - 1)]!;
  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={label}>
        {total > 0
          ? positive.map((part, index) => (
                <div
                  key={part.key}
                  className={cn("animate-chart-grow h-full transition-opacity first:rounded-l-full last:rounded-r-full", active && active !== part.key && "opacity-30")}
                  style={{ width: `${(part.value / total) * 100}%`, background: shade(part), animationDelay: `${index * 60}ms` }}
                  onPointerEnter={() => setActive(part.key)}
                  onPointerLeave={() => setActive(null)}
                  title={`${part.label}: ${part.display} (${part.share})`}
                />
              ))
          : <div className="h-full w-full bg-chart-track" />}
      </div>
      <ul className="space-y-1">
        {parts.map((part) => (
          <li
            key={part.key}
            onPointerEnter={() => setActive(part.key)}
            onPointerLeave={() => setActive(null)}
            className={cn("flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors", active === part.key && "bg-muted")}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: part.value > 0 ? shade(part) : "transparent", boxShadow: part.value > 0 ? undefined : "inset 0 0 0 1px var(--chart-3)" }} />
            <span className="min-w-0 flex-1 truncate">{part.label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{part.share}</span>
            <span className="w-28 text-right font-medium tabular-nums">{part.display}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export interface RankedItem {
  key: string;
  label: string;
  value: number;
  display: string;
  detail?: string;
}

// A list ranked by size, each with a bar to scale against the largest. The numbers are written out,
// so nothing depends on hovering.
export const RankedBars = ({ items, emptyText }: { items: RankedItem[]; emptyText: string }) => {
  const max = Math.max(...items.map((item) => item.value), 0);
  if (items.length === 0 || max <= 0) return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={item.key} className="group">
          <div className="mb-1.5 flex items-baseline gap-3 text-sm">
            <span className="w-4 shrink-0 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.detail ? <span className="text-xs text-muted-foreground tabular-nums">{item.detail}</span> : null}
            <span className="font-medium tabular-nums">{item.display}</span>
          </div>
          <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-chart-track">
            <div
              className={cn("animate-chart-grow h-full rounded-full transition-colors", index === 0 ? "bg-chart-1" : "bg-chart-2 group-hover:bg-chart-1")}
              style={{ width: `${(item.value / max) * 100}%`, animationDelay: `${index * 60}ms` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
};
