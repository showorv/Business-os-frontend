import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const alertVariants = cva("rounded-md border px-4 py-3 text-sm", {
  variants: {
    tone: {
      info: "border-brand/30 bg-brand-soft",
      danger: "border-danger/30 bg-danger-soft text-danger",
      warning: "border-foreground/20 bg-warning-soft",
    },
  },
  defaultVariants: { tone: "info" },
});

export const Alert = ({ className, tone, ...props }: HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) => (
  <div role={tone === "danger" ? "alert" : "status"} className={cn(alertVariants({ tone }), className)} {...props} />
);
