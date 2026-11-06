import { ArrowRight, Building2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Legend } from "@/components/charts/Legend";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useConsolidated, type Consolidated } from "@/features/analytics/api";
import { ChartCard, FigureTable, StatTile } from "@/features/analytics/parts";
import { PeriodPicker } from "@/features/analytics/PeriodPicker";
import { usePeriod } from "@/features/analytics/period";
import { useMoney } from "@/features/businesses/useMoney";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/dates";
import { useFormatting } from "@/lib/preferences";

// Every business this person can see the money of, side by side, in one currency. The server decides
// which businesses count, converts them with the saved rates, and takes out money moved between them.
export const AllBusinessesPage = () => {
  const { t } = useTranslation(["consolidated", "analytics"]);
  const { business, businesses } = useCurrentBusiness();
  const period = usePeriod(business);
  const currencies = [...new Set(businesses.map((item) => item.baseCurrency))];
  const [currency, setCurrency] = useState<string | undefined>(undefined);
  const data = useConsolidated(period.range, currency);
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("consolidated:title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("consolidated:subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currencies.length > 1 ? (
            <Select aria-label={t("consolidated:currency")} value={currency ?? ""} onChange={(event) => setCurrency(event.target.value || undefined)} className="w-auto">
              <option value="">{t("consolidated:defaultCurrency")}</option>
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          ) : null}
          <PeriodPicker preset={period.preset} range={period.range} onChoose={period.choose} />
        </div>
      </header>

      {data.isError ? <Alert tone="danger">{errorMessage(data.error)}</Alert> : null}
      {!data.data ? (
        data.isLoading ? <Spinner className="mt-16" /> : null
      ) : (
        <Body data={data.data} stale={data.isPlaceholderData} />
      )}
      {data.data && data.data.fxRates.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("consolidated:ratesUsed")}{" "}
          {data.data.fxRates.map((rate) => `1 ${rate.fromCurrency} = ${rate.rate} ${rate.toCurrency}${rate.rateDate ? ` (${formatDate(rate.rateDate, locale, digitStyle)})` : ""}`).join(" · ")}
        </p>
      ) : null}
      {data.data && data.data.eliminatedIntercompanyMinor !== "0" && data.data.reportingCurrency ? (
        <p className="text-xs text-muted-foreground">{t("consolidated:eliminated", { amount: money(data.data.eliminatedIntercompanyMinor, data.data.reportingCurrency) })}</p>
      ) : null}
    </div>
  );
};

const Body = ({ data, stale }: { data: Consolidated; stale: boolean }) => {
  const { t } = useTranslation(["consolidated", "analytics"]);
  const money = useMoney();
  const currency = data.reportingCurrency ?? data.businesses[0]?.currency ?? "BDT";
  const totals = data.totals;
  // Bars are drawn against the largest revenue or expense of any one business.
  const largest = data.businesses.reduce((max, item) => {
    const values = [BigInt(item.converted.revenueMinor), BigInt(item.converted.expensesMinor)];
    return values.reduce((best, value) => (value > best ? value : best), max);
  }, 0n);
  const width = (minor: string) => (largest > 0n ? `${Math.max(0, Number((BigInt(minor) * 1000n) / largest) / 10)}%` : "0%");
  const ranked = [...data.businesses].sort((a, b) => (BigInt(b.converted.revenueMinor) > BigInt(a.converted.revenueMinor) ? 1 : -1));

  return (
    <div className={cn("space-y-6 transition-opacity", stale && "opacity-60")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-foreground bg-foreground p-5 text-background">
          <p className="text-sm text-background/70">{t("analytics:netProfit")}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight" data-testid="all-net-profit">
            {money(totals.netProfitMinor, currency)}
          </p>
          <p className="mt-2 text-xs text-background/70">{t("consolidated:acrossCount", { count: data.businesses.length })}</p>
        </Card>
        <StatTile label={t("analytics:revenue")} value={money(totals.revenueMinor, currency)} />
        <StatTile label={t("analytics:expenses")} value={money(totals.expensesMinor, currency)} />
        <StatTile label={t("consolidated:cash")} value={money(totals.cashBalanceMinor, currency)} />
      </div>

      <ChartCard
        title={t("consolidated:byBusiness")}
        description={t("consolidated:byBusinessHint")}
        legend={
          <Legend
            items={[
              { label: t("analytics:revenue"), color: "var(--chart-1)" },
              { label: t("analytics:expenses"), color: "var(--chart-3)" },
            ]}
          />
        }
        table={
          <FigureTable
            head={[t("consolidated:business"), t("analytics:revenue"), t("analytics:expenses"), t("analytics:netProfit"), t("consolidated:cash")]}
            rows={ranked.map((item) => [
              item.name,
              money(item.converted.revenueMinor, currency),
              money(item.converted.expensesMinor, currency),
              money(item.converted.netProfitMinor, currency),
              money(item.converted.cashBalanceMinor, currency),
            ])}
          />
        }
      >
        <ul className="divide-y">
          {ranked.map((item, index) => (
            <li key={item.businessId}>
              <Link to={`/b/${item.businessId}`} className="group -mx-2 grid gap-3 rounded-md px-2 py-4 transition-colors hover:bg-muted/50 md:grid-cols-[14rem_1fr_9rem] md:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Building2 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.currency}
                      {item.status !== "ACTIVE" ? <Badge className="ml-2">{t(`consolidated:status_${item.status}`, { defaultValue: item.status })}</Badge> : null}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 overflow-hidden rounded-full bg-chart-track">
                    <div className="animate-chart-grow h-full rounded-full bg-chart-1" style={{ width: width(item.converted.revenueMinor), animationDelay: `${index * 60}ms` }} />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-chart-track">
                    <div className="animate-chart-grow h-full rounded-full bg-chart-3" style={{ width: width(item.converted.expensesMinor), animationDelay: `${index * 60 + 30}ms` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 md:justify-end">
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{money(item.converted.netProfitMinor, currency)}</p>
                    <p className="text-xs text-muted-foreground">{t("analytics:netProfit")}</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </ChartCard>
    </div>
  );
};
