import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Badge = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground", className)} {...props} />
);
