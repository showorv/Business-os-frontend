import { ArrowLeft, Archive, ArchiveRestore, PiggyBank, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Meter, type MeterTone } from "@/components/charts/Figures";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Spinner } from "@/components/ui/spinner";
import { useBudget, useBudgets, useSetBudgetLine, useUpdateBudget, type Budget, type BudgetLine, type BudgetSummary } from "@/features/analytics/api";
import { useAccess } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useCategories } from "@/features/finance/api";
import { categoryName } from "@/features/finance/names";
import { currentLocale } from "@/i18n";
import { cn } from "@/lib/cn";
import { todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { parseMoney } from "@/lib/money";
import { addMonths, fiscalYearStart, formatMonthRange, toMonth } from "@/lib/months";
import { formatPercent } from "@/lib/numbers";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { BudgetDialog } from "./BudgetDialog";

const toneOf = (level: BudgetLine["level"]): MeterTone => (level === "OVER" ? "over" : level === "OK" ? "ok" : "near");

// Spent and planned across all of a budget's lines.
const totalsOf = (budget: Budget) => {
  const planned = budget.lines.reduce((sum, line) => sum + BigInt(line.amountMinor), 0n);
  const spent = budget.lines.reduce((sum, line) => sum + BigInt(line.actualMinor), 0n);
  const percent = planned > 0n ? Number((spent * 10_000n) / planned) / 100 : 0;
  const over = budget.lines.filter((line) => line.level === "OVER").length;
  return { planned, spent, percent, over };
};

export const BudgetsPage = () => {
  const { t } = useTranslation(["budgets", "shell"]);
  const businessId = useParams().businessId!;
  const navigate = useNavigate();
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const [showArchived, setShowArchived] = useState(false);
  const budgets = useBudgets(businessId, showArchived);
  const [params, setParams] = useSearchParams();
  const creating = params.get("new") === "1";
  if (!business || access.isLoading) return <Spinner className="mt-16" />;
  const canWrite = access.can(Permission.FINANCE_WRITE) && access.writable;
  const now = toMonth(todayIn(business.timezone));
  const yearStart = fiscalYearStart(now, business.fiscalYearStartMonth);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("shell:budgets")}</h1>
          <p className="mt-1 text-muted-foreground">{t("budgets:subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? t("budgets:hideArchived") : t("budgets:showArchived")}
          </Button>
          {canWrite ? (
            <Button onClick={() => setParams({ new: "1" }, { replace: true })}>
              <Plus />
              {t("budgets:newBudget")}
            </Button>
          ) : null}
        </div>
      </header>

      {budgets.isError ? <Alert tone="danger">{errorMessage(budgets.error)}</Alert> : null}
      {budgets.isLoading ? <Spinner /> : null}
      {budgets.isSuccess && budgets.data.length === 0 ? (
        <Card>
          <EmptyState icon={PiggyBank} title={t("budgets:empty")} body={t("budgets:emptyHint")} />
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(budgets.data ?? []).map((budget) => (
          <BudgetCard key={budget.id} businessId={businessId} budget={budget} />
        ))}
      </div>

      {creating ? (
        <BudgetDialog
          businessId={businessId}
          currency={business.baseCurrency}
          startMonth={now}
          endMonth={addMonths(yearStart, 11)}
          onClose={() => setParams({}, { replace: true })}
          onCreated={(budget) => void navigate(budget.id)}
        />
      ) : null}
    </div>
  );
};

const BudgetCard = ({ businessId, budget }: { businessId: string; budget: BudgetSummary }) => {
  const { t } = useTranslation("budgets");
  const detail = useBudget(businessId, budget.id);
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const totals = detail.data ? totalsOf(detail.data) : null;
  return (
    <Link to={budget.id} className="group block">
      <Card className="flex h-full flex-col gap-4 p-5 transition-shadow group-hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{budget.name}</h2>
            <p className="text-sm text-muted-foreground">{formatMonthRange(budget.startMonth, budget.endMonth, locale, digitStyle)}</p>
          </div>
          {budget.status === "ARCHIVED" ? <Badge>{t("archived")}</Badge> : null}
        </div>
        {totals && detail.data ? (
          <>
            <div>
              <p className="text-2xl font-semibold tracking-tight">{money(totals.spent, detail.data.currency)}</p>
              <p className="text-sm text-muted-foreground">{t("ofPlanned", { amount: money(totals.planned, detail.data.currency) })}</p>
            </div>
            <Meter percent={totals.percent} tone={totals.percent > 100 ? "over" : totals.over > 0 || totals.percent >= 80 ? "near" : "ok"} label={budget.name} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatPercent(totals.percent / 100, locale, digitStyle)}</span>
              <span>{totals.over > 0 ? t("linesOver", { count: totals.over }) : t("linesCount", { count: detail.data.lines.length })}</span>
            </div>
          </>
        ) : (
          <Spinner />
        )}
      </Card>
    </Link>
  );
};

export const BudgetDetailPage = () => {
  const { t } = useTranslation(["budgets", "common"]);
  const { businessId, budgetId } = useParams() as { businessId: string; budgetId: string };
  const access = useAccess(businessId);
  const budget = useBudget(businessId, budgetId);
  const update = useUpdateBudget(businessId, budgetId);
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  if (budget.isError) return <Alert tone="danger">{errorMessage(budget.error)}</Alert>;
  if (!budget.data || access.isLoading) return <Spinner className="mt-16" />;
  const data = budget.data;
  const totals = totalsOf(data);
  const canWrite = access.can(Permission.FINANCE_WRITE) && access.writable;
  const remaining = totals.planned - totals.spent;
  const lines = [...data.lines].sort((a, b) => Number(b.usedPercent ?? 0) - Number(a.usedPercent ?? 0));
  const name = (line: BudgetLine) => (locale === "bn-BD" && line.category.nameBn ? line.category.nameBn : line.category.name);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to=".." relative="path" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t("budgets:allBudgets")}
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{data.name}</h1>
          <p className="mt-1 text-muted-foreground">{formatMonthRange(data.startMonth, data.endMonth, locale, digitStyle)}</p>
        </div>
        {canWrite ? (
          <Button
            variant="outline"
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                { status: data.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE" },
                { onSuccess: () => toast.success(t(data.status === "ACTIVE" ? "budgets:archivedDone" : "budgets:restoredDone")) },
              )
            }
          >
            {data.status === "ACTIVE" ? <Archive /> : <ArchiveRestore />}
            {data.status === "ACTIVE" ? t("budgets:archive") : t("budgets:restore")}
          </Button>
        ) : null}
      </header>
      {update.isError ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}

      <Card className="grid gap-6 p-6 sm:grid-cols-3">
        <div>
          <p className="text-sm text-muted-foreground">{t("budgets:spent")}</p>
          <p className="text-3xl font-semibold tracking-tight">{money(totals.spent, data.currency)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("budgets:planned")}</p>
          <p className="text-3xl font-semibold tracking-tight">{money(totals.planned, data.currency)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{remaining < 0n ? t("budgets:overBy") : t("budgets:left")}</p>
          <p className={cn("text-3xl font-semibold tracking-tight", remaining < 0n && "text-danger")}>{money(remaining < 0n ? -remaining : remaining, data.currency)}</p>
        </div>
        <div className="space-y-1.5 sm:col-span-3">
          <Meter percent={totals.percent} tone={totals.percent > 100 ? "over" : totals.percent >= 80 ? "near" : "ok"} label={data.name} className="h-3" />
          <p className="text-right text-xs text-muted-foreground">{t("usedPercent", { value: formatPercent(totals.percent / 100, locale, digitStyle) })}</p>
        </div>
      </Card>

      <Card>
        <div className="p-5 pb-2">
          <h2 className="font-semibold">{t("budgets:byCategory")}</h2>
          <p className="text-sm text-muted-foreground">{t("budgets:byCategoryHint")}</p>
        </div>
        <ul className="divide-y">
          {lines.map((line) => (
            <li key={line.id} className="space-y-2 px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{name(line)}</span>
                <span className="text-sm tabular-nums">
                  <span className="font-semibold">{money(line.actualMinor, data.currency)}</span>
                  <span className="text-muted-foreground"> / {money(line.amountMinor, data.currency)}</span>
                </span>
              </div>
              <Meter percent={Number(line.usedPercent ?? 0)} tone={toneOf(line.level)} mark={line.alertPercent} label={name(line)} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className={cn(line.level === "OVER" && "font-medium text-danger", line.level !== "OK" && line.level !== "OVER" && "font-medium text-foreground")}>{t(`level_${line.level}`)}</span>
                <span>{formatPercent(Number(line.usedPercent ?? 0) / 100, locale, digitStyle)}</span>
              </div>
            </li>
          ))}
        </ul>
        {canWrite && data.status === "ACTIVE" ? <LineForm businessId={businessId} budget={data} /> : null}
      </Card>
    </div>
  );
};

// Adds a category to the budget, or changes the amount for one already in it.
const LineForm = ({ businessId, budget }: { businessId: string; budget: Budget }) => {
  const { t } = useTranslation("budgets");
  const categories = useCategories(businessId);
  const setLine = useSetBudgetLine(businessId, budget.id);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const locale = currentLocale();
  const options = (categories.data ?? []).filter((category) => category.type === "EXPENSE" && category.isActive).sort((a, b) => categoryName(a, locale).localeCompare(categoryName(b, locale)));
  const existing = budget.lines.find((line) => line.category.id === categoryId);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amountMinor = parseMoney(amount, budget.currency);
    if (!categoryId) return setProblem(t("pickCategory"));
    if (amountMinor === null || amountMinor === "0") return setProblem(t("amountWrongPlain"));
    setProblem(null);
    setLine.mutate(
      { categoryId, amountMinor, alertPercent: existing?.alertPercent ?? 80 },
      {
        onSuccess: () => {
          toast.success(t("lineSaved"));
          setAmount("");
          setCategoryId("");
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-3 border-t bg-muted/30 p-5">
      <p className="text-sm font-medium">{t("addOrChange")}</p>
      {problem ? <Alert tone="danger">{problem}</Alert> : null}
      {setLine.isError ? <Alert tone="danger">{errorMessage(setLine.error)}</Alert> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select aria-label={t("category")} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="sm:flex-1">
          <option value="">{t("pickCategory")}</option>
          {options.map((category) => (
            <option key={category.id} value={category.id}>
              {categoryName(category, locale)}
              {budget.lines.some((line) => line.category.id === category.id) ? ` · ${t("inBudget")}` : ""}
            </option>
          ))}
        </Select>
        <MoneyInput currency={budget.currency} aria-label={t("limit")} placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} className="sm:w-44" />
        <Button type="submit" variant="outline" disabled={setLine.isPending}>
          {existing ? t("change") : t("add")}
        </Button>
      </div>
    </form>
  );
};

