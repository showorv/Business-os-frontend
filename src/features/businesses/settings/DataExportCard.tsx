import { Download, Loader } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDownloadExport, useExports, useRequestDataExport } from "@/features/analytics/api";
import { useStepUpRetry } from "@/features/auth/useStepUpRetry";
import { formatDateTime } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";

// Owners and admins can take everything with them at any time, on any plan.
export const DataExportCard = ({ businessId }: { businessId: string }) => {
  const { t } = useTranslation("businesses");
  const { locale, digitStyle } = useFormatting();
  const exports = useExports(businessId);
  const request = useRequestDataExport(businessId);
  const download = useDownloadExport(businessId);
  const { run, stepUpModal } = useStepUpRetry();
  // The newest whole-business export, if any.
  const latest = (exports.data ?? []).find((item) => item.report === "ALL_DATA");
  const working = latest?.status === "QUEUED" || latest?.status === "RUNNING";
  const error = request.error ?? download.error;

  return (
    <Card data-testid="data-export">
      <CardHeader>
        <CardTitle>{t("dataTitle")}</CardTitle>
        <CardDescription>{t("dataHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <Alert tone="danger">{errorMessage(error)}</Alert> : null}
        {latest ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{latest.fileName ?? t("dataMaking")}</p>
              <p className="text-xs text-muted-foreground">{t("dataAsked", { when: formatDateTime(latest.createdAt, locale, digitStyle) })}</p>
            </div>
            {working ? (
              <span className="flex items-center gap-1.5 text-muted-foreground" data-testid="data-export-status">
                <Loader className="size-4 animate-spin" />
                {t("dataMaking")}
              </span>
            ) : latest.status === "FAILED" ? (
              <span className="text-danger" data-testid="data-export-status">
                {t("dataFailed")}
              </span>
            ) : (
              <Button variant="outline" size="sm" onClick={() => run(() => download.mutateAsync(latest.id))} disabled={download.isPending}>
                <Download />
                {t("dataDownload")}
              </Button>
            )}
          </div>
        ) : null}
        <Button onClick={() => run(() => request.mutateAsync())} disabled={request.isPending || working}>
          {latest ? t("dataAgain") : t("dataRequest")}
        </Button>
        {stepUpModal}
      </CardContent>
    </Card>
  );
};
