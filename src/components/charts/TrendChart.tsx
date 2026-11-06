import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { labelStep, linear, niceTicks, smoothPath } from "./scale";
import { ChartTooltip, TooltipRow, TooltipTitle } from "./Tooltip";
import { useWidth } from "./useSize";

export interface TrendSeries {
  key: string;
  name: string;
  // A CSS colour, normally one of the chart tokens: "var(--chart-1)".
  color: string;
  values: number[];
  // A soft wash under the line. Kept for the main series, so two washes never stack into a block.
  area?: boolean;
  // Shown in the tooltip only (e.g. profit next to revenue and expenses), not drawn.
  hidden?: boolean;
}

interface TrendChartProps {
  // Under each point on the x axis ("Nov"), and the tooltip heading ("November 2026").
  labels: string[];
  titles: string[];
  series: TrendSeries[];
  formatValue: (value: number, index: number, series: TrendSeries) => string;
  formatAxis: (value: number) => string;
  height?: number;
  label: string;
}

const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

// Lines over time, with a crosshair that snaps to the nearest month and one tooltip listing every
// series there. Works with the keyboard too: focus the chart and use the arrow keys.
export const TrendChart = ({ labels, titles, series, formatValue, formatAxis, height = 280, label }: TrendChartProps) => {
  const [box, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId();
  const drawn = series.filter((item) => !item.hidden);
  const count = labels.length;

  const all = drawn.flatMap((item) => item.values);
  const ticks = niceTicks(Math.min(0, ...all), Math.max(0, ...all), height < 200 ? 3 : 4);
  const innerWidth = Math.max(0, width - PAD.left - PAD.right);
  const x = (index: number) => PAD.left + (count <= 1 ? innerWidth / 2 : (index * innerWidth) / (count - 1));
  const y = linear([ticks[0]!, ticks[ticks.length - 1]!], [height - PAD.bottom, PAD.top]);
  const step = labelStep(count, innerWidth);

  const nearest = (clientX: number, element: Element) => {
    const left = element.getBoundingClientRect().left;
    const position = clientX - left - PAD.left;
    return Math.min(count - 1, Math.max(0, Math.round(count <= 1 ? 0 : (position / innerWidth) * (count - 1))));
  };
  const onMove = (event: PointerEvent<SVGSVGElement>) => setActive(nearest(event.clientX, event.currentTarget));
  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, Home: -count, End: count };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActive((current) => Math.min(count - 1, Math.max(0, (current ?? count - 1) + moves[event.key]!)));
  };

  return (
    <div ref={box} className="relative w-full select-none" style={{ height }}>
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          tabIndex={0}
          className="overflow-visible rounded-md outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((current) => current ?? count - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
        >
          <defs>
            {drawn.map((item) => (
              <linearGradient key={item.key} id={`${gradientId}-${item.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" style={{ stopColor: item.color, stopOpacity: 0.16 }} />
                <stop offset="100%" style={{ stopColor: item.color, stopOpacity: 0 }} />
              </linearGradient>
            ))}
          </defs>

          {/* Hairline grid, with the zero line a little stronger. */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} className={tick === 0 ? "stroke-chart-3" : "stroke-chart-grid"} strokeWidth={1} />
              <text x={PAD.left - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {formatAxis(tick)}
              </text>
            </g>
          ))}
          {/* Every `step`-th month, plus the last one; a regular label too close to the last is skipped. */}
          {labels.map((text, index) =>
            index === count - 1 || (index % step === 0 && count - 1 - index >= step) ? (
              <text
                key={titles[index]}
                x={x(index)}
                y={height - 8}
                textAnchor={count > 1 && index === count - 1 ? "end" : count > 1 && index === 0 ? "start" : "middle"}
                className={cn("text-[11px]", active === index ? "fill-foreground font-medium" : "fill-muted-foreground")}
              >
                {text}
              </text>
            ) : null,
          )}

          {drawn.map((item) => {
            const points = item.values.map((value, index) => [x(index), y(value)] as [number, number]);
            const line = smoothPath(points);
            return (
              <g key={item.key}>
                {item.area && count > 1 ? (
                  <path
                    d={`${line}L${x(count - 1)},${y(Math.max(0, ticks[0]!))}L${x(0)},${y(Math.max(0, ticks[0]!))}Z`}
                    fill={`url(#${gradientId}-${item.key})`}
                    className="animate-chart-fade"
                  />
                ) : null}
                <path d={line} fill="none" stroke={item.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="animate-chart-draw" style={{ ["--chart-length" as string]: 1 }} />
                {/* The latest point carries a dot, so the line's end is easy to find. */}
                {count > 0 ? <circle cx={x(count - 1)} cy={y(item.values[count - 1]!)} r={4} fill={item.color} className="stroke-surface" strokeWidth={2} /> : null}
              </g>
            );
          })}

          {active !== null ? (
            <g>
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={height - PAD.bottom} className="stroke-foreground/25" strokeWidth={1} />
              {drawn.map((item) => (
                <circle key={item.key} cx={x(active)} cy={y(item.values[active]!)} r={5} fill={item.color} className="stroke-surface" strokeWidth={2} />
              ))}
            </g>
          ) : null}
          {/* The whole plot is the hit area: the pointer only needs to be near a month. */}
          <rect x={PAD.left - 8} y={0} width={innerWidth + 16} height={height} fill="transparent" />
        </svg>
      ) : null}
      {active !== null && width > 0 ? (
        <ChartTooltip x={x(active)} y={PAD.top} width={width}>
          <TooltipTitle>{titles[active]}</TooltipTitle>
          {series.map((item) => (
            <TooltipRow key={item.key} color={item.hidden ? undefined : item.color} label={item.name} value={formatValue(item.values[active]!, active, item)} />
          ))}
        </ChartTooltip>
      ) : null}
    </div>
  );
};
