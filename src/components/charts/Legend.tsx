import { cn } from "@/lib/cn";

export interface LegendItem {
  label: string;
  color: string;
  // The key copies the mark: a short line for lines, a small block for bars and areas.
  kind?: "line" | "block" | "hatch";
  // When given, the item is a button that shows or hides its series; `off` greys it out.
  onToggle?: () => void;
  off?: boolean;
}

export const Legend = ({
  items,
  className,
}: {
  items: LegendItem[];
  className?: string;
}) => (
  <ul
    className={cn(
      "flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground",
      className,
    )}
  >
    {items.map((item) => {
      const key = (
        <>
          {item.kind === "line" ? (
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ background: item.color }}
            />
          ) : (
            <span
              className="size-3 rounded-[3px]"
              style={
                item.kind === "hatch"
                  ? {
                      background: `repeating-linear-gradient(135deg, ${item.color} 0 2px, transparent 2px 4px)`,
                      boxShadow: `inset 0 0 0 1px ${item.color}`,
                    }
                  : { background: item.color }
              }
            />
          )}
          {item.label}
        </>
      );
      return (
        <li key={item.label}>
          {item.onToggle ? (
            <button
              type="button"
              aria-pressed={!item.off}
              onClick={item.onToggle}
              className={cn(
                "-mx-1.5 flex items-center gap-2 rounded px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                item.off && "line-through opacity-50",
              )}
            >
              {key}
            </button>
          ) : (
            <span className="flex items-center gap-2">{key}</span>
          )}
        </li>
      );
    })}
  </ul>
);
