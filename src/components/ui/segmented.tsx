import { cn } from "@/lib/cn";

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}

// A row of buttons where exactly one is chosen, like "Income | Expense | Transfer".
export const Segmented = <T extends string>({ label, value, options, onChange, className }: SegmentedProps<T>) => (
  <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-md border bg-muted p-1", className)}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={value === option.value}
        onClick={() => onChange(option.value)}
        className={cn(
          "flex-1 rounded px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-brand",
          value === option.value ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);
