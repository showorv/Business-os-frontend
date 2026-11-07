import { ArrowRight, Bot, ChevronDown, Cog, History } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/features/tasks/parts";
import { cn } from "@/lib/cn";
import { useFormatting } from "@/lib/preferences";
import { entityLink, type AuditEntry } from "./api";

const actionKey = (action: string) => `action_${action.replace(/\./g, "_")}`;

// "transaction.created" → "created a transaction", or a readable form for anything not worded yet.
export const useActionWords = () => {
  const { t } = useTranslation("audit");
  return (action: string) => t(actionKey(action), { defaultValue: action.replace(/[._]/g, " ") });
};

const dayKey = (iso: string) => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const useDayLabel = () => {
  const { t } = useTranslation("audit");
  const { locale } = useFormatting();
  const [today] = useState(() => new Date());
  return (iso: string) => {
    const date = new Date(iso);
    const days = Math.round((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000);
    if (days === 0) return t("today");
    if (days === 1) return t("yesterday");
    return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) }).format(date);
  };
};

// Fields that change on every save and say nothing to a reader.
const NOISE = new Set(["updatedAt", "createdAt", "version", "rowHash", "prevHash"]);

const show = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const text = JSON.stringify(value);
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
};

const asObject = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);

// What changed: one row per field, the old value struck through next to the new one.
const Changes = ({ entry }: { entry: AuditEntry }) => {
  const { t } = useTranslation("audit");
  const before = asObject(entry.before);
  const after = asObject(entry.after);
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter((key) => !NOISE.has(key) && JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]));
  if (keys.length === 0) return <p className="text-sm text-muted-foreground">{t("noDetails")}</p>;
  return (
    <dl className="divide-y rounded-lg border text-sm">
      {keys.map((key) => (
        <div key={key} className="grid gap-1 px-3 py-2 sm:grid-cols-[10rem_1fr] sm:gap-3">
          <dt className="font-mono text-xs text-muted-foreground sm:pt-0.5">{key}</dt>
          <dd className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 break-all">
            {before && key in before ? <span className="text-muted-foreground line-through">{show(before[key])}</span> : null}
            {before && key in before && after && key in after ? <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" /> : null}
            {after && key in after ? <span className="font-medium">{show(after[key])}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
};

const Row = ({ entry, nameOf, businessId }: { entry: AuditEntry; nameOf: (userId: string | null) => string; businessId: string | null }) => {
  const { t } = useTranslation("audit");
  const words = useActionWords();
  const { locale } = useFormatting();
  const [open, setOpen] = useState(false);
  const name = entry.actorUserId ? nameOf(entry.actorUserId) || t("someone") : t("system");
  const link = entityLink(businessId, entry);
  const hasDetails = Boolean(asObject(entry.before) || asObject(entry.after));
  const failed = entry.action.endsWith("_failed") || entry.action.endsWith("denied") || entry.action === "auth.refresh_reused";

  return (
    <li className="relative pl-12" data-testid="audit-entry">
      <span className="absolute top-0 left-0">
        {entry.actorUserId ? (
          <Avatar name={name} className="size-9 ring-4 ring-background" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-muted ring-4 ring-background">
            <Cog className="size-4" />
          </span>
        )}
      </span>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="min-w-0">
          <span className="font-semibold">{name}</span> <span className={cn(failed && "text-danger")}>{words(entry.action)}</span>
        </p>
        {entry.actorVia === "ai" ? (
          <Badge className="gap-1 border bg-transparent">
            <Bot className="size-3" />
            {t("viaAi")}
          </Badge>
        ) : null}
        <time dateTime={entry.at} className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
          {new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(new Date(entry.at))}
        </time>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {link ? (
          <Link to={link} className="inline-flex items-center gap-1 font-medium hover:underline">
            {t(`entity_${entry.entityType}`, { defaultValue: (entry.entityType ?? "").replace(/_/g, " ") })}
            <ArrowRight className="size-3.5" />
          </Link>
        ) : entry.entityType ? (
          <span className="text-muted-foreground">{t(`entity_${entry.entityType}`, { defaultValue: entry.entityType.replace(/_/g, " ") })}</span>
        ) : null}
        {hasDetails ? (
          <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            {open ? t("hideChanges") : t("showChanges")}
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </button>
        ) : null}
        {entry.ip ? <span className="text-xs text-muted-foreground">{t("from", { ip: entry.ip })}</span> : null}
      </div>
      {open ? (
        <div className="animate-chart-fade mt-3">
          <Changes entry={entry} />
        </div>
      ) : null}
    </li>
  );
};

// A day-by-day timeline, newest first.
export const AuditTimeline = ({ entries, nameOf, businessId }: { entries: AuditEntry[]; nameOf: (userId: string | null) => string; businessId: string | null }) => {
  const dayLabel = useDayLabel();
  const days: { key: string; label: string; entries: AuditEntry[] }[] = [];
  for (const entry of entries) {
    const key = dayKey(entry.at);
    const last = days.at(-1);
    if (last?.key === key) last.entries.push(entry);
    else days.push({ key, label: dayLabel(entry.at), entries: [entry] });
  }
  return (
    <div className="space-y-8">
      {days.map((day) => (
        <section key={day.key} aria-label={day.label}>
          <h2 className="sticky top-16 z-10 -mx-1 mb-4 flex items-center gap-2 bg-background/95 px-1 py-1.5 text-sm font-semibold backdrop-blur">
            <History className="size-4 text-muted-foreground" />
            {day.label}
            <span className="font-normal text-muted-foreground">· {day.entries.length.toLocaleString()}</span>
          </h2>
          {/* The line behind the avatars ties a day's events together. */}
          <ol className="relative space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[1.125rem] before:w-px before:bg-border">
            {day.entries.map((entry) => (
              <Row key={entry.id} entry={entry} nameOf={nameOf} businessId={businessId} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
};
