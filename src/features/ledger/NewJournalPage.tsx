import { ArrowLeft, CircleCheck, Plus, Scale, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useMoney } from "@/features/businesses/useMoney";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { newRequestKey } from "@/lib/api";
import { cn } from "@/lib/cn";
import { todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { minorToInput, parseMoney } from "@/lib/money";
import { useFormatting } from "@/lib/preferences";
import { useCreateJournal, useLedgerAccounts } from "./api";
import { AccountSelect } from "./parts";

interface Line {
  key: number;
  ledgerAccountId: string;
  debit: string;
  credit: string;
  memo: string;
}

let nextKey = 0;
const blankLine = (): Line => ({ key: nextKey++, ledgerAccountId: "", debit: "", credit: "", memo: "" });

// A typed amount as paisa: empty is 0, anything unreadable is null.
const minorOf = (text: string, currency: string) => (text.trim() ? parseMoney(text, currency) : "0");

// A journal written by hand: debits on one side, credits on the other, and nothing posts until they match.
export const NewJournalPage = () => {
  const { t } = useTranslation(["ledger", "common"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const accounts = useLedgerAccounts(businessId);
  const create = useCreateJournal(businessId);
  const navigate = useNavigate();
  const money = useMoney();
  const { locale } = useFormatting();
  const [requestKey] = useState(newRequestKey);
  const [date, setDate] = useState<string | null>(null);
  const [kind, setKind] = useState<"ADJUSTING" | "STANDARD">("ADJUSTING");
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [blankLine(), blankLine()]);
  const [problem, setProblem] = useState<string | null>(null);

  if (!business || !accounts.data) return <Spinner className="mt-16" />;
  const currency = business.baseCurrency;
  const entryDate = date ?? todayIn(business.timezone);

  const sum = (side: "debit" | "credit") => lines.reduce((total, line) => total + BigInt(minorOf(line[side], currency) ?? "0"), 0n);
  const debits = sum("debit");
  const credits = sum("credit");
  const gap = debits - credits;
  const balanced = debits > 0n && gap === 0n;
  // How full each side is, for the little balance bar.
  const larger = debits > credits ? debits : credits;
  const share = (value: bigint) => (larger > 0n ? Number((value * 1000n) / larger) / 10 : 0);

  const change = (key: number, patch: Partial<Line>) =>
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, ...patch };
        // A line is either a debit or a credit: typing in one side clears the other.
        if (patch.debit) next.credit = "";
        if (patch.credit) next.debit = "";
        return next;
      }),
    );
  // When a new line is added while unbalanced, it starts with the amount that would balance it.
  const addLine = () => {
    const line = blankLine();
    const amount = gap < 0n ? -gap : gap;
    if (amount > 0n) {
      const text = minorToInput(amount, currency);
      if (gap > 0n) line.credit = text;
      else line.debit = text;
    }
    setLines((current) => [...current, line]);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!memo.trim()) return setProblem(t("ledger:descriptionNeeded"));
    const filled = lines.filter((line) => line.ledgerAccountId || line.debit.trim() || line.credit.trim());
    const body = [];
    for (const [index, line] of filled.entries()) {
      const number = index + 1;
      if (!line.ledgerAccountId) return setProblem(t("ledger:lineNoAccount", { number }));
      const debitMinor = minorOf(line.debit, currency);
      const creditMinor = minorOf(line.credit, currency);
      if (debitMinor === null || creditMinor === null) return setProblem(t("ledger:lineAmountWrong", { number }));
      if (debitMinor !== "0" && creditMinor !== "0") return setProblem(t("ledger:lineBothSides", { number }));
      if (debitMinor === "0" && creditMinor === "0") return setProblem(t("ledger:lineAmountWrong", { number }));
      body.push({ ledgerAccountId: line.ledgerAccountId, debitMinor, creditMinor, ...(line.memo.trim() ? { memo: line.memo.trim() } : {}) });
    }
    if (body.length < 2) return setProblem(t("ledger:linesNeeded"));
    if (!balanced) return setProblem(t("ledger:unbalanced"));
    setProblem(null);
    create.mutate(
      { requestKey, entryDate, kind, memo: memo.trim(), lines: body },
      {
        onSuccess: (entry) => {
          toast.success(t("ledger:posted", { entryNo: entry.entryNo }));
          void navigate(`/b/${businessId}/ledger/journals/${entry.id}`, { replace: true });
        },
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-4xl space-y-6 pb-28">
      <Link to={`/b/${businessId}/ledger?tab=journals`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t("ledger:allJournals")}
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("ledger:newEntry")}</h1>
        <p className="mt-1 text-muted-foreground">{t("ledger:newEntryHint")}</p>
      </header>

      {problem ? <Alert tone="danger">{problem}</Alert> : null}
      {create.isError ? <Alert tone="danger">{errorMessage(create.error)}</Alert> : null}

      <Card className="grid gap-4 p-5 sm:grid-cols-[11rem_1fr]">
        <Field label={t("ledger:date")}>
          <Input type="date" value={entryDate} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label={t("ledger:description")}>
          <Input value={memo} onChange={(event) => setMemo(event.target.value)} maxLength={500} placeholder={t("ledger:descriptionPlaceholder")} />
        </Field>
        <div className="space-y-1.5 sm:col-span-2">
          <Segmented
            label={t("ledger:entryKind")}
            value={kind}
            onChange={setKind}
            options={[
              { value: "ADJUSTING", label: t("ledger:kind_ADJUSTING") },
              { value: "STANDARD", label: t("ledger:kind_STANDARD") },
            ]}
          />
          <p className="text-sm text-muted-foreground">{t(`ledger:entryKindHint_${kind}`)}</p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1fr_9.5rem_9.5rem_2.5rem] gap-3 border-b bg-muted/40 px-5 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:grid">
          <span>{t("ledger:account")}</span>
          <span className="text-right">{t("ledger:debit")}</span>
          <span className="text-right">{t("ledger:credit")}</span>
          <span />
        </div>
        <ol className="divide-y">
          {lines.map((line, index) => {
            const number = index + 1;
            return (
              <li key={line.key} className="animate-chart-fade grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-[1fr_9.5rem_9.5rem_2.5rem] md:items-start">
                <div className="col-span-2 space-y-2 md:col-span-1">
                  <p className="text-xs font-medium text-muted-foreground md:hidden">{t("ledger:line", { number })}</p>
                  <AccountSelect
                    aria-label={`${t("ledger:account")} ${number}`}
                    accounts={accounts.data}
                    value={line.ledgerAccountId}
                    onChange={(value) => change(line.key, { ledgerAccountId: value })}
                    locale={locale}
                    placeholder={t("ledger:chooseAccount")}
                  />
                  <Input
                    aria-label={`${t("ledger:memo")} ${number}`}
                    value={line.memo}
                    onChange={(event) => change(line.key, { memo: event.target.value })}
                    placeholder={`${t("ledger:memo")} (${t("ledger:optional")})`}
                    maxLength={255}
                    className="h-9 text-sm"
                  />
                </div>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground md:sr-only">{t("ledger:debit")}</span>
                  <MoneyInput
                    currency={currency}
                    aria-label={`${t("ledger:debit")} ${number}`}
                    value={line.debit}
                    onChange={(event) => change(line.key, { debit: event.target.value })}
                    placeholder="0.00"
                    className="text-right"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground md:sr-only">{t("ledger:credit")}</span>
                  <MoneyInput
                    currency={currency}
                    aria-label={`${t("ledger:credit")} ${number}`}
                    value={line.credit}
                    onChange={(event) => change(line.key, { credit: event.target.value })}
                    placeholder="0.00"
                    className="text-right"
                  />
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("ledger:removeLine", { number })}
                  disabled={lines.length <= 2}
                  onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                  className="col-span-2 justify-self-end md:col-span-1"
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ol>
        <div className="border-t px-5 py-3">
          <Button variant="ghost" onClick={addLine} disabled={lines.length >= 200}>
            <Plus />
            {t("ledger:addLine")}
          </Button>
        </div>
      </Card>

      {/* Totals stay on screen while lines are typed: the post button only wakes up once both sides match. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-surface/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-1.5 sm:max-w-md">
            <Total label={t("ledger:debits")} value={money(debits, currency)} share={share(debits)} />
            <Total label={t("ledger:credits")} value={money(credits, currency)} share={share(credits)} />
          </div>
          <p role="status" className={cn("flex items-center gap-1.5 text-sm font-medium", !balanced && "text-muted-foreground")} data-testid="journal-balance">
            {balanced ? <CircleCheck className="size-4" /> : <Scale className="size-4" />}
            {balanced ? t("ledger:isBalanced") : t("ledger:notBalanced", { amount: money(gap < 0n ? -gap : gap, currency) })}
          </p>
          <Button type="submit" disabled={!balanced || create.isPending} className="w-full sm:w-auto">
            {t("ledger:post")}
          </Button>
        </div>
      </div>
    </form>
  );
};

const Total = ({ label, value, share }: { label: string; value: string; share: number }) => (
  <div className="min-w-0">
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-semibold tabular-nums">{value}</span>
    </div>
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-chart-track">
      <div className="h-full rounded-full bg-chart-1 transition-[width] duration-300" style={{ width: `${share}%` }} />
    </div>
  </div>
);
