import { ArrowRight, Check, ChevronLeft, ChevronRight, Link2, Plus, Trash2, Wand2, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import type { Business } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { useAccounts, useCategories, type Account, type Category } from "@/features/finance/api";
import { categoryName } from "@/features/finance/names";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { minorToInput, parseMoney } from "@/lib/money";
import { useFormatting } from "@/lib/preferences";
import { useCategorizeLine, useLineStep, useMatchLine, useSplitLine, useStatementLine, type StatementLineDetail } from "./api";
import { DirectionIcon, signed, StatusBadge } from "./parts";
import { RuleDialog } from "./RulesTab";

type Mode = "match" | "categorize" | "split";

interface LinePanelProps {
  businessId: string;
  business: Business;
  lineId: string;
  canWrite: boolean;
  canPost: boolean;
  position: { index: number; total: number } | null;
  onPrevious?: () => void;
  onNext?: () => void;
  onDone: () => void;
  onClose: () => void;
}

// One statement line, side by side with the ways to settle it.
export const LinePanel = ({ businessId, business, lineId, canWrite, canPost, position, onPrevious, onNext, onDone, onClose }: LinePanelProps) => {
  const { t } = useTranslation(["statements", "common"]);
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const line = useStatementLine(businessId, lineId);
  const accounts = useAccounts(businessId);
  const categories = useCategories(businessId);
  const [makingRule, setMakingRule] = useState(false);
  const detail = line.data;
  const account = accounts.data?.find((item) => item.id === detail?.financialAccountId);
  const currency = account?.currency ?? business.baseCurrency;

  return (
    <Dialog.Root open onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Content
          onKeyDown={(event) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
            if (event.key === "ArrowDown" || event.key === "j") onNext?.();
            if (event.key === "ArrowUp" || event.key === "k") onPrevious?.();
          }}
          className="animate-chart-fade fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto border-l bg-surface shadow-xl outline-none"
        >
          <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label={t("previousLine")} onClick={onPrevious} disabled={!onPrevious}>
                <ChevronLeft />
              </Button>
              <Button variant="ghost" size="icon" aria-label={t("nextLine")} onClick={onNext} disabled={!onNext}>
                <ChevronRight />
              </Button>
              {position ? <span className="ml-1 text-sm text-muted-foreground tabular-nums">{t("lineOf", { index: (position.index + 1).toLocaleString(locale), total: position.total.toLocaleString(locale) })}</span> : null}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label={t("common:close")}>
                <X />
              </Button>
            </Dialog.Close>
          </div>

          {line.isError ? (
            <div className="p-5">
              <Alert tone="danger">{errorMessage(line.error)}</Alert>
            </div>
          ) : null}
          {!detail ? (
            line.isLoading ? <Spinner className="mt-16" /> : <Dialog.Title className="sr-only">{t("line")}</Dialog.Title>
          ) : (
            <>
              <div className="space-y-4 border-b p-5">
                <div className="flex items-start gap-3">
                  <DirectionIcon direction={detail.direction} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <Dialog.Title className="text-lg leading-snug font-semibold break-words">{detail.description || detail.counterparty || t("noDescription")}</Dialog.Title>
                    <Dialog.Description className="text-sm text-muted-foreground">
                      {t(detail.direction === "IN" ? "moneyIn" : "moneyOut")} · {formatDate(detail.txnDate, locale, digitStyle)}
                      {account ? ` · ${account.name}` : ""}
                    </Dialog.Description>
                  </div>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <p className="text-3xl font-semibold tracking-tight tabular-nums">{signed(detail.direction, money(detail.amountMinor, currency))}</p>
                  <StatusBadge status={detail.status} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {detail.counterparty ? <Fact label={t("counterparty")} value={detail.counterparty} /> : null}
                  {detail.reference ? <Fact label={t("reference")} value={detail.reference} mono /> : null}
                  {detail.feeMinor !== "0" ? <Fact label={t("fee")} value={money(detail.feeMinor, currency)} /> : null}
                  {detail.balanceAfterMinor !== null ? <Fact label={t("balanceAfter")} value={money(detail.balanceAfterMinor, currency)} /> : null}
                </dl>
              </div>

              <div className="flex-1 p-5">
                {detail.status === "UNMATCHED" && canWrite ? (
                  <OpenActions
                    businessId={businessId}
                    line={detail}
                    currency={currency}
                    accounts={accounts.data ?? []}
                    categories={categories.data ?? []}
                    canPost={canPost}
                    onDone={onDone}
                  />
                ) : null}
                {detail.status === "UNMATCHED" && !canWrite ? <p className="text-sm text-muted-foreground">{t("readOnly")}</p> : null}
                {detail.status === "MATCHED" || detail.status === "AWAITING_POSTING" ? <Settled businessId={businessId} line={detail} canWrite={canWrite} /> : null}
                {detail.status === "IGNORED" ? <Ignored businessId={businessId} line={detail} canWrite={canWrite} /> : null}
              </div>

              {canWrite ? (
                <div className="border-t p-5">
                  <button type="button" onClick={() => setMakingRule(true)} className="inline-flex items-center gap-2 text-sm font-medium hover:underline">
                    <Wand2 className="size-4" />
                    {t("makeRule")}
                  </button>
                  <p className="mt-1 text-xs text-muted-foreground">{t("makeRuleHint")}</p>
                </div>
              ) : null}
              {makingRule ? (
                <RuleDialog
                  businessId={businessId}
                  business={business}
                  canPost={canPost}
                  start={{ name: detail.counterparty || detail.description || "", containsText: ruleTextFor(detail), direction: detail.direction }}
                  onClose={() => setMakingRule(false)}
                />
              ) : null}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// The counterparty is the steadiest text on a statement; failing that, the first real word of the description.
const ruleTextFor = (line: StatementLineDetail) =>
  (line.counterparty || (line.description ?? "").split(/\s+/).find((word) => word.replace(/[^\p{L}]/gu, "").length >= 4) || line.description || "").slice(0, 200);

const Fact = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="min-w-0">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className={cn("truncate", mono && "font-mono text-xs leading-5")}>{value}</dd>
  </div>
);

const OpenActions = ({
  businessId,
  line,
  currency,
  accounts,
  categories,
  canPost,
  onDone,
}: {
  businessId: string;
  line: StatementLineDetail;
  currency: string;
  accounts: Account[];
  categories: Category[];
  canPost: boolean;
  onDone: () => void;
}) => {
  const { t } = useTranslation("statements");
  const [mode, setMode] = useState<Mode>(line.suggestions.length > 0 ? "match" : "categorize");
  const ignore = useLineStep(businessId);
  const usableCategories = categories.filter((category) => category.isActive && category.type === (line.direction === "IN" ? "INCOME" : "EXPENSE"));

  return (
    <div className="space-y-5">
      <Segmented
        label={t("settleHow")}
        value={mode}
        onChange={setMode}
        className="flex w-full"
        options={[
          { value: "match", label: line.suggestions.length ? t("modeMatchCount", { count: line.suggestions.length }) : t("modeMatch") },
          { value: "categorize", label: t("modeCategorize") },
          { value: "split", label: t("modeSplit") },
        ]}
      />
      {mode === "match" ? <MatchForm businessId={businessId} line={line} onDone={onDone} /> : null}
      {mode === "categorize" ? <CategorizeForm businessId={businessId} line={line} accounts={accounts} categories={usableCategories} canPost={canPost} onDone={onDone} /> : null}
      {mode === "split" ? <SplitForm businessId={businessId} line={line} currency={currency} categories={usableCategories} canPost={canPost} onDone={onDone} /> : null}

      <div className="border-t pt-4">
        <Button
          variant="ghost"
          className="-ml-3 text-muted-foreground"
          disabled={ignore.isPending}
          onClick={() =>
            ignore.mutate(
              { lineId: line.id, step: "ignore" },
              {
                onSuccess: () => {
                  toast.success(t("ignored"));
                  onDone();
                },
                onError: (error) => toast.error(errorMessage(error)),
              },
            )
          }
        >
          {t("ignoreLine")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("ignoreHint")}</p>
      </div>
    </div>
  );
};

const MatchForm = ({ businessId, line, onDone }: { businessId: string; line: StatementLineDetail; onDone: () => void }) => {
  const { t } = useTranslation("statements");
  const { locale, digitStyle } = useFormatting();
  const match = useMatchLine(businessId);
  const [chosen, setChosen] = useState(line.suggestions[0]?.journalLineId ?? "");

  if (line.suggestions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-5 text-center">
        <p className="font-medium">{t("noSuggestions")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("noSuggestionsHint")}</p>
      </div>
    );
  }

  const submit = () =>
    match.mutate(
      { lineId: line.id, journalLineIds: [chosen] },
      {
        onSuccess: () => {
          toast.success(t("matched"));
          onDone();
        },
      },
    );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("suggestionsHint")}</p>
      {match.isError ? <Alert tone="danger">{errorMessage(match.error)}</Alert> : null}
      <div role="radiogroup" aria-label={t("suggestions")} className="space-y-2">
        {line.suggestions.map((suggestion) => {
          const active = suggestion.journalLineId === chosen;
          return (
            <button
              key={suggestion.journalLineId}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setChosen(suggestion.journalLineId)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand",
                active ? "border-foreground ring-1 ring-foreground" : "hover:bg-muted/50",
              )}
            >
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", active && "border-foreground bg-foreground text-background")}>
                {active ? <Check className="size-3" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{suggestion.memo || suggestion.referenceNo || suggestion.entryNo}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{suggestion.entryNo}</span> · {formatDate(suggestion.entryDate, locale, digitStyle)}
                  {suggestion.referenceNo ? ` · ${suggestion.referenceNo}` : ""}
                </span>
              </span>
              {datesApart(line.txnDate, suggestion.entryDate) === 0 ? <span className="shrink-0 text-xs font-medium">{t("sameDay")}</span> : <span className="shrink-0 text-xs text-muted-foreground">{t("daysApart", { count: datesApart(line.txnDate, suggestion.entryDate) })}</span>}
            </button>
          );
        })}
      </div>
      <Button className="w-full" onClick={submit} disabled={!chosen || match.isPending}>
        <Link2 />
        {t("matchThis")}
      </Button>
    </div>
  );
};

const datesApart = (a: string, b: string) => Math.round(Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000);

const CategorizeForm = ({
  businessId,
  line,
  accounts,
  categories,
  canPost,
  onDone,
}: {
  businessId: string;
  line: StatementLineDetail;
  accounts: Account[];
  categories: Category[];
  canPost: boolean;
  onDone: () => void;
}) => {
  const { t } = useTranslation("statements");
  const { locale } = useFormatting();
  const categorize = useCategorizeLine(businessId);
  const [kind, setKind] = useState<"category" | "transfer">("category");
  const [categoryId, setCategoryId] = useState("");
  const [transferId, setTransferId] = useState("");
  const [description, setDescription] = useState(line.description ?? "");
  const [postNow, setPostNow] = useState(canPost);
  const others = accounts.filter((item) => item.isActive && item.id !== line.financialAccountId);
  const ready = kind === "category" ? Boolean(categoryId) : Boolean(transferId);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    categorize.mutate(
      {
        lineId: line.id,
        ...(kind === "category" ? { categoryId } : { transferAccountId: transferId }),
        ...(description.trim() ? { description: description.trim() } : {}),
        postNow: canPost && postNow,
      },
      {
        onSuccess: () => {
          toast.success(canPost && postNow ? t("createdPosted") : t("createdDraft"));
          onDone();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {categorize.isError ? <Alert tone="danger">{errorMessage(categorize.error)}</Alert> : null}
      <Segmented
        label={t("recordAs")}
        value={kind}
        onChange={setKind}
        options={[
          { value: "category", label: t(line.direction === "IN" ? "asIncome" : "asExpense") },
          { value: "transfer", label: t("asTransfer") },
        ]}
      />
      {kind === "category" ? (
        <Field label={t("category")}>
          <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">{t("pickCategory")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {categoryName(category, locale)}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label={t(line.direction === "OUT" ? "transferTo" : "transferFrom")} hint={line.feeMinor !== "0" && line.direction === "OUT" ? t("transferFeeHint") : undefined}>
          <Select value={transferId} onChange={(event) => setTransferId(event.target.value)}>
            <option value="">{t("pickAccount")}</option>
            {others.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={t("description")}>
        <Input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} />
      </Field>
      <PostNowBox canPost={canPost} checked={postNow} onChange={setPostNow} />
      <Button type="submit" className="w-full" disabled={!ready || categorize.isPending}>
        {t("createTransaction")}
        <ArrowRight />
      </Button>
    </form>
  );
};

const PostNowBox = ({ canPost, checked, onChange }: { canPost: boolean; checked: boolean; onChange: (next: boolean) => void }) => {
  const { t } = useTranslation("statements");
  if (!canPost) return <p className="text-xs text-muted-foreground">{t("draftOnly")}</p>;
  return (
    <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4 accent-foreground" />
      <span>
        <span className="font-medium">{t("postNow")}</span>
        <span className="block text-muted-foreground">{t("postNowHint")}</span>
      </span>
    </label>
  );
};

interface Part {
  key: number;
  categoryId: string;
  amount: string;
}

const SplitForm = ({
  businessId,
  line,
  currency,
  categories,
  canPost,
  onDone,
}: {
  businessId: string;
  line: StatementLineDetail;
  currency: string;
  categories: Category[];
  canPost: boolean;
  onDone: () => void;
}) => {
  const { t } = useTranslation("statements");
  const money = useMoney();
  const { locale } = useFormatting();
  const split = useSplitLine(businessId);
  const fee = BigInt(line.feeMinor);
  const total = BigInt(line.amountMinor);
  // A fee on the line is a natural second part, so it starts filled in.
  const [parts, setParts] = useState<Part[]>(() =>
    fee > 0n && fee < total
      ? [
          { key: 1, categoryId: "", amount: minorToInput(String(total - fee), currency) },
          { key: 2, categoryId: "", amount: minorToInput(String(fee), currency) },
        ]
      : [
          { key: 1, categoryId: "", amount: "" },
          { key: 2, categoryId: "", amount: "" },
        ],
  );
  const [postNow, setPostNow] = useState(canPost);
  const amounts = parts.map((part) => (part.amount.trim() ? parseMoney(part.amount, currency) : null));
  const allocated = amounts.reduce<bigint>((sum, value) => sum + (value ? BigInt(value) : 0n), 0n);
  const left = total - allocated;
  const ready = parts.length >= 2 && left === 0n && parts.every((part, index) => part.categoryId && amounts[index] && amounts[index] !== "0");
  const percent = total > 0n ? Math.min(100, Number((allocated * 10000n) / total) / 100) : 0;

  const change = (key: number, patch: Partial<Part>) => setParts((current) => current.map((part) => (part.key === key ? { ...part, ...patch } : part)));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    split.mutate(
      { lineId: line.id, postNow: canPost && postNow, parts: parts.map((part, index) => ({ categoryId: part.categoryId, amountMinor: amounts[index]! })) },
      {
        onSuccess: () => {
          toast.success(t("splitDone", { count: parts.length }));
          onDone();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {split.isError ? <Alert tone="danger">{errorMessage(split.error)}</Alert> : null}
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">{t("allocated", { amount: money(allocated, currency) })}</span>
          <span data-testid="split-left" className={cn("font-medium tabular-nums", left < 0n && "text-danger")}>
            {left === 0n ? t("splitBalanced") : left > 0n ? t("leftToSplit", { amount: money(left, currency) }) : t("overBy", { amount: money(-left, currency) })}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-[width] duration-300", left < 0n ? "bg-danger" : "bg-foreground")} style={{ width: `${left < 0n ? 100 : percent}%` }} />
        </div>
      </div>
      <ol className="space-y-3">
        {parts.map((part, index) => (
          <li key={part.key} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{t("partN", { n: (index + 1).toLocaleString(locale) })}</span>
              {parts.length > 2 ? (
                <Button variant="ghost" size="icon" className="size-7" aria-label={t("removePart", { n: index + 1 })} onClick={() => setParts((current) => current.filter((item) => item.key !== part.key))}>
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
            <div className="grid grid-cols-[1fr_8.5rem] gap-2">
              <Select aria-label={t("partCategory", { n: index + 1 })} value={part.categoryId} onChange={(event) => change(part.key, { categoryId: event.target.value })}>
                <option value="">{t("pickCategory")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryName(category, locale)}
                  </option>
                ))}
              </Select>
              <MoneyInput
                currency={currency}
                aria-label={t("partAmount", { n: index + 1 })}
                value={part.amount}
                onChange={(event) => change(part.key, { amount: event.target.value })}
                // An empty box suggests what's left, so the last part is easy to fill.
                placeholder={left > 0n ? minorToInput(String(left), currency) : "0.00"}
                inputMode="decimal"
              />
            </div>
          </li>
        ))}
      </ol>
      {parts.length < 20 ? (
        <Button variant="outline" size="sm" onClick={() => setParts((current) => [...current, { key: Math.max(...current.map((part) => part.key)) + 1, categoryId: "", amount: "" }])}>
          <Plus />
          {t("addPart")}
        </Button>
      ) : null}
      <PostNowBox canPost={canPost} checked={postNow} onChange={setPostNow} />
      <Button type="submit" className="w-full" disabled={!ready || split.isPending}>
        {t("splitInto", { count: parts.length })}
      </Button>
    </form>
  );
};

// What a settled line is tied to, and the way back.
const Settled = ({ businessId, line, canWrite }: { businessId: string; line: StatementLineDetail; canWrite: boolean }) => {
  const { t } = useTranslation("statements");
  const unmatch = useLineStep(businessId);
  const [confirming, setConfirming] = useState(false);
  const transactionIds = [...new Set(line.links.map((link) => link.transactionId).filter((id): id is string => Boolean(id)))];

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/60 p-4 text-sm">
        <p className="font-medium">{t(line.status === "MATCHED" ? "settledMatched" : "settledAwaiting")}</p>
        {line.matchedBy ? <p className="mt-1 text-muted-foreground">{t(`matchedBy_${line.matchedBy}`, { defaultValue: line.matchedBy })}</p> : null}
      </div>
      {transactionIds.length > 0 ? (
        <ul className="space-y-1">
          {transactionIds.map((id, index) => (
            <li key={id}>
              <Link to={`/b/${businessId}/transactions/${id}`} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
                {transactionIds.length > 1 ? t("openTransactionN", { n: index + 1 }) : t("openTransaction")}
                <ArrowRight className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {canWrite ? (
        <>
          <Button variant="outline" onClick={() => setConfirming(true)}>
            {t("unmatch")}
          </Button>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title={t("unmatchTitle")}
            description={t("unmatchBody")}
            confirmLabel={t("unmatch")}
            pending={unmatch.isPending}
            onConfirm={() =>
              unmatch.mutate(
                { lineId: line.id, step: "unmatch" },
                {
                  onSuccess: () => {
                    setConfirming(false);
                    toast.success(t("unmatched"));
                  },
                  onError: (error) => {
                    setConfirming(false);
                    toast.error(errorMessage(error));
                  },
                },
              )
            }
          />
        </>
      ) : null}
    </div>
  );
};

const Ignored = ({ businessId, line, canWrite }: { businessId: string; line: StatementLineDetail; canWrite: boolean }) => {
  const { t } = useTranslation("statements");
  const restore = useLineStep(businessId);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("ignoredHint")}</p>
      {canWrite ? (
        <Button
          variant="outline"
          disabled={restore.isPending}
          onClick={() => restore.mutate({ lineId: line.id, step: "restore" }, { onSuccess: () => toast.success(t("restored")), onError: (error) => toast.error(errorMessage(error)) })}
        >
          {t("restore")}
        </Button>
      ) : null}
    </div>
  );
};
