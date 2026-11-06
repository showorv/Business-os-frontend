import { ArrowRight, CircleAlert, Copy, FilePen, Hourglass, Target } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Meter, ProgressRing } from "@/components/charts/Figures";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBudget, useBudgets, useGoals } from "@/features/analytics/api";
import { useMoney } from "@/features/businesses/useMoney";
import { useTransactions } from "@/features/finance/api";
import { amountSign, StatusBadge } from "@/features/finance/transactions/parts";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { formatCount, formatPercent } from "@/lib/numbers";
import { useFormatting } from "@/lib/preferences";

const SmallCard = ({ title, to, linkText, children }: { title: string; to: string; linkText: string; children: ReactNode }) => (
  <Card className="flex flex-col">
    <div className="flex items-center justify-between gap-2 p-5 pb-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <Button variant="ghost" size="sm" asChild className="-mr-2 text-muted-foreground">
        <Link to={to}>
          {linkText}
          <ArrowRight />
        </Link>
      </Button>
    </div>
    <div className="flex-1 px-5 pb-5">{children}</div>
  </Card>
);

// Active goals as rings, closest to done first.
export const GoalsCard = ({ businessId, currency }: { businessId: string; currency: string }) => {
  const { t } = useTranslation("analytics");
  const goals = useGoals(businessId);
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const active = (goals.data ?? []).filter((goal) => goal.status !== "CANCELLED").slice(0, 3);
  return (
    <SmallCard title={t("goals")} to="goals" linkText={t("seeAll")}>
      {active.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center">
          <Target className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("noGoalsYet")}</p>
          <Button variant="outline" size="sm" asChild>
            <Link to="goals?new=1">{t("setGoal")}</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {active.map((goal) => {
            const percent = Number(goal.progressPercent ?? 0);
            return (
              <li key={goal.id} className="flex items-center gap-4">
                <ProgressRing percent={percent} size={56} stroke={6} label={goal.name}>
                  <span className="text-xs">{formatPercent(Math.min(percent, 999) / 100, locale, digitStyle)}</span>
                </ProgressRing>
                <div className="min-w-0">
                  <p className="truncate font-medium">{goal.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {money(goal.currentMinor, currency)} / {money(goal.targetMinor, currency)}
                  </p>
                  {goal.status === "ACHIEVED" ? <p className="text-xs font-medium">{t("goalAchieved")}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SmallCard>
  );
};

// What's waiting for someone: approvals, drafts, possible duplicates, and budget lines running hot.
export const AttentionCard = ({ businessId, receivableMinor, payableMinor, currency }: { businessId: string; receivableMinor: string; payableMinor: string; currency: string }) => {
  const { t } = useTranslation("analytics");
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const pending = useTransactions(businessId, { status: "PENDING_APPROVAL" });
  const drafts = useTransactions(businessId, { status: "DRAFT" });
  const duplicates = useTransactions(businessId, { possibleDuplicate: "true" });
  const budgets = useBudgets(businessId);
  const firstBudget = budgets.data?.find((budget) => budget.status === "ACTIVE");
  const budget = useBudget(businessId, firstBudget?.id ?? "", Boolean(firstBudget));
  const hot = (budget.data?.lines ?? []).filter((line) => line.level !== "OK").sort((a, b) => Number(b.usedPercent ?? 0) - Number(a.usedPercent ?? 0)).slice(0, 3);

  const count = (list: { data?: unknown[]; hasNextPage: boolean }) => {
    const size = list.data?.length ?? 0;
    return `${formatCount(size, locale, digitStyle)}${list.hasNextPage ? "+" : ""}`;
  };
  const rows = [
    { key: "pending", icon: Hourglass, label: t("waitingApproval"), value: pending.data?.length ?? 0, text: count(pending), to: "transactions?status=PENDING_APPROVAL" },
    { key: "drafts", icon: FilePen, label: t("draftsToPost"), value: drafts.data?.length ?? 0, text: count(drafts), to: "transactions?status=DRAFT" },
    { key: "duplicates", icon: Copy, label: t("possibleDuplicates"), value: duplicates.data?.length ?? 0, text: count(duplicates), to: "transactions?possibleDuplicate=true" },
  ];
  const clear = rows.every((row) => row.value === 0) && hot.length === 0;

  return (
    <SmallCard title={t("needsAttention")} to="transactions" linkText={t("transactions")}>
      <ul className="-mx-2 space-y-0.5">
        {rows.map(({ key, icon: Icon, label, value, text, to }) => (
          <li key={key}>
            <Link to={to} className={cn("flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted", value === 0 && "text-muted-foreground")}>
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{label}</span>
              <span className={cn("min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums", value > 0 ? "bg-foreground text-background" : "bg-muted")}>{text}</span>
            </Link>
          </li>
        ))}
      </ul>
      {hot.length > 0 && firstBudget ? (
        <div className="mt-4 space-y-3 border-t pt-4">
          <Link to={`budgets/${firstBudget.id}`} className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
            <CircleAlert className="size-3.5" />
            {firstBudget.name}
          </Link>
          {hot.map((line) => (
            <div key={line.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="truncate">{locale === "bn-BD" && line.category.nameBn ? line.category.nameBn : line.category.name}</span>
                <span className="tabular-nums">{formatPercent(Number(line.usedPercent ?? 0) / 100, locale, digitStyle)}</span>
              </div>
              <Meter percent={Number(line.usedPercent ?? 0)} tone={line.level === "OVER" ? "over" : "near"} label={line.category.name} />
            </div>
          ))}
        </div>
      ) : null}
      {clear ? <p className="mt-3 text-sm text-muted-foreground">{t("allClear")}</p> : null}
      {receivableMinor !== "0" || payableMinor !== "0" ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
          <div>
            <dt className="text-muted-foreground">{t("receivable")}</dt>
            <dd className="font-semibold">{money(receivableMinor, currency)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("payable")}</dt>
            <dd className="font-semibold">{money(payableMinor, currency)}</dd>
          </div>
        </dl>
      ) : null}
    </SmallCard>
  );
};

export const RecentCard = ({ businessId }: { businessId: string }) => {
  const { t } = useTranslation("analytics");
  const recent = useTransactions(businessId, {});
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const rows = (recent.data ?? []).slice(0, 5);
  return (
    <SmallCard title={t("recentActivity")} to="transactions" linkText={t("seeAll")}>
      <ul className="-mx-2">
        {rows.map((row) => (
          <li key={row.id}>
            <Link to={`transactions/${row.id}`} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.description || row.number}</p>
                <p className="text-xs text-muted-foreground">{formatDate(row.txnDate, locale, digitStyle)}</p>
              </div>
              <div className="text-right">
                <p className={cn("text-sm font-semibold tabular-nums", (row.status === "VOID" || row.status === "REJECTED") && "text-muted-foreground line-through")}>
                  {amountSign(row.type)}
                  {money(row.amountMinor, row.currency)}
                </p>
                {row.status !== "POSTED" ? <StatusBadge status={row.status} className="mt-0.5" /> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </SmallCard>
  );
};
