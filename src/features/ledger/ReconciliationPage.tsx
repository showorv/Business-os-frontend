import { ArrowLeft, ArrowRight, CircleCheck, Info, Undo2, Wand2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { api, unwrap } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { queryKeys, useAction } from "@/lib/query";
import { useCloseReconciliation, useMatchLines, useReconciliation, useUnmatchLine, type ReconciliationLine } from "./api";

// Money in is a debit to the bank account, money out a credit.
const signedOf = (line: ReconciliationLine) => BigInt(line.debitMinor) - BigInt(line.creditMinor);

// Working through one statement: tick off what's on it until the gap is zero, then finish.
export const ReconciliationPage = () => {
  const { t } = useTranslation(["ledger", "common"]);
  const { businessId, reconciliationId } = useParams() as { businessId: string; reconciliationId: string };
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const view = useReconciliation(businessId, reconciliationId);
  const match = useMatchLines(businessId, reconciliationId);
  const unmatch = useUnmatchLine(businessId, reconciliationId);
  const finish = useCloseReconciliation(businessId, reconciliationId);
  const applyMatches = useAction(
    () => unwrap(api.POST("/api/v1/businesses/{businessId}/reconciliations/{reconciliationId}/apply-statement-matches", { params: { path: { businessId, reconciliationId } } })),
    {
      invalidates: [queryKeys.ledgerItem(businessId, "reconciliation", reconciliationId)],
      onSuccess: (result) => toast.success(t("ledger:statementMatchesApplied", { count: result.applied })),
    },
  );
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  if (view.isError) return <Alert tone="danger">{errorMessage(view.error)}</Alert>;
  if (!view.data || !business || access.isLoading) return <Spinner className="mt-16" />;
  const rec = view.data;
  const currency = business.baseCurrency;
  const open = rec.status === "OPEN";
  const canWork = open && access.can(Permission.LEDGER_POST) && access.writable;
  const canAdjust = access.can(Permission.TRANSACTIONS_APPROVE);
  const statement = BigInt(rec.statementBalanceMinor);
  const cleared = BigInt(rec.clearedMinor);
  const difference = BigInt(rec.differenceMinor);
  const chosen = rec.unmatchedLines.filter((line) => selected.has(line.id));
  const chosenSum = chosen.reduce((sum, line) => sum + signedOf(line), 0n);
  const afterTicking = difference - chosenSum;
  const matchesNow = difference === 0n;
  const progress = statement !== 0n ? Math.max(0, Math.min(100, Number((cleared * 1000n) / statement) / 10)) : matchesNow ? 100 : 0;
  const error = match.error ?? unmatch.error ?? finish.error ?? applyMatches.error;

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allChosen = rec.unmatchedLines.length > 0 && chosen.length === rec.unmatchedLines.length;
  const tickOff = () => match.mutate([...selected].filter((id) => rec.unmatchedLines.some((line) => line.id === id)), { onSuccess: () => setSelected(new Set()) });

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24">
      <Link to={`/b/${businessId}/ledger?tab=reconcile`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t("ledger:allReconciliations")}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{rec.account.name}</h1>
            <Badge className={cn(open && "bg-foreground text-background")}>{t(`ledger:rec_${rec.status}`)}</Badge>
          </div>
          <p className="text-muted-foreground">{t("ledger:statementOn", { date: formatDate(rec.statementDate, locale, digitStyle) })}</p>
        </div>
        {canWork ? (
          <Button variant="ghost" onClick={() => applyMatches.mutate()} disabled={applyMatches.isPending}>
            <Wand2 />
            {t("ledger:useStatementMatches")}
          </Button>
        ) : null}
      </header>

      {error ? <Alert tone="danger">{errorMessage(error)}</Alert> : null}

      {/* Statement against what's been ticked off: the gap is the one number that matters here. */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">{t("ledger:statement")}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{money(statement, currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("ledger:booksSay")} {money(rec.bookBalanceMinor, currency)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">{t("ledger:cleared")}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums" data-testid="rec-cleared">
            {money(cleared, currency)}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-chart-track">
            <div className="h-full rounded-full bg-chart-1 transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </Card>
        <Card className={cn("relative overflow-hidden p-5 transition-colors", matchesNow ? "border-foreground bg-foreground text-background" : "")}>
          <p className={cn("text-sm", matchesNow ? "text-background/70" : "text-muted-foreground")}>{t("ledger:toFind")}</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight tabular-nums" data-testid="rec-difference">
            {matchesNow ? <CircleCheck className="size-6" /> : null}
            {money(difference, currency)}
          </p>
          <p className={cn("mt-1 text-xs", matchesNow ? "text-background/70" : "text-muted-foreground")}>
            {matchesNow && open ? t("ledger:matchedAll") : chosen.length > 0 ? `→ ${money(afterTicking, currency)}` : " "}
          </p>
        </Card>
      </div>

      {open && rec.openStatementLines > 0 ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          {t("ledger:openStatementLines", { count: rec.openStatementLines })}
        </p>
      ) : null}
      {open && rec.latestStatementBalance ? (
        <p className="text-sm text-muted-foreground">
          {t("ledger:latestStatement", { amount: money(rec.latestStatementBalance.balanceMinor, currency), date: formatDate(rec.latestStatementBalance.asOf, locale, digitStyle) })}
        </p>
      ) : null}

      {!open ? (
        <Alert>
          {rec.adjustmentEntryId ? (
            <span className="flex flex-wrap items-center gap-x-2">
              {t("ledger:closedSummary", { difference: money(rec.closedDifferenceMinor ?? "0", currency) })}
              <Link to={`/b/${businessId}/ledger/journals/${rec.adjustmentEntryId}`} className="inline-flex items-center gap-1 font-medium hover:underline">
                {t("ledger:seeAdjustment")}
                <ArrowRight className="size-3.5" />
              </Link>
            </span>
          ) : (
            t("ledger:closedClean")
          )}
        </Alert>
      ) : null}

      <div className={cn("grid gap-4", open && "lg:grid-cols-2")}>
        {open ? (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
              <div>
                <h2 className="font-semibold">{t("ledger:unmatched")}</h2>
                <p className="text-xs text-muted-foreground">{t("ledger:unmatchedHint")}</p>
              </div>
              {canWork && rec.unmatchedLines.length > 0 ? (
                <label className="flex shrink-0 items-center gap-2 text-sm whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={allChosen}
                    onChange={() => setSelected(allChosen ? new Set() : new Set(rec.unmatchedLines.map((line) => line.id)))}
                    className="size-4 accent-foreground"
                  />
                  {t("ledger:selectAll")}
                </label>
              ) : null}
            </div>
            {rec.unmatchedLines.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">{t("ledger:nothingUnmatched")}</p> : null}
            <ul className="divide-y">
              {rec.unmatchedLines.map((line) => (
                <LineRow key={line.id} line={line} currency={currency}>
                  {canWork ? (
                    <input
                      type="checkbox"
                      aria-label={t("ledger:selectLine", { entryNo: line.entryNo })}
                      checked={selected.has(line.id)}
                      onChange={() => toggle(line.id)}
                      className="size-4 shrink-0 accent-foreground"
                    />
                  ) : null}
                </LineRow>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card className="overflow-hidden">
          <div className="border-b px-5 py-3">
            <h2 className="font-semibold">{t("ledger:matched")}</h2>
          </div>
          {rec.matchedLines.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">{t("ledger:nothingMatched")}</p> : null}
          <ul className="divide-y">
            {rec.matchedLines.map((line) => (
              <LineRow key={line.id} line={line} currency={currency} done>
                {canWork ? (
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={t("ledger:unmatchLine", { entryNo: line.entryNo })} onClick={() => unmatch.mutate(line.id)} disabled={unmatch.isPending}>
                    <Undo2 />
                  </Button>
                ) : null}
              </LineRow>
            ))}
          </ul>
        </Card>
      </div>

      {/* The action bar: tick off what's chosen, or finish once there's nothing left to find. */}
      {canWork ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-surface/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            {chosen.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">{t("ledger:selectedTotal", { amount: money(chosenSum, currency) })}</p>
                <div className="flex-1" />
                <Button onClick={tickOff} disabled={match.isPending} className="w-full sm:w-auto">
                  <CircleCheck />
                  {t("ledger:matchSelected", { count: chosen.length })}
                </Button>
              </>
            ) : (
              <>
                <p className={cn("text-sm", matchesNow ? "font-medium" : "text-muted-foreground")}>
                  {matchesNow ? t("ledger:matchedAll") : `${t("ledger:toFind")}: ${money(difference, currency)}`}
                </p>
                <div className="flex-1" />
                {matchesNow ? (
                  <Button onClick={() => setConfirming(true)} className="w-full sm:w-auto">
                    {t("ledger:finish")}
                  </Button>
                ) : canAdjust ? (
                  <Button variant="outline" onClick={() => setConfirming(true)} className="w-full sm:w-auto">
                    {t("ledger:finishWithAdjustment")}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("ledger:adjustNeedsApproval")}</p>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={matchesNow ? t("ledger:finishTitle") : t("ledger:adjustTitle", { amount: money(difference, currency) })}
        description={matchesNow ? t("ledger:finishBody") : t("ledger:adjustBody")}
        confirmLabel={matchesNow ? t("ledger:finish") : t("ledger:finishWithAdjustment")}
        danger={!matchesNow}
        pending={finish.isPending}
        onConfirm={() =>
          finish.mutate(!matchesNow, {
            onSuccess: () => {
              setConfirming(false);
              toast.success(t("ledger:finished"));
            },
          })
        }
      />
    </div>
  );
};

const LineRow = ({ line, currency, done, children }: { line: ReconciliationLine; currency: string; done?: boolean; children?: React.ReactNode }) => {
  const { t } = useTranslation("ledger");
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const amount = signedOf(line);
  const incoming = amount >= 0n;
  return (
    <li className={cn("flex items-center gap-3 px-5 py-3 transition-colors", !done && "has-[:checked]:bg-muted/60")}>
      {children}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{line.memo || line.entryMemo || line.entryNo}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(line.entryDate, locale, digitStyle)} · <span className="font-mono">{line.entryNo}</span>
        </p>
      </div>
      <div className="text-right">
        <p className={cn("text-sm font-semibold tabular-nums", done && "text-muted-foreground")}>
          {incoming ? "+" : "−"}
          {money(incoming ? amount : -amount, currency)}
        </p>
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{incoming ? t("moneyIn") : t("moneyOut")}</p>
      </div>
    </li>
  );
};
