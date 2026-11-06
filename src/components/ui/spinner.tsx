import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export const Spinner = ({ className, label }: { className?: string; label?: string }) => (
  <span role="status" className="inline-flex items-center gap-2">
    <LoaderCircle className={cn("size-4 animate-spin", className)} aria-hidden />
    {label ? <span>{label}</span> : <span className="sr-only">Loading</span>}
  </span>
);
