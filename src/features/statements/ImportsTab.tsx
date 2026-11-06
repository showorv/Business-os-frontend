import { ArrowRight, ChevronDown, FileSpreadsheet, MoreHorizontal, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { useAccounts } from "@/features/finance/api";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { useDeleteTemplate, useImports, useRenameTemplate, useTemplates, type StatementImport, type Template } from "./api";

const running = (item: StatementImport) => item.status === "QUEUED" || item.status === "RUNNING";

// Every file imported so far, newest first, and the column layouts saved for next time.
export const ImportsTab = ({ businessId, canWrite }: { businessId: string; canWrite: boolean }) => {
  const { t } = useTranslation("statements");
  const imports = useImports(businessId);
  const accounts = useAccounts(businessId);
  const list = imports.data?.items ?? [];
  const accountName = (id: string) => accounts.data?.find((account) => account.id === id)?.name ?? "";

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="imports-heading">
        <h2 id="imports-heading" className="font-semibold">
          {t("importHistory")}
        </h2>
        {imports.isError ? <Alert tone="danger">{errorMessage(imports.error)}</Alert> : null}
        {imports.isLoading ? <Spinner className="mt-8" /> : null}
        {imports.isSuccess && list.length === 0 ? (
          <Card>
            <EmptyState
              icon={FileSpreadsheet}
              title={t("noImports")}
              body={t("noImportsHint")}
              action={
                canWrite ? (
                  <Button asChild>
                    <Link to="import">
                      <Upload />
                      {t("importStatement")}
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : null}
        {list.length > 0 ? (
          <Card className="overflow-hidden">
            <ul className="divide-y">
              {list.map((item) => (
                <ImportRow key={item.id} item={item} accountName={accountName(item.financialAccountId)} />
              ))}
            </ul>
          </Card>
        ) : null}
      </section>

      <Templates businessId={businessId} canWrite={canWrite} />
    </div>
  );
};

const ImportRow = ({ item, accountName }: { item: StatementImport; accountName: string }) => {
  const { t } = useTranslation(["statements", "errors"]);
  const { locale, digitStyle } = useFormatting();
  const [open, setOpen] = useState(false);
  const number = (value: number) => value.toLocaleString(locale);
  const counts = [
    t("newLines", { count: item.newLines, n: number(item.newLines) }),
    item.duplicateRows ? t("duplicateRows", { count: item.duplicateRows, n: number(item.duplicateRows) }) : null,
    item.failedRows ? t("failedRows", { count: item.failedRows, n: number(item.failedRows) }) : null,
    item.balanceBreaks ? t("balanceBreaks", { count: item.balanceBreaks, n: number(item.balanceBreaks) }) : null,
  ].filter(Boolean);

  return (
    <li className="px-4 py-4 sm:px-5" data-testid="import-row">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", running(item) ? "bg-foreground text-background" : "bg-muted")}>
          {running(item) ? <Spinner className="size-4 text-background" /> : <FileSpreadsheet className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{accountName}</p>
            <Badge className={cn(item.status === "FAILED" && "bg-danger-soft text-danger", running(item) && "bg-foreground text-background")}>{t(`import_${item.status}`)}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatDate(item.createdAt.slice(0, 10), locale, digitStyle)}
            {item.status === "COMPLETED" ? ` · ${counts.join(" · ")}` : ""}
          </p>
          {item.status === "FAILED" && item.errorCode ? <p className="mt-0.5 text-sm text-danger">{t(`errors:${item.errorCode}`, { defaultValue: t("errors:UNKNOWN") })}</p> : null}
        </div>
        {item.status === "COMPLETED" && item.newLines > 0 ? (
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link to={`?tab=inbox&status=UNMATCHED&import=${item.id}`}>
              <span className="hidden sm:inline">{t("reviewLines")}</span>
              <ArrowRight />
            </Link>
          </Button>
        ) : null}
      </div>
      {item.rowErrors.length > 0 ? (
        <div className="mt-2 pl-[3.25rem] sm:pl-14">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {t("rowProblems", { count: item.rowErrors.length, n: number(item.rowErrors.length) })}
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
          </button>
          {open ? (
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md bg-muted/60 p-3 text-sm">
              {item.rowErrors.map((error) => (
                <li key={`${error.row}-${error.code}`} className="flex gap-3">
                  <span className="w-16 shrink-0 font-mono text-xs leading-5 text-muted-foreground">{t("rowN", { n: number(error.row) })}</span>
                  <span>{t(`rowError_${error.code}`, { defaultValue: error.code })}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  );
};

// A saved layout says which column holds what, for one bank's files.
const Templates = ({ businessId, canWrite }: { businessId: string; canWrite: boolean }) => {
  const { t } = useTranslation("statements");
  const { locale, digitStyle } = useFormatting();
  const templates = useTemplates(businessId);
  const remove = useDeleteTemplate(businessId);
  const [renaming, setRenaming] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState<Template | null>(null);
  const list = templates.data ?? [];
  if (templates.isSuccess && list.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="formats-heading">
      <div>
        <h2 id="formats-heading" className="font-semibold">
          {t("savedFormats")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("savedFormatsHint")}</p>
      </div>
      {templates.isError ? <Alert tone="danger">{errorMessage(templates.error)}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((template) => {
          const mapping = template.mapping as Record<string, string | number | undefined>;
          const columns = [mapping.dateColumn, mapping.amountColumn ?? [mapping.debitColumn, mapping.creditColumn].filter(Boolean).join(" / "), mapping.descriptionColumn].filter(Boolean);
          return (
            <Card key={template.id} className="flex min-w-0 items-start gap-3 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileSpreadsheet className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{template.name}</p>
                <p className="truncate text-sm text-muted-foreground">{columns.join(" · ")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {String(mapping.dateFormat ?? "")} · {t("savedOn", { date: formatDate(template.createdAt.slice(0, 10), locale, digitStyle) })}
                </p>
              </div>
              {canWrite ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="-mt-1 -mr-1 size-8" aria-label={t("formatOptions", { name: template.name })}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setRenaming(template)}>{t("rename")}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDeleting(template)} className="text-danger">
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </Card>
          );
        })}
      </div>
      {renaming ? <RenameDialog businessId={businessId} template={renaming} onClose={() => setRenaming(null)} /> : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteFormatTitle", { name: deleting?.name ?? "" })}
        description={t("deleteFormatBody")}
        confirmLabel={t("delete")}
        danger
        pending={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null);
              toast.success(t("formatDeleted"));
            },
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      />
    </section>
  );
};

const RenameDialog = ({ businessId, template, onClose }: { businessId: string; template: Template; onClose: () => void }) => {
  const { t } = useTranslation(["statements", "common"]);
  const rename = useRenameTemplate(businessId);
  const [name, setName] = useState(template.name);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    rename.mutate({ templateId: template.id, name: name.trim() }, { onSuccess: () => (toast.success(t("statements:formatSaved")), onClose()) });
  };
  return (
    <Modal open onOpenChange={(next) => !next && onClose()}>
      <ModalContent title={t("statements:renameFormat")}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {rename.isError ? <Alert tone="danger">{errorMessage(rename.error)}</Alert> : null}
          <Field label={t("statements:formatName")}>
            <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={!name.trim() || rename.isPending}>
              {t("common:save")}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
