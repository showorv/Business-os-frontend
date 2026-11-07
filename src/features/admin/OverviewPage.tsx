import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { RankedBars } from "@/components/charts/Figures";
import { TooltipRow } from "@/components/charts/Tooltip";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/errors";
import { formatCompact, minorToNumber } from "@/lib/money";
import { useFormatting } from "@/lib/preferences";
import { useOverview } from "./api";
import { PageTitle, StatTile, useAdminFormat } from "./parts";

const STATES = ["trial", "active", "granted", "grace", "expired", "free"] as const;

// The platform at a glance: how many accounts are on each plan state, and the money coming in.
export const OverviewPage = () => {
  const { t, i18n } = useTranslation(["admin", "billing"]);
  const { digitStyle, locale } = useFormatting();
  const { money, count } = useAdminFormat();
  const overview = useOverview();
  if (overview.isLoading) return <Spinner className="mt-12" />;
  if (overview.isError) return <Alert tone="danger">{errorMessage(overview.error)}</Alert>;
  const data = overview.data!;
  const months = data.revenue.months;
  const inState = (state: (typeof STATES)[number]) => data.workspaces.byState[state] ?? 0;
  const monthName = (month: string, style: "short" | "long") =>
    new Intl.DateTimeFormat(i18n.language.startsWith("bn") ? "bn-BD" : "en-GB", { month: style, ...(style === "long" ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

  return (
    <div className="space-y-6">
      <PageTitle title={t("overviewTitle")} hint={t("overviewHint")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label={t("mrr")} value={money(data.revenue.mrrMinor)} note={t("mrrNote", { count: data.revenue.payingWorkspaces })} testId="stat-mrr" />
        <StatTile label={t("thisMonth")} value={money(data.revenue.thisMonthMinor)} note={t("thisMonthNote")} testId="stat-month" />
        <StatTile label={t("accounts")} value={count(data.workspaces.total)} note={data.workspaces.suspended > 0 ? t("suspendedCount", { count: data.workspaces.suspended }) : undefined} testId="stat-accounts" />
        <StatTile label={t("people")} value={count(data.users.total)} note={t("newPeople", { count: data.users.last30Days })} />
        <StatTile label={t("state_trial")} value={count(inState("trial"))} />
        <StatTile label={t("state_active")} value={count(inState("active"))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h2 className="font-semibold">{t("revenueTitle")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("revenueHint")}</p>
          <ColumnChart
            label={t("revenueTitle")}
            labels={months.map((row) => monthName(row.month, "short"))}
            titles={months.map((row) => monthName(row.month, "long"))}
            values={months.map((row) => minorToNumber(row.amountMinor))}
            formatAxis={(value) => formatCompact(BigInt(Math.round(value * 100)), "BDT", { digitStyle })}
            describe={(index) => (
              <>
                <TooltipRow label={t("received")} value={money(months[index]!.amountMinor)} />
                <TooltipRow label={t("paymentsCount")} value={months[index]!.payments.toLocaleString(locale)} />
              </>
            )}
          />
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">{t("byState")}</h2>
          <RankedBars
            emptyText={t("none")}
            items={STATES.map((state) => ({ key: state, label: t(`state_${state}`), value: inState(state), display: count(inState(state)) }))}
          />
          <Link to="/admin/workspaces" className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline">
            {t("seeAccounts")}
          </Link>
        </Card>
      </div>
    </div>
  );
};
