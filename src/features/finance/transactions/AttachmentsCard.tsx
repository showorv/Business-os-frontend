import { Download, FileText, Paperclip, X } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES, openDocument, useAttachFile, useDetachFile, type TransactionDetail } from "../api";

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} kB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

// Receipts and invoices for a transaction: photos (PNG, JPEG, WebP) or PDFs, up to 25 MB each.
export const AttachmentsCard = ({ businessId, transaction, canChange }: { businessId: string; transaction: TransactionDetail; canChange: boolean }) => {
  const { t } = useTranslation("finance");
  const { locale, digitStyle } = useFormatting();
  const attach = useAttachFile(businessId, transaction.id);
  const detach = useDetachFile(businessId, transaction.id);
  const picker = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    // Checked here first, so a wrong file is refused before anything is sent. The server checks again.
    if (!ATTACHMENT_TYPES.includes(file.type)) return setProblem(t("fileTypeRefused"));
    if (file.size > MAX_ATTACHMENT_BYTES) return setProblem(t("fileTooLarge"));
    setProblem(null);
    attach.mutate(file, { onSuccess: () => toast.success(t("fileAttached", { name: file.name })) });
  };

  const download = (documentId: string) => void openDocument(businessId, documentId).catch((error: unknown) => toast.error(errorMessage(error)));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{t("attachments")}</CardTitle>
          <CardDescription>{t("attachmentsHint")}</CardDescription>
        </div>
        {canChange ? (
          <>
            <Button variant="outline" onClick={() => picker.current?.click()} disabled={attach.isPending} className="shrink-0">
              <Paperclip />
              {attach.isPending ? t("uploading") : t("attachFile")}
            </Button>
            <input ref={picker} type="file" accept={ATTACHMENT_TYPES.join(",")} className="hidden" onChange={choose} data-testid="attachment-input" />
          </>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {problem ? <Alert tone="danger">{problem}</Alert> : null}
        {attach.isError ? <Alert tone="danger">{attach.error.message === "UPLOAD_FAILED" ? t("uploadFailed") : errorMessage(attach.error)}</Alert> : null}
        {detach.isError ? <Alert tone="danger">{errorMessage(detach.error)}</Alert> : null}
        {transaction.attachments.length === 0 ? <p className="text-sm text-muted-foreground">{t("noAttachments")}</p> : null}
        <ul className="divide-y">
          {transaction.attachments.map((file) => (
            <li key={file.documentId} className="flex items-center gap-3 py-2.5">
              <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.sizeBytes)} · {formatDateTime(file.createdAt, locale, digitStyle)}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => download(file.documentId)} aria-label={t("downloadFile", { name: file.fileName })}>
                <Download />
              </Button>
              {canChange ? (
                <Button variant="ghost" size="icon" onClick={() => detach.mutate(file.documentId)} disabled={detach.isPending} aria-label={t("removeFile", { name: file.fileName })}>
                  <X />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
