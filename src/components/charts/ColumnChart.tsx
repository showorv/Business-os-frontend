import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { labelStep, linear, niceTicks } from "./scale";
import { ChartTooltip, TooltipTitle } from "./Tooltip";
import { useWidth } from "./useSize";

interface ColumnChartProps {
  labels: string[];
  titles: string[];
  values: number[];
  // What the tooltip shows for one column: usually the value and a line or two of detail.
  describe: (index: number) => ReactNode;
  formatAxis: (value: number) => string;
  height?: number;
  label: string;
}

const PAD = { top: 16, right: 8, bottom: 28, left: 56 };
const MAX_BAR = 24;
const CORNER = 4;

// A column whose free end is rounded and whose base is square, growing up from zero or down from it.
const columnPath = (x: number, width: number, from: number, to: number) => {
  const r = Math.min(CORNER, width / 2, Math.abs(to - from));
  if (to <= from) {
    // Upwards: rounded top.
    return `M${x},${from}V${to + r}Q${x},${to} ${x + r},${to}H${x + width - r}Q${x + width},${to} ${x + width},${to + r}V${from}Z`;
  }
  return `M${x},${from}V${to - r}Q${x},${to} ${x + r},${to}H${x + width - r}Q${x + width},${to} ${x + width},${to - r}V${from}Z`;
};

// Columns above and below zero, such as profit and loss by month. Losses are hatched, not just paler,
// so they read as different even in print or without colour. Each column is its own hover target.
export const ColumnChart = ({ labels, titles, values, describe, formatAxis, height = 240, label }: ColumnChartProps) => {
  const [box, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const hatch = useId();
  const count = values.length;
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values), 3);
  const innerWidth = Math.max(0, width - PAD.left - PAD.right);
  const band = count ? innerWidth / count : 0;
  const barWidth = Math.max(4, Math.min(MAX_BAR, band * 0.62));
  const y = linear([ticks[0]!, ticks[ticks.length - 1]!], [height - PAD.bottom, PAD.top]);
  const zero = y(0);
  const step = labelStep(count, innerWidth, 44);

  return (
    <div ref={box} className="relative w-full select-none" style={{ height }} onPointerLeave={() => setActive(null)}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label={label} className="overflow-visible">
          <defs>
            <pattern id={hatch} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" className="fill-chart-4" />
              <line x1="0" y1="0" x2="0" y2="5" className="stroke-chart-2" strokeWidth="2.5" />
            </pattern>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} className={tick === 0 ? "stroke-chart-3" : "stroke-chart-grid"} strokeWidth={1} />
              <text x={PAD.left - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {formatAxis(tick)}
              </text>
            </g>
          ))}
          {values.map((value, index) => {
            const left = PAD.left + index * band + (band - barWidth) / 2;
            const dimmed = active !== null && active !== index;
            return (
              <g
                key={titles[index]}
                tabIndex={0}
                role="button"
                aria-label={titles[index]}
                onPointerEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="cursor-default outline-none"
              >
                {/* The hit area is the whole band, top to bottom, not just the painted column. */}
                <rect x={PAD.left + index * band} y={PAD.top} width={band} height={height - PAD.top - PAD.bottom} className={cn(active === index ? "fill-foreground/[0.04]" : "fill-transparent")} />
                {value !== 0 ? (
                  <path
                    d={columnPath(left, barWidth, zero, y(value))}
                    fill={value < 0 ? `url(#${hatch})` : undefined}
                    className={cn("transition-opacity duration-150", value >= 0 && "fill-chart-1", value < 0 ? "animate-chart-fade" : "animate-chart-rise", dimmed && "opacity-35")}
                    style={{ animationDelay: `${index * 30}ms` }}
                  />
                ) : null}
                {index === count - 1 || (index % step === 0 && count - 1 - index >= step) ? (
                  <text x={left + barWidth / 2} y={height - 8} textAnchor="middle" className={cn("text-[11px]", active === index ? "fill-foreground font-medium" : "fill-muted-foreground")}>
                    {labels[index]}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      ) : null}
      {active !== null && width > 0 ? (
        <ChartTooltip x={PAD.left + active * band + band / 2} y={PAD.top} width={width}>
          <TooltipTitle>{titles[active]}</TooltipTitle>
          {describe(active)}
        </ChartTooltip>
      ) : null}
    </div>
  );
};
