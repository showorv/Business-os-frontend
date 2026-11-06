import { CalendarPlus, Info, Lock, LockOpen, MoreHorizontal, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { useStepUpRetry } from "@/features/auth/useStepUpRetry";
import type { Business, useAccess } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { cn } from "@/lib/cn";
import { todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { formatMonth } from "@/lib/months";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { useChangePeriodStatus, useCloseYear, useOpenYear, usePeriods, type FiscalPeriod, type PeriodStatus } from "./api";

const STATUS_ICON = { OPEN: LockOpen, SOFT_CLOSED: Lock, CLOSED: ShieldCheck } as const;
// Open is light, locked is mid-grey, closed is solid: the strip reads like a progress bar.
const STATUS_FILL = { OPEN: "bg-chart-track", SOFT_CLOSED: "bg-chart-3", CLOSED: "bg-chart-1" } as const;

type Pending = { kind: "status"; period: FiscalPeriod; status: PeriodStatus } | { kind: "year"; year: number } | null;

// The year's months and how far each is from final: open, locked, closed for good.
export const MonthsTab = ({ businessId, business, access }: { businessId: string; business: Business; access: ReturnType<typeof useAccess> }) => {
  const { t } = useTranslation("ledger");
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const periods = usePeriods(businessId);
  const changeStatus = useChangePeriodStatus(businessId);
  const closeYear = useCloseYear(businessId);
  const openYear = useOpenYear(businessId);
  const { run, stepUpModal } = useStepUpRetry();
  const [chosenYear, setChosenYear] = useState<number | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  if (periods.isError) return <Alert tone="danger">{errorMessage(periods.error)}</Alert>;
  if (!periods.data) return <Spinner className="mt-12" />;

  const today = todayIn(business.timezone);
  const years = [...new Set(periods.data.map((period) => period.fiscalYear))].sort((a, b) => b - a);
  const current = periods.data.find((period) => period.startDate <= today && period.endDate >= today)?.fiscalYear;
  const latest = years[0];
  const year = chosenYear ?? current ?? latest;
  // Every business is made with its first year, so this only shows while data is missing.
  if (latest === undefined || year === undefined) return <Spinner className="mt-12" />;
  const months = periods.data.filter((period) => period.fiscalYear === year);
  const counts = { OPEN: 0, SOFT_CLOSED: 0, CLOSED: 0 };
  for (const month of months) counts[month.status]++;
  const canClose = access.can(Permission.PERIOD_CLOSE) && access.writable;
  const canReopen = access.can(Permission.BUSINESS_MANAGE) && access.writable;
  const yearDone = months.length > 0 && counts.CLOSED === months.length;
  const yearLabel = (value: number) => (business.fiscalYearStartMonth === 1 ? String(value) : `${value}–${String(value + 1).slice(2)}`);
  const monthName = (period: FiscalPeriod) => formatMonth(period.startDate.slice(0, 7), locale, digitStyle, "long");
  const error = changeStatus.error ?? closeYear.error ?? openYear.error;

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === "status") {
      const { period, status } = pending;
      run(() =>
        changeStatus.mutateAsync(
          { periodId: period.id, status },
          {
            onSuccess: () => {
              setPending(null);
              toast.success(t("statusChanged", { month: monthName(period), status: t(`status_${status}`) }));
            },
          },
        ),
      );
    } else {
      run(() =>
        closeYear.mutateAsync(pending.year, {
          onSuccess: (result) => {
            setPending(null);
            toast.success(
              result.closingEntryNo
                ? t("yearClosed", { year: yearLabel(result.fiscalYear), amount: money(result.netProfitMinor, business.baseCurrency) })
                : t("yearClosedNoEntry", { year: yearLabel(result.fiscalYear) }),
            );
          },
        }),
      );
    }
  };

  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{errorMessage(error)}</Alert> : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div role="radiogroup" aria-label={t("year")} className="flex flex-wrap gap-1">
              {years.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={value === year}
                  onClick={() => setChosenYear(value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
                    value === year ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {t("fiscalYearShort", { year: yearLabel(value) })}
                </button>
              ))}
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{t("fiscalYear", { year: yearLabel(year) })}</h2>
            <p className="text-sm text-muted-foreground">{t("monthsSummary", { open: counts.OPEN, locked: counts.SOFT_CLOSED, closed: counts.CLOSED })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canClose && year === latest ? (
              <Button variant="outline" onClick={() => openYear.mutate(latest + 1, { onSuccess: () => toast.success(t("yearOpened", { year: yearLabel(latest + 1) })) })} disabled={openYear.isPending}>
                <CalendarPlus />
                {t("openYear", { year: yearLabel(latest + 1) })}
              </Button>
            ) : null}
            {canClose && !yearDone ? (
              <Button
                variant={counts.OPEN > 0 ? "outline" : "primary"}
                onClick={() => setPending({ kind: "year", year })}
                disabled={counts.OPEN > 0}
                title={counts.OPEN > 0 ? t("closeYearNeedsLocked") : undefined}
              >
                <ShieldCheck />
                {t("closeYear")}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Twelve segments, one per month, filling in as months are locked and closed. */}
        <div className="mt-5 grid grid-cols-12 gap-1" aria-hidden>
          {months.map((month, index) => (
            <div key={month.id} className="flex flex-col items-center gap-1.5">
              <div className={cn("animate-chart-grow h-2 w-full rounded-full", STATUS_FILL[month.status], month.status === "OPEN" && "border")} style={{ animationDelay: `${index * 30}ms` }} />
              {/* A dot under the month we're in now. */}
              <span className={cn("size-1.5 rounded-full", month.startDate <= today && month.endDate >= today ? "bg-foreground" : "bg-transparent")} />
            </div>
          ))}
        </div>
        {canClose && counts.OPEN > 0 && !yearDone ? <p className="mt-3 text-xs text-muted-foreground">{t("closeYearNeedsLocked")}</p> : null}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {months.map((period, index) => {
          const Icon = STATUS_ICON[period.status];
          const isNow = period.startDate <= today && period.endDate >= today;
          const isLast = index === months.length - 1;
          const actions: { status: PeriodStatus; label: string }[] = [];
          if (canClose && period.status === "OPEN") actions.push({ status: "SOFT_CLOSED", label: t("lock") });
          if (canReopen && period.status === "SOFT_CLOSED") actions.push({ status: "OPEN", label: t("reopen") });
          if (canClose && period.status !== "CLOSED" && !isLast) actions.push({ status: "CLOSED", label: t("close") });
          return (
            <Card
              key={period.id}
              data-testid={`month-${period.startDate.slice(0, 7)}`}
              className={cn(
                "relative flex flex-col gap-3 p-4 transition-colors",
                period.status === "CLOSED" && "bg-muted/50",
                isNow && "border-foreground/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {/* The short name on phones, so "September 2026" never gets cut. */}
                    <span className="sm:hidden">{formatMonth(period.startDate.slice(0, 7), locale, digitStyle, "medium")}</span>
                    <span className="hidden sm:inline">{monthName(period)}</span>
                  </p>
                  {isNow ? (
                    <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-foreground" />
                      {t("thisMonth")}
                    </p>
                  ) : null}
                </div>
                {actions.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mt-1.5 -mr-1.5 size-8" aria-label={t("monthOptions", { month: monthName(period) })}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.map((action) => (
                        <DropdownMenuItem key={action.status} onSelect={() => setPending({ kind: "status", period, status: action.status })}>
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
              <div className="mt-auto flex items-center gap-1.5 text-sm">
                <span className={cn("flex size-6 items-center justify-center rounded-full", period.status === "CLOSED" ? "bg-foreground text-background" : "bg-muted")}>
                  <Icon className="size-3.5" />
                </span>
                <span className={cn(period.status === "OPEN" ? "text-muted-foreground" : "font-medium")}>{t(`status_${period.status}`)}</span>
              </div>
              {isLast && period.status !== "CLOSED" ? <p className="text-xs text-muted-foreground">{t("lastMonthHint")}</p> : null}
            </Card>
          );
        })}
      </div>

      <Card className="flex gap-3 p-5 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="space-y-2">
          <p className="font-medium">{t("howMonthsWork")}</p>
          <p className="text-muted-foreground">{t("howMonthsWorkBody")}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-muted-foreground">
            {(["OPEN", "SOFT_CLOSED", "CLOSED"] as const).map((status) => (
              <li key={status} className="flex items-center gap-2">
                <span className={cn("h-2 w-5 rounded-full", STATUS_FILL[status], status === "OPEN" && "border")} />
                <span>
                  <span className="font-medium text-foreground">{t(`status_${status}`)}</span> · {t(`statusHint_${status}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending?.kind === "year"
            ? t("closeYearTitle", { year: yearLabel(pending.year) })
            : pending?.status === "CLOSED"
              ? t("closeTitle", { month: monthName(pending.period) })
              : pending?.status === "SOFT_CLOSED"
                ? t("lockTitle", { month: pending ? monthName(pending.period) : "" })
                : pending
                  ? `${t("reopen")}: ${monthName(pending.period)}`
                  : ""
        }
        description={
          pending?.kind === "year" ? t("closeYearBody") : pending?.status === "CLOSED" ? t("closeBody") : pending?.status === "SOFT_CLOSED" ? t("lockBody") : t("statusHint_OPEN")
        }
        confirmLabel={pending?.kind === "year" ? t("closeYear") : pending?.status === "CLOSED" ? t("close") : pending?.status === "SOFT_CLOSED" ? t("lock") : t("reopen")}
        danger={pending?.kind === "year" || (pending?.kind === "status" && pending.status === "CLOSED")}
        pending={changeStatus.isPending || closeYear.isPending}
        onConfirm={confirm}
      />
      {stepUpModal}
    </div>
  );
};
