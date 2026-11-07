import { ArrowRight, Bot, CalendarClock, Check, FileText, ListChecks, ReceiptText, ShieldCheck, Sparkles, X } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useMoney } from "@/features/businesses/useMoney";
import { openDocument, useAccounts, useCategories } from "@/features/finance/api";
import { PriorityBadge } from "@/features/tasks/parts";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { queryKeys, useReload } from "@/lib/query";
import { useDecideProposal, type Message, type Proposal, type Source } from "./api";

// **bold**, and lines starting with "- " or "1. " as lists. Anything else stays plain text.
const inline = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => (part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>));

export const MessageText = ({ text }: { text: string }) => {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={cn("space-y-1 pl-5", list.ordered ? "list-decimal" : "list-disc")}>
        {list.items.map((item, index) => (
          <li key={index}>{inline(item)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const line of text.split("\n")) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]!);
      continue;
    }
    flush();
    if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="space-y-2 leading-relaxed">{blocks}</div>;
};

export const AssistantAvatar = ({ className }: { className?: string }) => (
  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background", className)}>
    <Sparkles className="size-4" />
  </span>
);

export const TypingDots = () => {
  const { t } = useTranslation("assistant");
  return (
    <div className="flex items-start gap-3" role="status" aria-label={t("thinking")}>
      <AssistantAvatar />
      <span className="flex h-10 items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-4">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="animate-typing-dot size-1.5 rounded-full bg-foreground" style={{ animationDelay: `${dot * 160}ms` }} />
        ))}
      </span>
    </div>
  );
};

// Where a figure came from: which tool, which period, and whether it is posted books or a plan.
const SourceChip = ({ source, businessId }: { source: Source; businessId: string }) => {
  const { t } = useTranslation("assistant");
  const { locale, digitStyle } = useFormatting();
  if (source.tool.startsWith("propose_")) return null;
  // "today", a date, or a moment; anything else is shown as it came.
  const asOfWords = (value: string) => {
    if (value === "today") return t("asOfToday");
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return t("asOf", { date: formatDate(value, locale, digitStyle) });
    return Number.isNaN(Date.parse(value)) ? value : t("asOf", { date: formatDateTime(value, locale, digitStyle) });
  };
  // Periods arrive as "2026-10-01 to 2026-10-31", with ", against …" for a comparison.
  const periodWords = (value: string) =>
    value
      .replace(/\d{4}-\d{2}-\d{2}/g, (date) => formatDate(date, locale, digitStyle))
      .replaceAll(" to ", " – ")
      .replace(", against ", ` ${t("against")} `);
  const when = source.period ? periodWords(source.period) : source.asOf ? asOfWords(source.asOf) : null;
  return (
    <>
      <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs" data-testid="source-chip">
        <ShieldCheck className="size-3.5 text-muted-foreground" />
        <span className="font-medium">{t(`tool_${source.tool}`, { defaultValue: source.tool.replaceAll("_", " ") })}</span>
        {when ? <span className="text-muted-foreground">· {when}</span> : null}
        {source.basis && source.basis !== "DOCUMENT" ? <span className="text-muted-foreground">· {t(`basis_${source.basis}`)}</span> : null}
      </span>
      {(source.documents ?? []).map((document) => (
        <button
          key={`${document.documentId}-${document.page}`}
          type="button"
          onClick={() => void openDocument(businessId, document.documentId)}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
        >
          <FileText className="size-3.5 shrink-0" />
          <span className="truncate">{document.fileName}</span>
          <span className="shrink-0 text-muted-foreground">· {t("pageN", { n: document.page.toLocaleString(locale) })}</span>
        </button>
      ))}
    </>
  );
};

export const Sources = ({ sources, businessId }: { sources: Source[]; businessId: string }) => {
  const { t } = useTranslation("assistant");
  const shown = sources.filter((source) => !source.tool.startsWith("propose_"));
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={t("sources")}>
      {shown.map((source, index) => (
        <SourceChip key={index} source={source} businessId={businessId} />
      ))}
    </div>
  );
};

export const GuardNote = ({ status }: { status: Message["guardStatus"] }) => {
  const { t } = useTranslation("assistant");
  if (!status || status === "ok") return null;
  return <p className="text-xs text-muted-foreground">{t(`guard_${status}`)}</p>;
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="min-w-0 text-right font-medium break-words">{children}</dd>
  </div>
);

const TransactionDetails = ({ proposal }: { proposal: Proposal }) => {
  const { t } = useTranslation(["assistant", "finance"]);
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const payload = proposal.payload as Record<string, string>;
  const accounts = useAccounts(proposal.businessId);
  const categories = useCategories(proposal.businessId);
  const account = accounts.data?.find((item) => item.id === payload.accountId);
  const category = categories.data?.find((item) => item.id === payload.categoryId);
  return (
    <>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {payload.type === "EXPENSE" ? "−" : "+"}
        {money(payload.amountMinor ?? "0", payload.currency ?? "BDT")}
      </p>
      <dl className="mt-2 divide-y">
        <Row label={t("assistant:kindLabel")}>{t(`assistant:txn_${payload.type}`)}</Row>
        <Row label={t("assistant:account")}>{account?.name ?? "…"}</Row>
        <Row label={t("assistant:category")}>{(locale.startsWith("bn") && category?.nameBn) || category?.name || "…"}</Row>
        <Row label={t("assistant:date")}>{payload.txnDate ? formatDate(payload.txnDate, locale, digitStyle) : "—"}</Row>
        {payload.description ? <Row label={t("assistant:note")}>{payload.description}</Row> : null}
      </dl>
    </>
  );
};

const TaskDetails = ({ proposal }: { proposal: Proposal }) => {
  const { t } = useTranslation("assistant");
  const { locale, digitStyle } = useFormatting();
  const payload = proposal.payload as { title?: string; description?: string; priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; dueAt?: string };
  return (
    <>
      <p className="text-lg font-semibold">{payload.title}</p>
      {payload.description ? <p className="mt-1 text-sm text-muted-foreground">{payload.description}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={payload.priority ?? "MEDIUM"} />
        {payload.dueAt ? (
          <Badge className="gap-1 border bg-transparent">
            <CalendarClock className="size-3" />
            {t("due", { date: formatDateTime(payload.dueAt, locale, digitStyle) })}
          </Badge>
        ) : null}
      </div>
    </>
  );
};

// A suggestion the assistant drafted. Nothing is written until the person confirms it here.
export const ProposalCard = ({ proposal }: { proposal: Proposal }) => {
  const { t } = useTranslation("assistant");
  const { businesses } = useCurrentBusiness();
  const access = useAccess(proposal.businessId);
  const decide = useDecideProposal();
  const reload = useReload();
  const [postNow, setPostNow] = useState(false);
  const [now] = useState(() => Date.now());
  const isTask = proposal.kind === "TASK";
  const Icon = isTask ? ListChecks : ReceiptText;
  const businessName = businesses.find((business) => business.id === proposal.businessId)?.name;
  const expired = proposal.status === "EXPIRED" || (proposal.status === "PENDING" && new Date(proposal.expiresAt).getTime() < now);
  const pending = proposal.status === "PENDING" && !expired;
  const canPost = !isTask && access.can(Permission.LEDGER_POST);
  const resultLink = proposal.resultId ? (isTask ? `/b/${proposal.businessId}/tasks?task=${proposal.resultId}` : `/b/${proposal.businessId}/transactions/${proposal.resultId}`) : null;

  const run = (accept: boolean) =>
    decide.mutate(
      { proposal, accept, postNow },
      {
        onSuccess: () => {
          void reload(isTask ? queryKeys.tasks(proposal.businessId) : queryKeys.transactions(proposal.businessId));
          toast.success(accept ? t(isTask ? "taskAdded" : "transactionAdded") : t("dismissed"));
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );

  return (
    <div className={cn("animate-message-in overflow-hidden rounded-xl border bg-surface shadow-xs", pending && "border-foreground/40")} data-testid="proposal-card">
      <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5 text-sm">
        <Icon className="size-4" />
        <span className="font-medium whitespace-nowrap">{t(isTask ? "draftTask" : "draftTransaction")}</span>
        {businessName ? <span className="hidden truncate text-muted-foreground sm:inline">· {businessName}</span> : null}
        <span className="ml-auto shrink-0">
          {proposal.status === "CONFIRMED" ? (
            <Badge className="gap-1 bg-foreground text-background">
              <Check className="size-3" />
              {t("status_CONFIRMED")}
            </Badge>
          ) : proposal.status === "REJECTED" ? (
            <Badge>{t("status_REJECTED")}</Badge>
          ) : expired ? (
            <Badge>{t("status_EXPIRED")}</Badge>
          ) : (
            <Badge className="border bg-transparent">{t("status_PENDING")}</Badge>
          )}
        </span>
      </div>
      <div className="px-4 py-3">{isTask ? <TaskDetails proposal={proposal} /> : <TransactionDetails proposal={proposal} />}</div>
      {pending ? (
        <div className="space-y-3 border-t px-4 py-3">
          {canPost ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={postNow} onChange={(event) => setPostNow(event.target.checked)} className="size-4 accent-foreground" />
              {t("postNow")}
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => run(true)} disabled={decide.isPending}>
              <Check />
              {t(isTask ? "addTask" : "addTransaction")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => run(false)} disabled={decide.isPending}>
              <X />
              {t("notNow")}
            </Button>
          </div>
        </div>
      ) : resultLink ? (
        <div className="border-t px-4 py-2.5">
          <Link to={resultLink} className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
            {t(isTask ? "openTask" : "openTransaction")}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
};

export const EmptyChat = ({ onPick, prompts }: { onPick: (text: string) => void; prompts: string[] }) => {
  const { t } = useTranslation("assistant");
  return (
    <div className="animate-chart-fade mx-auto flex max-w-2xl flex-col items-center py-8 text-center sm:py-14">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
        <Bot className="size-7" />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-tight sm:text-2xl">{t("hello")}</h2>
      <p className="mt-2 max-w-md text-muted-foreground">{t("helloHint")}</p>
      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPick(prompt)}
            className="group flex items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-3 text-left text-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-foreground"
          >
            <span>{prompt}</span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
};
