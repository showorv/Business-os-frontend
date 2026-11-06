import { CircleCheck, CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Waterfall } from "@/components/charts/Waterfall";
import { Card } from "@/components/ui/card";
import type { BalanceSheet, CashFlow, ProfitAndLoss, ReportLine, TrialBalance } from "@/features/analytics/api";
import { ChartCard, StatTile } from "@/features/analytics/parts";
import { useCompactMoney, useMoney } from "@/features/businesses/useMoney";
import { currentLocale } from "@/i18n";
import { cn } from "@/lib/cn";
import { minorToNumber } from "@/lib/money";
import { formatPercent } from "@/lib/numbers";
import { useFormatting } from "@/lib/preferences";

const lineName = (line: { name: string; nameBn: string | null }) => (currentLocale() === "bn-BD" && line.nameBn ? line.nameBn : line.name);

// "Balanced": the books add up. Shown on every statement that checks itself.
export const BalancedBadge = ({ balanced }: { balanced: boolean }) => {
  const { t } = useTranslation("reports");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", balanced ? "bg-muted text-foreground" : "bg-danger-soft text-danger")}>
      {balanced ? <CircleCheck className="size-3.5" /> : <CircleAlert className="size-3.5" />}
      {balanced ? t("balanced") : t("notBalanced")}
    </span>
  );
};

// One section of a statement: its lines with a thin bar for each one's share, then the total.
const Section = ({ title, items, totalMinor, currency, extra }: { title: string; items: ReportLine[]; totalMinor: string; currency: string; extra?: ReactNode }) => {
  const { t } = useTranslation("reports");
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  // Each line's share of the section's gross size, so mixed signs (money in and out, an overdrawn
  // account) still add up to 100% instead of going past it.
  const size = items.reduce((sum, item) => {
    const amount = BigInt(item.amountMinor);
    return sum + (amount < 0n ? -amount : amount);
  }, 0n);
  return (
    <section className="space-y-1">
      <h3 className="px-1 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {items.length === 0 && !extra ? <p className="px-1 py-2 text-sm text-muted-foreground">{t("nothingHere")}</p> : null}
      {items.map((item) => {
        const amount = BigInt(item.amountMinor);
        const share = size > 0n ? Number(((amount < 0n ? -amount : amount) * 10_000n) / size) / 10_000 : 0;
        return (
          <div key={item.ledgerAccountId} className="group grid grid-cols-[3.5rem_1fr_auto] items-center gap-x-3 rounded-md px-1 py-1.5 text-sm hover:bg-muted/60">
            <span className="text-xs text-muted-foreground tabular-nums">{item.code}</span>
            <div className="min-w-0">
              <p className="truncate">{lineName(item)}</p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-chart-track">
                <div className="animate-chart-grow h-full rounded-full bg-chart-2 group-hover:bg-chart-1" style={{ width: `${Math.min(100, share * 100)}%` }} />
              </div>
            </div>
            <span className="text-right tabular-nums">
              {money(item.amountMinor, currency)}
              <span className="ml-2 hidden w-12 text-xs text-muted-foreground sm:inline-block">{formatPercent(share, locale, digitStyle)}</span>
            </span>
          </div>
        );
      })}
      {extra}
      <div className="flex justify-between border-t px-1 pt-2 text-sm font-semibold">
        <span>{t("totalOf", { name: title })}</span>
        <span className="tabular-nums">{money(totalMinor, currency)}</span>
      </div>
    </section>
  );
};

export const ProfitAndLossView = ({ report }: { report: ProfitAndLoss }) => {
  const { t } = useTranslation("reports");
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const revenue = BigInt(report.revenue.totalMinor);
  const margin = revenue > 0n ? Number((BigInt(report.netProfitMinor) * 10_000n) / revenue) / 10_000 : null;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label={t("revenue")} value={money(report.revenue.totalMinor, report.currency)} />
        <StatTile label={t("expenses")} value={money(report.expenses.totalMinor, report.currency)} />
        <StatTile
          label={BigInt(report.netProfitMinor) < 0n ? t("netLoss") : t("netProfit")}
          value={money(report.netProfitMinor, report.currency)}
          footnote={margin !== null ? t("margin", { value: formatPercent(margin, locale, digitStyle) }) : undefined}
        />
      </div>
      <Card className="space-y-6 p-5">
        <Section title={t("revenue")} items={report.revenue.items} totalMinor={report.revenue.totalMinor} currency={report.currency} />
        <Section title={t("expenses")} items={report.expenses.items} totalMinor={report.expenses.totalMinor} currency={report.currency} />
        <div className="flex justify-between rounded-md bg-foreground px-3 py-3 font-semibold text-background">
          <span>{BigInt(report.netProfitMinor) < 0n ? t("netLoss") : t("netProfit")}</span>
          <span className="tabular-nums" data-testid="report-net-profit">
            {money(report.netProfitMinor, report.currency)}
          </span>
        </div>
      </Card>
    </div>
  );
};

export const BalanceSheetView = ({ report }: { report: BalanceSheet }) => {
  const { t } = useTranslation("reports");
  const money = useMoney();
  const liabilitiesAndEquity = BigInt(report.liabilities.totalMinor) + BigInt(report.equity.totalMinor);
  const assets = BigInt(report.assets.totalMinor);
  const largest = assets > liabilitiesAndEquity ? assets : liabilitiesAndEquity;
  const width = (minor: bigint) => (largest > 0n ? `${Math.max(0, Number((minor * 1000n) / largest) / 10)}%` : "0%");
  return (
    <div className="space-y-4">
      {/* The accounting equation as two bars that should be the same length. */}
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t("equation")}</h2>
          <BalancedBadge balanced={report.balanced} />
        </div>
        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>{t("assets")}</span>
              <span className="font-semibold tabular-nums">{money(report.assets.totalMinor, report.currency)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-chart-track">
              <div className="animate-chart-grow h-full rounded-full bg-chart-1" style={{ width: width(assets) }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>{t("liabilitiesAndEquity")}</span>
              <span className="font-semibold tabular-nums">{money(liabilitiesAndEquity, report.currency)}</span>
            </div>
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-chart-track">
              <div className="animate-chart-grow h-full rounded-l-full bg-chart-2" style={{ width: width(BigInt(report.liabilities.totalMinor)) }} title={t("liabilities")} />
              <div className="animate-chart-grow h-full rounded-r-full bg-chart-3" style={{ width: width(BigInt(report.equity.totalMinor)) }} title={t("equity")} />
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-chart-2" />
                {t("liabilities")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-chart-3" />
                {t("equity")}
              </span>
            </div>
          </div>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <Section title={t("assets")} items={report.assets.items} totalMinor={report.assets.totalMinor} currency={report.currency} />
        </Card>
        <Card className="space-y-6 p-5">
          <Section title={t("liabilities")} items={report.liabilities.items} totalMinor={report.liabilities.totalMinor} currency={report.currency} />
          <Section
            title={t("equity")}
            items={report.equity.items}
            totalMinor={report.equity.totalMinor}
            currency={report.currency}
            extra={
              report.equity.unclosedProfitMinor !== "0" ? (
                <div className="grid grid-cols-[3.5rem_1fr_auto] gap-x-3 px-1 py-1.5 text-sm">
                  <span />
                  <span className="text-muted-foreground">{t("unclosedProfit")}</span>
                  <span className="text-right tabular-nums">{money(report.equity.unclosedProfitMinor, report.currency)}</span>
                </div>
              ) : null
            }
          />
        </Card>
      </div>
    </div>
  );
};

export const CashFlowView = ({ report }: { report: CashFlow }) => {
  const { t } = useTranslation("reports");
  const money = useMoney();
  const compact = useCompactMoney();
  const opening = BigInt(report.beginningCashMinor) + BigInt(report.openingBalancesMinor);
  const steps = [
    { label: t("opening"), value: minorToNumber(report.beginningCashMinor), total: true, display: compact(minorToNumber(report.beginningCashMinor), report.currency) },
    ...(report.openingBalancesMinor !== "0"
      ? [{ label: t("openingBalances"), value: minorToNumber(report.openingBalancesMinor), display: compact(minorToNumber(report.openingBalancesMinor), report.currency) }]
      : []),
    { label: t("operating"), value: minorToNumber(report.operating.totalMinor), display: compact(minorToNumber(report.operating.totalMinor), report.currency) },
    { label: t("investing"), value: minorToNumber(report.investing.totalMinor), display: compact(minorToNumber(report.investing.totalMinor), report.currency) },
    { label: t("financing"), value: minorToNumber(report.financing.totalMinor), display: compact(minorToNumber(report.financing.totalMinor), report.currency) },
    { label: t("closing"), value: minorToNumber(report.endingCashMinor), total: true, display: compact(minorToNumber(report.endingCashMinor), report.currency) },
  ];
  return (
    <div className="space-y-4">
      <ChartCard title={t("cashJourney")} description={t("cashJourneyHint")} action={<BalancedBadge balanced={report.balanced} />}>
        <Waterfall steps={steps} formatAxis={(value) => compact(value, report.currency)} label={t("cashJourney")} />
      </ChartCard>
      <Card className="space-y-6 p-5">
        <div className="flex justify-between px-1 text-sm">
          <span className="text-muted-foreground">{t("opening")}</span>
          <span className="font-semibold tabular-nums">{money(opening, report.currency)}</span>
        </div>
        <Section title={t("operating")} items={report.operating.items} totalMinor={report.operating.totalMinor} currency={report.currency} />
        <Section title={t("investing")} items={report.investing.items} totalMinor={report.investing.totalMinor} currency={report.currency} />
        <Section title={t("financing")} items={report.financing.items} totalMinor={report.financing.totalMinor} currency={report.currency} />
        <div className="flex justify-between rounded-md bg-foreground px-3 py-3 font-semibold text-background">
          <span>{t("closing")}</span>
          <span className="tabular-nums">{money(report.endingCashMinor, report.currency)}</span>
        </div>
      </Card>
    </div>
  );
};

export const TrialBalanceView = ({ report }: { report: TrialBalance }) => {
  const { t } = useTranslation("reports");
  const money = useMoney();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-5 pb-3">
        <h2 className="font-semibold">{t("trialBalance")}</h2>
        <BalancedBadge balanced={report.balanced} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-y bg-muted/50 text-left text-muted-foreground">
              <th className="px-5 py-2 font-medium">{t("code")}</th>
              <th className="px-2 py-2 font-medium">{t("account")}</th>
              <th className="px-2 py-2 text-right font-medium">{t("debit")}</th>
              <th className="px-5 py-2 text-right font-medium">{t("credit")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {report.items.map((item) => (
              <tr key={item.ledgerAccountId} className="hover:bg-muted/40">
                <td className="px-5 py-2 text-muted-foreground tabular-nums">{item.code}</td>
                <td className="px-2 py-2">{lineName(item)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{item.debitBalanceMinor !== "0" ? money(item.debitBalanceMinor, report.currency) : ""}</td>
                <td className="px-5 py-2 text-right tabular-nums">{item.creditBalanceMinor !== "0" ? money(item.creditBalanceMinor, report.currency) : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-foreground font-semibold">
              <td className="px-5 py-3" colSpan={2}>
                {t("total")}
              </td>
              <td className="px-2 py-3 text-right tabular-nums">{money(report.totalDebitMinor, report.currency)}</td>
              <td className="px-5 py-3 text-right tabular-nums">{money(report.totalCreditMinor, report.currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
};
