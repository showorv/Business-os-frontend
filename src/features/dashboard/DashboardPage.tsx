import { ArrowRight, Banknote, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { RankedBars, SplitBar } from "@/components/charts/Figures";
import { Legend } from "@/components/charts/Legend";
import { TooltipRow } from "@/components/charts/Tooltip";
import { TrendChart } from "@/components/charts/TrendChart";
import { useAppSelector } from "@/app/store";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useDashboard, type Dashboard } from "@/features/analytics/api";
import { ChartCard, Delta, FigureTable, StatTile } from "@/features/analytics/parts";
import { PeriodPicker } from "@/features/analytics/PeriodPicker";
import { usePeriod } from "@/features/analytics/period";
import { useAccess } from "@/features/businesses/api";
import { useCompactMoney, useMoney } from "@/features/businesses/useMoney";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useAccounts, useTransactions } from "@/features/finance/api";
import { BusinessHomePage } from "@/features/home/BusinessHomePage";
import { currentLocale } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { minorToNumber } from "@/lib/money";
import { formatMonth, formatMonthRange } from "@/lib/months";
import { change, formatPercent } from "@/lib/numbers";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { AttentionCard, GoalsCard, RecentCard } from "./DashboardCards";
import { GettingStarted } from "./GettingStarted";

// The business's home. People who can see the money get the dashboard; everyone else, and a brand-new
// business with nothing in it yet, gets a welcome page.
export const DashboardPage = () => {
  const businessId = useParams().businessId!;
  const access = useAccess(businessId);
  const canRead = access.can(Permission.FINANCE_READ);
  const accounts = useAccounts(businessId, canRead);
  const firstPage = useTransactions(businessId, {});
  if (access.isLoading) return <Spinner className="mt-16" />;
  if (!canRead) return <BusinessHomePage />;
  if (!accounts.data || firstPage.isLoading) return <Spinner className="mt-16" />;
  const empty = (firstPage.data ?? []).length === 0 && accounts.data.every((account) => account.currentBalanceMinor === "0");
  return empty ? <GettingStarted /> : <Overview businessId={businessId} />;
};

const greetingKey = (timeZone: string) => {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
  return hour < 5 ? "greetingEvening" : hour < 12 ? "greetingMorning" : hour < 17 ? "greetingAfternoon" : "greetingEvening";
};

const Overview = ({ businessId }: { businessId: string }) => {
  const { t } = useTranslation(["analytics", "shell"]);
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const user = useAppSelector((state) => state.auth.user);
  const period = usePeriod(business);
  const current = useDashboard(businessId, period.range);
  const previous = useDashboard(businessId, period.previous);
  const { locale, digitStyle } = useFormatting();
  if (!business) return null;

  const firstName = user?.name?.split(" ")[0] ?? "";
  const canWrite = access.can(Permission.FINANCE_WRITE) && access.writable;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{t(`analytics:${greetingKey(business.timezone)}`, { name: firstName })}</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{business.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker preset={period.preset} range={period.range} onChoose={period.choose} />
          {canWrite ? (
            <Button asChild>
              <Link to="transactions/new">
                <Plus />
                <span className="hidden sm:inline">{t("analytics:newTransaction")}</span>
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      {current.isError ? <Alert tone="danger">{errorMessage(current.error)}</Alert> : null}
      {!current.data ? (
        <Spinner className="mt-16" />
      ) : (
        <Figures
          businessId={businessId}
          data={current.data}
          previous={previous.data}
          stale={current.isPlaceholderData}
          periodText={formatMonthRange(period.range.fromMonth, period.range.toMonth, locale, digitStyle)}
        />
      )}
    </div>
  );
};

interface FiguresProps {
  businessId: string;
  data: Dashboard;
  previous?: Dashboard;
  stale: boolean;
  periodText: string;
}

const Figures = ({ businessId, data, previous, stale, periodText }: FiguresProps) => {
  const { t } = useTranslation("analytics");
  const money = useMoney();
  const compact = useCompactMoney();
  const { locale, digitStyle } = useFormatting();
  const currency = data.currency;
  // Lines hidden from the legend. One always stays, so the chart is never empty.
  const [hiddenLines, setHiddenLines] = useState<("revenue" | "expenses")[]>([]);
  const toggleLine = (key: "revenue" | "expenses") => setHiddenLines((current) => (current.includes(key) ? [] : [key]));
  const axis = (value: number) => compact(value, currency);

  const months = data.trend.map((point) => point.month);
  const revenue = data.trend.map((point) => minorToNumber(point.revenueMinor));
  const expenses = data.trend.map((point) => minorToNumber(point.expensesMinor));
  const profit = data.trend.map((point) => minorToNumber(point.netProfitMinor));
  const shortLabels = months.map((month) => formatMonth(month, locale, digitStyle, "short"));
  const titles = months.map((month) => formatMonth(month, locale, digitStyle, "long"));
  const revenueTotal = BigInt(data.revenueMinor);
  const margin = revenueTotal > 0n ? Number((BigInt(data.netProfitMinor) * 10_000n) / revenueTotal) / 10_000 : null;
  const losing = BigInt(data.netProfitMinor) < 0n;

  const activeAccounts = data.accounts.filter((account) => account.currency === currency);
  const cashTotal = activeAccounts.reduce((sum, account) => sum + BigInt(account.currentBalanceMinor), 0n);
  // Shares are of the money actually held, so an overdrawn account doesn't push others past 100%.
  const heldTotal = activeAccounts.reduce((sum, account) => (BigInt(account.currentBalanceMinor) > 0n ? sum + BigInt(account.currentBalanceMinor) : sum), 0n);
  const shareOf = (minor: string) =>
    heldTotal > 0n && BigInt(minor) > 0n ? formatPercent(Number((BigInt(minor) * 10_000n) / heldTotal) / 10_000, locale, digitStyle) : "—";
  const profitChange = previous ? change(data.netProfitMinor, previous.netProfitMinor) : null;

  return (
    <div className={stale ? "space-y-6 opacity-80 transition-opacity" : "space-y-6 transition-opacity"}>
      {/* The one figure the page leads with, on an inverted card so it's the first thing seen. */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden border-foreground bg-foreground p-6 text-background md:col-span-2">
          <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-background/[0.06]" aria-hidden />
          <div className="pointer-events-none absolute -right-8 -bottom-32 size-64 rounded-full bg-background/[0.04]" aria-hidden />
          <div className="relative flex h-full flex-col gap-4">
            <div className="flex items-center justify-between gap-2 text-sm text-background/70">
              <span>{t("netProfit")}</span>
              <span>{periodText}</span>
            </div>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <span className="text-4xl font-semibold tracking-tight sm:text-5xl" data-testid="net-profit">
                {money(data.netProfitMinor, currency)}
              </span>
              {profitChange !== null ? <Delta value={profitChange} className="bg-background! text-foreground! border-0" /> : null}
            </div>
            <p className="text-sm text-background/70">
              {losing ? t("heroLoss") : t("heroProfit")}{" "}
              {margin !== null ? t("margin", { value: formatPercent(margin, locale, digitStyle) }) : null}
            </p>
            {/* Revenue against expenses as one bar: how much of what came in was kept. */}
            <div className="mt-auto space-y-2">
              <div className="flex h-2 overflow-hidden rounded-full bg-background/15">
                <div
                  className="animate-chart-grow h-full rounded-full bg-background"
                  style={{ width: `${revenueTotal > 0n ? Math.max(0, Math.min(100, Number((BigInt(data.expensesMinor) * 100n) / revenueTotal))) : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-background/70">
                <span>
                  {t("spentOfEarned", { spent: money(data.expensesMinor, currency), earned: money(data.revenueMinor, currency) })}
                </span>
              </div>
            </div>
          </div>
        </Card>
        <StatTile
          label={t("revenue")}
          value={money(data.revenueMinor, currency)}
          delta={previous ? <Delta value={change(data.revenueMinor, previous.revenueMinor)} /> : null}
          trend={revenue}
          icon={<TrendingUp />}
          footnote={t("vsPrevious")}
        />
        <StatTile
          label={t("expenses")}
          value={money(data.expensesMinor, currency)}
          delta={previous ? <Delta value={change(data.expensesMinor, previous.expensesMinor)} goodWhenUp={false} /> : null}
          trend={expenses}
          icon={<TrendingDown />}
          footnote={t("vsPrevious")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title={t("revenueAndExpenses")}
          description={t("revenueAndExpensesHint")}
          stale={stale}
          legend={
            <Legend
              items={(["revenue", "expenses"] as const).map((key) => ({
                label: t(key),
                color: key === "revenue" ? "var(--chart-1)" : "var(--chart-2)",
                kind: "line" as const,
                off: hiddenLines.includes(key),
                onToggle: () => toggleLine(key),
              }))}
            />
          }
          table={
            <FigureTable
              head={[t("month"), t("revenue"), t("expenses"), t("netProfit")]}
              rows={data.trend.map((point, index) => [titles[index], money(point.revenueMinor, currency), money(point.expensesMinor, currency), money(point.netProfitMinor, currency)])}
            />
          }
        >
          <TrendChart
            label={t("revenueAndExpenses")}
            labels={shortLabels}
            titles={titles}
            series={[
              { key: "revenue", name: t("revenue"), color: "var(--chart-1)", values: revenue, area: true, hidden: hiddenLines.includes("revenue") },
              { key: "expenses", name: t("expenses"), color: "var(--chart-2)", values: expenses, hidden: hiddenLines.includes("expenses") },
              { key: "profit", name: t("netProfit"), color: "var(--chart-1)", values: profit, hidden: true },
            ]}
            formatValue={(_value, index, series) => {
              const point = data.trend[index]!;
              return money(series.key === "revenue" ? point.revenueMinor : series.key === "expenses" ? point.expensesMinor : point.netProfitMinor, currency);
            }}
            formatAxis={axis}
          />
        </ChartCard>

        <ChartCard
          title={t("profitByMonth")}
          description={t("profitByMonthHint")}
          stale={stale}
          legend={
            <Legend
              items={[
                { label: t("profit"), color: "var(--chart-1)" },
                { label: t("loss"), color: "var(--chart-2)", kind: "hatch" },
              ]}
            />
          }
        >
          <ColumnChart
            label={t("profitByMonth")}
            labels={shortLabels}
            titles={titles}
            values={profit}
            formatAxis={axis}
            height={280}
            describe={(index) => {
              const point = data.trend[index]!;
              return (
                <>
                  <TooltipRow label={BigInt(point.netProfitMinor) < 0n ? t("loss") : t("profit")} value={money(point.netProfitMinor, currency)} />
                  <TooltipRow label={t("revenue")} value={money(point.revenueMinor, currency)} />
                  <TooltipRow label={t("expenses")} value={money(point.expensesMinor, currency)} />
                </>
              );
            }}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("topExpenses")} description={t("topExpensesHint")} stale={stale}>
          <RankedBars
            emptyText={t("noExpensesYet")}
            items={data.topExpenses.map((item) => ({
              key: item.ledgerAccountId,
              label: currentLocale() === "bn-BD" && item.nameBn ? item.nameBn : item.name,
              value: minorToNumber(item.amountMinor),
              display: money(item.amountMinor, currency),
              detail: item.sharePercent ? formatPercent(Number(item.sharePercent) / 100, locale, digitStyle) : undefined,
            }))}
          />
        </ChartCard>
        <ChartCard
          title={t("whereCashIs")}
          description={t("whereCashIsHint")}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="accounts">
                {t("allAccounts")}
                <ArrowRight />
              </Link>
            </Button>
          }
        >
          <div className="mb-4 flex items-baseline gap-2">
            <Banknote className="size-4 self-center text-muted-foreground" />
            <span className="text-2xl font-semibold tracking-tight">{money(cashTotal, currency)}</span>
            <span className="text-sm text-muted-foreground">{t("cashNow")}</span>
          </div>
          <SplitBar
            label={t("whereCashIs")}
            parts={[...activeAccounts]
              .sort((a, b) => (BigInt(b.currentBalanceMinor) > BigInt(a.currentBalanceMinor) ? 1 : -1))
              .map((account) => ({
                key: account.id,
                label: account.name,
                value: minorToNumber(account.currentBalanceMinor),
                display: money(account.currentBalanceMinor, currency),
                share: shareOf(account.currentBalanceMinor),
              }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GoalsCard businessId={businessId} currency={currency} />
        <AttentionCard businessId={businessId} receivableMinor={data.receivableMinor} payableMinor={data.payableMinor} currency={currency} />
        <RecentCard businessId={businessId} />
      </div>
    </div>
  );
};
