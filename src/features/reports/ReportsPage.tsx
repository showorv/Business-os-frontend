import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useBalanceSheet, useCashFlow, useCreateExport, useProfitAndLoss, useTrialBalance, type NewExport } from "@/features/analytics/api";
import { PeriodPicker } from "@/features/analytics/PeriodPicker";
import { usePeriod } from "@/features/analytics/period";
import { useStepUpRetry } from "@/features/auth/useStepUpRetry";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { cn } from "@/lib/cn";
import { todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { lastDayOf } from "@/lib/months";
import { ExportsCard } from "./ExportsCard";
import { BalanceSheetView, CashFlowView, ProfitAndLossView, TrialBalanceView } from "./Statements";

export const REPORTS = ["pnl", "balance", "cash", "trial"] as const;
type ReportKey = (typeof REPORTS)[number];
const EXPORT_NAME: Record<ReportKey, NewExport["report"]> = { pnl: "PROFIT_AND_LOSS", balance: "BALANCE_SHEET", cash: "CASH_FLOW", trial: "TRIAL_BALANCE" };
// Two reports are a picture at one date; the other two cover a period.
const AT_A_DATE = new Set<ReportKey>(["balance", "trial"]);

export const ReportsPage = () => {
  const { t } = useTranslation(["reports", "shell"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const [params, setParams] = useSearchParams();
  const period = usePeriod(business);
  const report: ReportKey = REPORTS.includes(params.get("report") as ReportKey) ? (params.get("report") as ReportKey) : "pnl";
  const today = todayIn(business?.timezone ?? "Asia/Dhaka");
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(params.get("asOf") ?? "") ? params.get("asOf")! : today;
  const range = { from: `${period.range.fromMonth}-01`, to: lastDayOf(period.range.toMonth) < today ? lastDayOf(period.range.toMonth) : today };
  const create = useCreateExport(businessId);
  const { run, stepUpModal } = useStepUpRetry();

  const set = (key: string, value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set(key, value);
        return next;
      },
      { replace: true },
    );

  const exportAs = (format: NewExport["format"]) =>
    run(() =>
      create
        .mutateAsync({ report: EXPORT_NAME[report], format, ...(AT_A_DATE.has(report) ? { asOf } : range) })
        .then(() => toast.success(t("reports:exportQueued"))),
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("shell:reports")}</h1>
          <p className="mt-1 text-muted-foreground">{t("reports:subtitle")}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={create.isPending}>
              <Download />
              {t("reports:export")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t(`reports:name_${report}`)}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => exportAs("PDF")}>
              <FileText className="size-4" />
              PDF
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportAs("XLSX")}>
              <FileSpreadsheet className="size-4" />
              Excel
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportAs("CSV")}>
              <FileType className="size-4" />
              CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* The four statements as tabs, then the dates that apply to the one open. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t("shell:reports")} className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {REPORTS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={report === key}
              onClick={() => set("report", key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                report === key ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
              )}
            >
              {t(`reports:name_${key}`)}
            </button>
          ))}
        </div>
        {AT_A_DATE.has(report) ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            {t("reports:asOf")}
            <Input type="date" value={asOf} max={today} onChange={(event) => event.target.value && set("asOf", event.target.value)} className="h-10 w-auto" />
          </label>
        ) : (
          <PeriodPicker preset={period.preset} range={period.range} onChoose={period.choose} />
        )}
      </div>

      {create.isError && !create.isPending ? <Alert tone="danger">{errorMessage(create.error)}</Alert> : null}

      {report === "pnl" ? <PnlTab businessId={businessId} range={range} /> : null}
      {report === "balance" ? <BalanceTab businessId={businessId} asOf={asOf} /> : null}
      {report === "cash" ? <CashTab businessId={businessId} range={range} /> : null}
      {report === "trial" ? <TrialTab businessId={businessId} asOf={asOf} /> : null}

      <ExportsCard businessId={businessId} />
      {stepUpModal}
    </div>
  );
};

// Each tab loads only its own report. While new dates load, the last answer stays, faded.
const Loaded = <T,>({ query, children }: { query: { data?: T; error: Error | null; isPlaceholderData: boolean }; children: (data: T) => React.ReactNode }) => {
  if (query.error) return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  if (!query.data) return <Spinner className="mt-12" />;
  return <div className={cn("transition-opacity", query.isPlaceholderData && "opacity-50")}>{children(query.data)}</div>;
};

const PnlTab = ({ businessId, range }: { businessId: string; range: { from: string; to: string } }) => (
  <Loaded query={useProfitAndLoss(businessId, range)}>{(data) => <ProfitAndLossView report={data} />}</Loaded>
);
const BalanceTab = ({ businessId, asOf }: { businessId: string; asOf: string }) => (
  <Loaded query={useBalanceSheet(businessId, asOf)}>{(data) => <BalanceSheetView report={data} />}</Loaded>
);
const CashTab = ({ businessId, range }: { businessId: string; range: { from: string; to: string } }) => (
  <Loaded query={useCashFlow(businessId, range)}>{(data) => <CashFlowView report={data} />}</Loaded>
);
const TrialTab = ({ businessId, asOf }: { businessId: string; asOf: string }) => (
  <Loaded query={useTrialBalance(businessId, asOf)}>{(data) => <TrialBalanceView report={data} />}</Loaded>
);
