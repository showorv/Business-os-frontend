import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const fieldClass =
  "h-10 w-full rounded-md border bg-surface px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 aria-invalid:border-danger disabled:opacity-60";

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => <input className={cn(fieldClass, className)} {...props} />;

export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cn(fieldClass, "pr-8", className)} {...props} />;
