import { CircleAlert, Download, FileSpreadsheet, FileText, FileType, Loader } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDownloadExport, useExports } from "@/features/analytics/api";
import { useStepUpRetry } from "@/features/auth/useStepUpRetry";
import { errorMessage } from "@/lib/errors";

const ICONS = { PDF: FileText, XLSX: FileSpreadsheet, CSV: FileType } as const;
const REPORT_KEY: Record<string, string> = { PROFIT_AND_LOSS: "pnl", BALANCE_SHEET: "balance", CASH_FLOW: "cash", TRIAL_BALANCE: "trial", ALL_DATA: "allData" };

// Files you asked for. The worker makes each one in the background; the list checks back until done.
export const ExportsCard = ({ businessId }: { businessId: string }) => {
  const { t } = useTranslation("reports");
  const exports = useExports(businessId);
  const download = useDownloadExport(businessId);
  const { run, stepUpModal } = useStepUpRetry();
  const list = exports.data ?? [];
  if (list.length === 0) return null;

  return (
    <Card>
      <div className="p-5 pb-2">
        <h2 className="font-semibold">{t("yourExports")}</h2>
        <p className="text-sm text-muted-foreground">{t("yourExportsHint")}</p>
      </div>
      {download.isError ? <p className="px-5 text-sm text-danger">{errorMessage(download.error)}</p> : null}
      <ul className="divide-y px-2 pb-2">
        {list.map((item) => {
          const Icon = ICONS[item.format as keyof typeof ICONS] ?? FileText;
          const working = item.status === "QUEUED" || item.status === "RUNNING";
          return (
            <li key={item.id} className="flex items-center gap-3 px-3 py-3">
              <Icon className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.fileName ?? t(`name_${REPORT_KEY[item.report] ?? "pnl"}`)}</p>
                <p className="text-xs text-muted-foreground">
                  {t(`name_${REPORT_KEY[item.report] ?? "pnl"}`)} · {item.format === "XLSX" ? "Excel" : item.format}
                </p>
              </div>
              {working ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader className="size-3.5 animate-spin" />
                  {t("making")}
                </span>
              ) : item.status === "FAILED" ? (
                <span className="flex items-center gap-1.5 text-xs text-danger">
                  <CircleAlert className="size-3.5" />
                  {t("failed")}
                </span>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => run(() => download.mutateAsync(item.id))} disabled={download.isPending} aria-label={t("downloadFile", { name: item.fileName ?? item.format })}>
                  <Download />
                  <span className="hidden sm:inline">{t("download")}</span>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {stepUpModal}
    </Card>
  );
};
