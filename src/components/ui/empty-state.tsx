import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// What a list shows when it has nothing in it yet, with the next thing to do.
export const EmptyState = ({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
    <span className="flex size-12 items-center justify-center rounded-full bg-muted">
      <Icon className="size-5 text-muted-foreground" />
    </span>
    <p className="font-medium">{title}</p>
    {body ? <p className="max-w-sm text-sm text-muted-foreground">{body}</p> : null}
    {action ? <div className="mt-2">{action}</div> : null}
  </div>
);
