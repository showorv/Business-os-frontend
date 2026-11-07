import { ArrowDown, ArrowUp, ChevronsUp, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { useMembers, type Member } from "@/features/team/api";
import { cn } from "@/lib/cn";
import type { TaskPriority } from "./api";

// Low and medium stay quiet; high and urgent get louder, still in black and white.
const PRIORITY_ICON = { LOW: ArrowDown, MEDIUM: Minus, HIGH: ArrowUp, URGENT: ChevronsUp } as const;

export const PriorityBadge = ({ priority, className }: { priority: TaskPriority; className?: string }) => {
  const { t } = useTranslation("tasks");
  const Icon = PRIORITY_ICON[priority];
  return (
    <Badge
      className={cn(
        "gap-1",
        priority === "LOW" && "bg-transparent",
        priority === "HIGH" && "border border-foreground/50 bg-transparent text-foreground",
        priority === "URGENT" && "bg-foreground text-background",
        className,
      )}
    >
      <Icon className="size-3" />
      {t(`priority_${priority}`)}
    </Badge>
  );
};

// Initials in a circle, for whoever a task is assigned to.
export const Avatar = ({ name, className }: { name: string; className?: string }) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
  return (
    <span title={name} className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold", className)}>
      {initials || "?"}
    </span>
  );
};

// Everyone in the business, by user id, for showing names.
export const useMemberNames = (businessId: string) => {
  const members = useMembers(businessId);
  const list: Member[] = members.data ?? [];
  const byUser = new Map(list.map((member) => [member.userId, member.name || member.email || ""]));
  return { members: list, nameOf: (userId: string | null | undefined) => (userId ? (byUser.get(userId) ?? "") : "") };
};

// An ISO moment as the value a datetime-local box takes, in this browser's time.
export const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

// And back: a datetime-local value to an ISO moment the API accepts.
export const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);
