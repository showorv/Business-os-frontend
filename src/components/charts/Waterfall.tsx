import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { linear, niceTicks } from "./scale";
import { ChartTooltip, TooltipRow, TooltipTitle } from "./Tooltip";
import { useWidth } from "./useSize";

export interface WaterfallStep {
  label: string;
  value: number;
  // A total stands on the baseline (opening and closing cash). A change floats from the running total.
  total?: boolean;
  display: string;
}

const PAD = { top: 24, right: 8, bottom: 32, left: 56 };

// How a starting figure becomes an ending one: opening cash, what each activity added or took away,
// closing cash. Increases are solid, decreases hatched, totals in full ink.
export const Waterfall = ({ steps, formatAxis, height = 260, label }: { steps: WaterfallStep[]; formatAxis: (value: number) => string; height?: number; label: string }) => {
  const [box, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const hatch = useId();

  // Each change starts where the one before it ended.
  const bars = steps.reduce<(WaterfallStep & { from: number; to: number })[]>((done, step) => {
    const running = done.length ? done[done.length - 1]!.to : 0;
    const from = step.total ? 0 : running;
    return [...done, { ...step, from, to: step.total ? step.value : running + step.value }];
  }, []);
  const ticks = niceTicks(Math.min(0, ...bars.flatMap((bar) => [bar.from, bar.to])), Math.max(0, ...bars.flatMap((bar) => [bar.from, bar.to])), 4);
  const innerWidth = Math.max(0, width - PAD.left - PAD.right);
  const band = steps.length ? innerWidth / steps.length : 0;
  const barWidth = Math.min(56, band * 0.56);
  const y = linear([ticks[0]!, ticks[ticks.length - 1]!], [height - PAD.bottom, PAD.top]);

  return (
    <div ref={box} className="relative w-full select-none" style={{ height }} onPointerLeave={() => setActive(null)}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label={label} className="overflow-visible">
          <defs>
            <pattern id={hatch} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" className="fill-chart-5" />
              <line x1="0" y1="0" x2="0" y2="5" className="stroke-chart-2" strokeWidth="2.5" />
            </pattern>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} className={tick === 0 ? "stroke-chart-3" : "stroke-chart-grid"} />
              <text x={PAD.left - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {formatAxis(tick)}
              </text>
            </g>
          ))}
          {bars.map((bar, index) => {
            const left = PAD.left + index * band + (band - barWidth) / 2;
            const top = y(Math.max(bar.from, bar.to));
            const barHeight = Math.max(1.5, Math.abs(y(bar.from) - y(bar.to)));
            const next = bars[index + 1];
            return (
              <g key={bar.label} tabIndex={0} role="button" aria-label={`${bar.label}: ${bar.display}`} onPointerEnter={() => setActive(index)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} className="outline-none">
                <rect x={PAD.left + index * band} y={PAD.top} width={band} height={height - PAD.top - PAD.bottom} className={active === index ? "fill-foreground/[0.04]" : "fill-transparent"} />
                <rect
                  x={left}
                  y={top}
                  width={barWidth}
                  height={barHeight}
                  rx={3}
                  fill={!bar.total && bar.value < 0 ? `url(#${hatch})` : undefined}
                  className={cn("animate-chart-fade transition-opacity", bar.total ? "fill-chart-1" : bar.value >= 0 ? "fill-chart-2" : "", active !== null && active !== index && "opacity-40")}
                  style={{ animationDelay: `${index * 80}ms` }}
                />
                {/* A thin connector carries the running total to the next column. */}
                {next ? <line x1={left + barWidth} x2={left + band} y1={y(bar.to)} y2={y(bar.to)} className="stroke-chart-3" strokeWidth={1} /> : null}
                <text x={left + barWidth / 2} y={top - 6} textAnchor="middle" className="fill-foreground text-[11px] font-medium tabular-nums">
                  {bar.display}
                </text>
                <text x={left + barWidth / 2} y={height - 10} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                  {bar.label}
                </text>
              </g>
            );
          })}
        </svg>
      ) : null}
      {active !== null && width > 0 ? (
        <ChartTooltip x={PAD.left + active * band + band / 2} y={PAD.top} width={width}>
          <TooltipTitle>{bars[active]!.label}</TooltipTitle>
          <TooltipRow label="" value={bars[active]!.display} />
        </ChartTooltip>
      ) : null}
    </div>
  );
};
