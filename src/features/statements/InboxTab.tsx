import { ChevronRight, Inbox, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { Business } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { useAccounts } from "@/features/finance/api";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { LINE_STATUSES, useLineSummary, useRunMatcher, useStatementLines, type LineStatus, type LineSummary, type StatementLine } from "./api";
import { LinePanel } from "./LinePanel";
import { DirectionIcon, signed, StatusBadge } from "./parts";

const SUMMARY_KEY: Record<LineStatus, keyof LineSummary> = { UNMATCHED: "unmatched", AWAITING_POSTING: "awaitingPosting", MATCHED: "matched", IGNORED: "ignored" };

// Every line from every statement, to be matched to the books, turned into a transaction, or left out.
export const InboxTab = ({ businessId, business, canWrite, canPost }: { businessId: string; business: Business; canWrite: boolean; canPost: boolean }) => {
  const { t } = useTranslation("statements");
  const [params, setParams] = useSearchParams();
  const status = (LINE_STATUSES as readonly string[]).includes(params.get("status") ?? "") ? (params.get("status") as LineStatus) : "UNMATCHED";
  const accountId = params.get("account") ?? "";
  const importId = params.get("import") ?? "";
  const accounts = useAccounts(businessId);
  const summary = useLineSummary(businessId, accountId || undefined);
  const lines = useStatementLines(businessId, { status, ...(accountId ? { financialAccountId: accountId } : {}), ...(importId ? { importId } : {}) });
  const matcher = useRunMatcher(businessId);
  const [openId, setOpenId] = useState<string | null>(null);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("tab", "inbox");
    setParams(next, { replace: true });
  };

  const list = lines.data ?? [];
  const accountOf = useMemo(() => new Map((accounts.data ?? []).map((account) => [account.id, account])), [accounts.data]);
  const openIndex = list.findIndex((line) => line.id === openId);

  // After acting on a line it leaves this list, so the panel moves on to the next one still open here.
  // The list may not have reloaded yet, so lines settled a moment ago are skipped by hand.
  const [settled, setSettled] = useState<Set<string>>(() => new Set());
  const moveOn = () => {
    const done = new Set(settled).add(openId ?? "");
    setSettled(done);
    const open = (line: StatementLine) => !done.has(line.id);
    const next = list.slice(openIndex + 1).find(open) ?? list.slice(0, Math.max(openIndex, 0)).reverse().find(open);
    setOpenId(next?.id ?? null);
  };

  const runMatcher = () =>
    matcher.mutate(accountId || undefined, {
      onSuccess: (result) => toast.success(t("matcherDone", { matched: result.matched + result.ruled, left: result.needsReview })),
      onError: (error) => toast.error(errorMessage(error)),
    });

  return (
    <div className="space-y-4">
      <SummaryStrip summary={summary.data} status={status} onPick={(value) => setFilter("status", value)} />

      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label={t("account")} value={accountId} onChange={(event) => setFilter("account", event.target.value)} className="w-full sm:w-56">
          <option value="">{t("allAccounts")}</option>
          {(accounts.data ?? [])
            .filter((account) => account.isActive)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
        </Select>
        {importId ? (
          <button
            type="button"
            onClick={() => setFilter("import", "")}
            aria-label={t("clearImport")}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-muted px-3 text-sm font-medium hover:bg-muted/70"
          >
            {t("oneImport")}
            <X className="size-3.5" />
          </button>
        ) : null}
        {canWrite ? (
          <Button variant="outline" onClick={runMatcher} disabled={matcher.isPending} className="sm:ml-auto">
            <Sparkles />
            {matcher.isPending ? t("matching") : t("runMatcher")}
          </Button>
        ) : null}
      </div>

      {lines.isError ? <Alert tone="danger">{errorMessage(lines.error)}</Alert> : null}
      {lines.isLoading ? <Spinner className="mt-12" /> : null}

      {lines.isSuccess && list.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title={t(status === "UNMATCHED" ? "inboxZero" : "nothingHere")}
            body={t(status === "UNMATCHED" ? "inboxZeroHint" : "nothingHereHint")}
            action={
              canWrite && status === "UNMATCHED" ? (
                <Button asChild variant="outline">
                  <Link to="import">{t("importStatement")}</Link>
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : null}

      {list.length > 0 ? (
        <Card className="overflow-hidden">
          <ul className="divide-y" aria-label={t(`status_${status}`)}>
            {list.map((line) => (
              <LineRow key={line.id} line={line} currency={accountOf.get(line.financialAccountId)?.currency ?? business.baseCurrency} accountName={accountId ? null : (accountOf.get(line.financialAccountId)?.name ?? "")} onOpen={() => setOpenId(line.id)} active={line.id === openId} />
            ))}
          </ul>
          {lines.hasNextPage ? (
            <div className="border-t p-3 text-center">
              <Button variant="ghost" onClick={() => void lines.fetchNextPage()} disabled={lines.isFetchingNextPage}>
                {t("loadMore")}
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      {openId ? (
        <LinePanel
          key={openId}
          businessId={businessId}
          business={business}
          lineId={openId}
          canWrite={canWrite}
          canPost={canPost}
          position={openIndex >= 0 ? { index: openIndex, total: list.length } : null}
          onPrevious={openIndex > 0 ? () => setOpenId(list[openIndex - 1]!.id) : undefined}
          onNext={openIndex >= 0 && openIndex < list.length - 1 ? () => setOpenId(list[openIndex + 1]!.id) : undefined}
          onDone={moveOn}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
};

// Four tiles that filter the list, over one bar showing how much of everything is settled.
const SummaryStrip = ({ summary, status, onPick }: { summary: LineSummary | undefined; status: LineStatus; onPick: (status: LineStatus) => void }) => {
  const { t } = useTranslation("statements");
  const { locale } = useFormatting();
  const count = (value: LineStatus) => summary?.[SUMMARY_KEY[value]] ?? 0;
  const total = LINE_STATUSES.reduce((sum, value) => sum + count(value), 0);
  const settled = count("MATCHED") + count("IGNORED");
  const percent = total ? Math.round((settled / total) * 100) : 0;
  const number = (value: number) => value.toLocaleString(locale);
  const fill: Record<LineStatus, string> = {
    MATCHED: "bg-foreground",
    AWAITING_POSTING: "bg-foreground/55",
    IGNORED: "bg-foreground/25",
    UNMATCHED: "bg-transparent",
  };
  const order: LineStatus[] = ["MATCHED", "AWAITING_POSTING", "IGNORED", "UNMATCHED"];

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">{total ? t("settledOf", { settled: number(settled), total: number(total) }) : t("noLinesYet")}</p>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{t("percentDone", { percent: number(percent) })}</p>
      </div>
      <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={t("settledOf", { settled: number(settled), total: number(total) })}>
        {total
          ? order.map((value) =>
              count(value) ? (
                <span
                  key={value}
                  title={`${t(`status_${value}`)}: ${number(count(value))}`}
                  className={cn("h-full transition-[width] duration-500 first:rounded-l-full last:rounded-r-full", fill[value])}
                  style={{ width: `${(count(value) / total) * 100}%` }}
                />
              ) : null,
            )
          : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LINE_STATUSES.map((value) => {
          const active = value === status;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onPick(value)}
              className={cn(
                "group rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand",
                active ? "border-foreground bg-foreground text-background" : "hover:border-foreground/40 hover:bg-muted/50",
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span className={cn("size-2 rounded-full", value === "UNMATCHED" ? "border border-current" : fill[value], active && value !== "UNMATCHED" && "bg-background")} />
                <span className={cn(!active && "text-muted-foreground")}>{t(`status_${value}`)}</span>
              </span>
              <span className="mt-1 block text-xl font-semibold tabular-nums">{number(count(value))}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

const LineRow = ({ line, currency, accountName, onOpen, active }: { line: StatementLine; currency: string; accountName: string | null; onOpen: () => void; active: boolean }) => {
  const { t } = useTranslation(["statements", "errors"]);
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const title = line.description || line.counterparty || line.reference || t("noDescription");
  const meta = [formatDate(line.txnDate, locale, digitStyle), accountName, line.counterparty && line.counterparty !== title ? line.counterparty : null, line.reference && line.reference !== title ? line.reference : null].filter(Boolean);

  return (
    <li className={cn("group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:gap-4 sm:px-5", active && "bg-muted/60")}>
      <DirectionIcon direction={line.direction} />
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="block max-w-full truncate text-left font-medium after:absolute after:inset-0 focus-visible:outline-none">
          {title}
        </button>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{meta.join(" · ")}</p>
        {line.lastMatchError && line.status === "UNMATCHED" ? <p className="mt-0.5 truncate text-xs text-danger">{t("autoFailed", { reason: t(`errors:${line.lastMatchError}`, { defaultValue: t("errors:UNKNOWN") }) })}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={cn("font-semibold tabular-nums", line.direction === "OUT" && "text-muted-foreground")}>{signed(line.direction, money(line.amountMinor, currency))}</span>
        {line.status !== "UNMATCHED" ? <StatusBadge status={line.status} /> : null}
      </div>
      <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
    </li>
  );
};
