import { Download, FileImage, FileSpreadsheet, FileText, MoreHorizontal, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { openDocument } from "@/features/finance/api";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { DOCUMENT_TYPES, isReading, useDeleteDocument, useDocuments, useDocumentSearch, useReindexDocument, type Document, type DocumentType, type SearchHit } from "./api";
import { UploadDialog } from "./UploadDialog";

// A picture, sheet or page icon, from the file's type.
export const FileIcon = ({ mime, className }: { mime: string; className?: string }) => {
  if (mime.startsWith("image/")) return <FileImage className={className} />;
  if (mime.includes("csv") || mime.includes("spreadsheet")) return <FileSpreadsheet className={className} />;
  return <FileText className={className} />;
};

export const formatBytes = (bytes: number | string, locale: string) => {
  const value = Number(bytes);
  const [amount, unit] = value >= 1024 * 1024 ? [value / 1024 / 1024, "MB"] : value >= 1024 ? [value / 1024, "KB"] : [value, "B"];
  return `${amount.toLocaleString(locale, { maximumFractionDigits: amount < 10 && unit !== "B" ? 1 : 0 })} ${unit}`;
};

// Waits until typing pauses, so search doesn't run on every key.
const useSettled = (value: string, ms = 300) => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
};

// Invoices, receipts, contracts and notes, searchable by meaning and by exact words, in English or Bangla.
export const DocumentsPage = () => {
  const { t } = useTranslation(["documents", "shell"]);
  const businessId = useParams().businessId!;
  const access = useAccess(businessId);
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get("q") ?? "");
  const query = useSettled(text.trim());
  const type = (DOCUMENT_TYPES as readonly string[]).includes(params.get("type") ?? "") ? (params.get("type") as DocumentType) : null;
  const [uploading, setUploading] = useState(false);
  const documents = useDocuments(businessId, type);
  const searching = query.length >= 2;

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (query) next.set("q", query);
    else next.delete("q");
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [query, params, setParams]);

  if (access.isLoading) return <Spinner className="mt-16" />;
  const canWrite = access.can(Permission.DOCUMENTS_WRITE) && access.writable;
  const setType = (value: DocumentType | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set("type", value);
    else next.delete("type");
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("shell:documents")}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{t("documents:subtitle")}</p>
        </div>
        {canWrite ? (
          <Button onClick={() => setUploading(true)}>
            <Upload />
            {t("documents:upload")}
          </Button>
        ) : null}
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && setText("")}
          placeholder={t("documents:searchPlaceholder")}
          aria-label={t("documents:search")}
          className="h-14 w-full rounded-xl border bg-surface pr-12 pl-12 text-base shadow-xs outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:shadow-md [&::-webkit-search-cancel-button]:hidden"
        />
        {text ? (
          <button type="button" onClick={() => setText("")} aria-label={t("documents:clearSearch")} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {searching ? (
        <SearchResults businessId={businessId} query={query} />
      ) : (
        <>
          <div role="radiogroup" aria-label={t("documents:type")} className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {[null, ...DOCUMENT_TYPES].map((value) => (
              <button
                key={value ?? "all"}
                type="button"
                role="radio"
                aria-checked={type === value}
                onClick={() => setType(value)}
                className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", type === value ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}
              >
                {value ? t(`documents:type_${value}`) : t("documents:all")}
              </button>
            ))}
          </div>
          {documents.isError ? <Alert tone="danger">{errorMessage(documents.error)}</Alert> : null}
          {documents.isLoading ? <Spinner className="mt-12" /> : null}
          {documents.isSuccess && documents.data.length === 0 ? (
            <Card>
              <EmptyState
                icon={FileText}
                title={type ? t("documents:noneOfType") : t("documents:none")}
                body={t("documents:noneHint")}
                action={
                  canWrite ? (
                    <Button onClick={() => setUploading(true)}>
                      <Upload />
                      {t("documents:upload")}
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : null}
          {documents.data && documents.data.length > 0 ? (
            <Card className="overflow-hidden">
              <ul className="divide-y">
                {documents.data.map((document) => (
                  <DocumentRow key={document.id} businessId={businessId} document={document} canWrite={canWrite} />
                ))}
              </ul>
            </Card>
          ) : null}
          {documents.hasNextPage ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => void documents.fetchNextPage()} disabled={documents.isFetchingNextPage}>
                {t("documents:loadMore")}
              </Button>
            </div>
          ) : null}
        </>
      )}

      {uploading ? <UploadDialog businessId={businessId} onClose={() => setUploading(false)} /> : null}
    </div>
  );
};

const ReadStatus = ({ document }: { document: Document }) => {
  const { t } = useTranslation("documents");
  if (document.type === "STATEMENT") return <Badge className="border bg-transparent">{t("status_STORED")}</Badge>;
  if (isReading(document))
    return (
      <Badge className="gap-1 border bg-transparent">
        <RefreshCw className="size-3 animate-spin" />
        {t("status_READING")}
      </Badge>
    );
  if (document.ingestStatus === "READY") return <Badge className="bg-foreground text-background">{t("status_READY")}</Badge>;
  if (document.ingestStatus === "NO_TEXT") return <Badge>{t("status_NO_TEXT")}</Badge>;
  return <Badge className="border-danger/40 border bg-transparent text-danger">{t("status_FAILED")}</Badge>;
};

const DocumentRow = ({ businessId, document, canWrite }: { businessId: string; document: Document; canWrite: boolean }) => {
  const { t } = useTranslation(["documents", "common"]);
  const { locale, digitStyle } = useFormatting();
  const remove = useDeleteDocument(businessId);
  const reindex = useReindexDocument(businessId);
  const [deleting, setDeleting] = useState(false);

  return (
    <li className="group flex items-center gap-3 px-4 py-3 sm:px-5" data-testid="document-row">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileIcon mime={document.mime} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => void openDocument(businessId, document.id)} className="block max-w-full truncate text-left font-medium hover:underline">
          {document.fileName}
        </button>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
          <span>{t(`documents:type_${document.type}`, { defaultValue: document.type })}</span>
          <span>· {formatBytes(document.sizeBytes, locale)}</span>
          <span className="hidden sm:inline">· {formatRelative(document.createdAt, locale, digitStyle)}</span>
        </p>
      </div>
      <span className="shrink-0">
        <ReadStatus document={document} />
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("documents:options", { name: document.fileName })}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void openDocument(businessId, document.id)}>
            <Download className="size-4" />
            {t("documents:download")}
          </DropdownMenuItem>
          {canWrite && document.type !== "STATEMENT" && !isReading(document) ? (
            <DropdownMenuItem onSelect={() => reindex.mutate(document.id, { onSuccess: () => toast.success(t("documents:readingAgain")), onError: (error) => toast.error(errorMessage(error)) })}>
              <RefreshCw className="size-4" />
              {t("documents:readAgain")}
            </DropdownMenuItem>
          ) : null}
          {canWrite ? (
            <DropdownMenuItem className="text-danger" onSelect={() => setDeleting(true)}>
              <Trash2 className="size-4" />
              {t("documents:delete")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("documents:deleteTitle", { name: document.fileName })}
        description={t("documents:deleteHint")}
        confirmLabel={t("documents:delete")}
        danger
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(document.id, {
            onSuccess: () => {
              setDeleting(false);
              toast.success(t("documents:deleted"));
            },
            onError: (error) => {
              setDeleting(false);
              toast.error(errorMessage(error));
            },
          })
        }
      />
    </li>
  );
};

// Puts the searched words in bold inside a passage.
const Highlight = ({ text, query }: { text: string; query: string }) => {
  const words = query
    .split(/\s+/)
    .filter((word) => word.length >= 2)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${words.join("|")})`, "gi");
  return (
    <>
      {text.split(pattern).map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="rounded-sm bg-foreground/10 px-0.5 font-semibold text-foreground">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
};

const SearchResults = ({ businessId, query }: { businessId: string; query: string }) => {
  const { t } = useTranslation("documents");
  const { locale } = useFormatting();
  const results = useDocumentSearch(businessId, query);
  const hits = results.data ?? [];
  const best = Math.max(...hits.map((hit) => hit.score), 0.0001);

  return (
    <section aria-label={t("results")} className="space-y-3">
      {results.isError ? <Alert tone="danger">{errorMessage(results.error)}</Alert> : null}
      {results.isLoading ? <Spinner className="mt-8" /> : null}
      {results.isSuccess ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {hits.length ? t("resultCount", { count: hits.length, query }) : t("noResults", { query })}
        </p>
      ) : null}
      {results.isSuccess && hits.length === 0 ? (
        <Card>
          <EmptyState icon={Search} title={t("nothingFound")} body={t("nothingFoundHint")} />
        </Card>
      ) : null}
      <ul className={cn("space-y-3 transition-opacity", results.isFetching && "opacity-60")}>
        {hits.map((hit: SearchHit) => {
          const mime = /\.(png|jpe?g|webp)$/i.test(hit.fileName) ? "image/" : "application/pdf";
          return (
            <li key={`${hit.documentId}-${hit.page}-${hit.content.slice(0, 20)}`}>
              <button
                type="button"
                onClick={() => void openDocument(businessId, hit.documentId)}
                className="block w-full rounded-xl border bg-surface p-4 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-foreground"
                data-testid="search-hit"
              >
                <span className="flex items-center gap-2 text-sm">
                  <FileIcon mime={mime} className="size-4 shrink-0" />
                  <span className="truncate font-medium">{hit.fileName}</span>
                  <span className="shrink-0 text-muted-foreground">· {t("pageN", { n: hit.page.toLocaleString(locale) })}</span>
                  <span className="ml-auto hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted sm:block" title={t("match")}>
                    <span className="block h-full rounded-full bg-foreground" style={{ width: `${Math.max(12, (hit.score / best) * 100)}%` }} />
                  </span>
                </span>
                {hit.heading ? <span className="mt-2 block text-sm font-semibold">{hit.heading}</span> : null}
                <span className="mt-1 line-clamp-3 block text-sm text-muted-foreground">
                  <Highlight text={hit.content} query={query} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
