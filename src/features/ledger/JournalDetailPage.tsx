import { ArrowLeft, ArrowRight, CircleCheck, Undo2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { todayIn, formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { useJournal, useReverseJournal } from "./api";
import { KindBadge, ledgerName } from "./parts";

// One entry: its debits and credits side by side, where it came from, and a way to undo it.
export const JournalDetailPage = () => {
  const { t } = useTranslation(["ledger", "common"]);
  const { businessId, journalId } = useParams() as { businessId: string; journalId: string };
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const journal = useJournal(businessId, journalId);
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();

  if (journal.isError) return <Alert tone="danger">{errorMessage(journal.error)}</Alert>;
  if (!journal.data || !business) return <Spinner className="mt-16" />;
  const entry = journal.data;
  const currency = entry.lines[0]?.currency ?? business.baseCurrency;
  const debits = entry.lines.reduce((sum, line) => sum + BigInt(line.debitMinor), 0n);
  const credits = entry.lines.reduce((sum, line) => sum + BigInt(line.creditMinor), 0n);
  const manual = !entry.sourceType && (entry.kind === "STANDARD" || entry.kind === "ADJUSTING");
  const canReverse = manual && !entry.reversedBy && access.can(Permission.LEDGER_REVERSE) && access.writable;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to={`/b/${businessId}/ledger?tab=journals`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t("ledger:allJournals")}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{entry.entryNo}</span>
            <KindBadge kind={entry.kind} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{entry.memo || entry.entryNo}</h1>
          <p className="text-muted-foreground">{formatDate(entry.entryDate, locale, digitStyle)}</p>
        </div>
        {canReverse ? <ReverseButton businessId={businessId} entryNo={entry.entryNo} journalId={entry.id} today={todayIn(business.timezone)} /> : null}
      </header>

      {/* Where it came from, and what undid it. */}
      <div className="flex flex-wrap gap-2 empty:hidden">
        {entry.sourceType === "transaction" && entry.sourceId ? (
          <Origin to={`/b/${businessId}/transactions/${entry.sourceId}`} label={t("ledger:fromTransaction")} action={t("ledger:openTransaction")} />
        ) : null}
        {entry.sourceType === "reconciliation" && entry.sourceId ? (
          <Origin to={`/b/${businessId}/ledger/reconcile/${entry.sourceId}`} label={t("ledger:fromReconciliation")} />
        ) : null}
        {entry.sourceType === "fiscal_year" ? <Origin label={t("ledger:fromYearClose")} /> : null}
        {entry.reversesId ? <Origin to={`/b/${businessId}/ledger/journals/${entry.reversesId}`} label={t("ledger:reverses")} /> : null}
        {entry.reversedBy ? <Origin to={`/b/${businessId}/ledger/journals/${entry.reversedBy.id}`} label={t("ledger:reversedBy", { entryNo: entry.reversedBy.entryNo })} icon /> : null}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-3 py-2.5 font-semibold sm:px-5">{t("ledger:account")}</th>
                <th className="px-3 py-2.5 text-right font-semibold sm:px-5">{t("ledger:debit")}</th>
                <th className="px-3 py-2.5 text-right font-semibold sm:px-5">{t("ledger:credit")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entry.lines.map((line) => (
                <tr key={line.id}>
                  {/* Credits are indented, the way they're written in a paper journal. */}
                  <td className="px-3 py-3 sm:px-5">
                    <div className={BigInt(line.creditMinor) > 0n ? "pl-3 sm:pl-6" : ""}>
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{line.ledgerAccount.code}</span>
                      <span className="font-medium">{ledgerName(line.ledgerAccount, locale)}</span>
                      {line.memo ? <p className="mt-0.5 text-xs text-muted-foreground">{line.memo}</p> : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums sm:px-5">{BigInt(line.debitMinor) > 0n ? money(line.debitMinor, currency) : ""}</td>
                  <td className="px-3 py-3 text-right tabular-nums sm:px-5">{BigInt(line.creditMinor) > 0n ? money(line.creditMinor, currency) : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-foreground/80 font-semibold">
                <td className="px-3 py-3 sm:px-5">
                  <span className="inline-flex items-center gap-1.5">
                    {t("ledger:total")}
                    {debits === credits ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <CircleCheck className="size-3.5" />
                        {t("ledger:balanced")}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums sm:px-5">{money(debits, currency)}</td>
                <td className="px-3 py-3 text-right tabular-nums sm:px-5">{money(credits, currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {manual || !entry.sourceType ? null : <p className="text-sm text-muted-foreground">{t("ledger:reverseThroughTransaction")}</p>}
    </div>
  );
};

const Origin = ({ to, label, action, icon }: { to?: string; label: string; action?: string; icon?: boolean }) => {
  const body = (
    <>
      {icon ? <Undo2 className="size-3.5" /> : null}
      {label}
      {to ? (
        <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
          {action}
          <ArrowRight className="size-3.5" />
        </span>
      ) : null}
    </>
  );
  const className = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm text-muted-foreground";
  return to ? (
    <Link to={to} className={`${className} transition-colors hover:bg-muted`}>
      {body}
    </Link>
  ) : (
    <span className={className}>{body}</span>
  );
};

const ReverseButton = ({ businessId, journalId, entryNo, today }: { businessId: string; journalId: string; entryNo: string; today: string }) => {
  const { t } = useTranslation("ledger");
  const reverse = useReverseJournal(businessId);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [memo, setMemo] = useState("");

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Undo2 />
        {t("reverse")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("reverseTitle", { entryNo })}
        description={t("reverseBody")}
        confirmLabel={t("reverse")}
        pending={reverse.isPending}
        onConfirm={() =>
          reverse.mutate(
            { journalId, entryDate: date, ...(memo.trim() ? { memo: memo.trim() } : {}) },
            {
              onSuccess: (created) => {
                setOpen(false);
                toast.success(t("reversed", { entryNo: created.entryNo }));
                void navigate(`/b/${businessId}/ledger/journals/${created.id}`);
              },
            },
          )
        }
      >
        <div className="space-y-3">
          {reverse.isError ? <Alert tone="danger">{errorMessage(reverse.error)}</Alert> : null}
          <Field label={t("reverseDate")}>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label={t("reverseMemo")}>
            <Input value={memo} onChange={(event) => setMemo(event.target.value)} maxLength={500} />
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
};
