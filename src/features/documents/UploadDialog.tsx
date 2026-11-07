import { CheckCircle2, CircleAlert, UploadCloud, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, UPLOAD_TYPES, useUploadDocument, type DocumentType } from "./api";
import { FileIcon, formatBytes } from "./DocumentsPage";

interface Item {
  key: string;
  file: File;
  type: DocumentType;
  state: "waiting" | "uploading" | "done" | "failed";
  problem?: string;
}

// A sensible kind from the file itself; it can be changed before uploading.
const guessType = (file: File): DocumentType => {
  const name = file.name.toLowerCase();
  if (file.type === "text/csv" || file.type.includes("spreadsheet")) return "STATEMENT";
  if (/contract|agreement|lease|চুক্তি/.test(name)) return "CONTRACT";
  if (/policy|নীতি/.test(name)) return "POLICY";
  if (/receipt|রসিদ/.test(name) || file.type.startsWith("image/")) return "RECEIPT";
  if (/note/.test(name)) return "NOTE";
  return "INVOICE";
};

// Several files at once. Each goes up on its own, so one bad file doesn't stop the rest.
export const UploadDialog = ({ businessId, onClose }: { businessId: string; onClose: () => void }) => {
  const { t } = useTranslation(["documents", "common"]);
  const { locale } = useFormatting();
  const upload = useUploadDocument(businessId);
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const [running, setRunning] = useState(false);
  const waiting = items.filter((item) => item.state === "waiting");
  const finished = items.length > 0 && items.every((item) => item.state === "done" || item.state === "failed");

  const add = (files: FileList | null) => {
    if (!files) return;
    const next = [...files].map((file): Item => {
      const key = `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`;
      if (!(file.type in UPLOAD_TYPES)) return { key, file, type: "NOTE", state: "failed", problem: t("documents:wrongKind") };
      if (file.size > MAX_DOCUMENT_BYTES) return { key, file, type: "NOTE", state: "failed", problem: t("documents:tooBig") };
      return { key, file, type: guessType(file), state: "waiting" };
    });
    setItems((current) => [...current, ...next]);
  };
  const change = (key: string, changes: Partial<Item>) => setItems((current) => current.map((item) => (item.key === key ? { ...item, ...changes } : item)));

  const start = async () => {
    setRunning(true);
    let done = 0;
    for (const item of waiting) {
      change(item.key, { state: "uploading" });
      try {
        await upload.mutateAsync({ file: item.file, type: item.type });
        change(item.key, { state: "done" });
        done += 1;
      } catch (error) {
        change(item.key, { state: "failed", problem: errorMessage(error) });
      }
    }
    setRunning(false);
    if (done) toast.success(t("documents:uploaded", { count: done }));
  };

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    add(event.dataTransfer.files);
  };

  return (
    <Modal open onOpenChange={(next) => !next && !running && onClose()}>
      <ModalContent title={t("documents:uploadTitle")} description={t("documents:uploadHint")} className="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto">
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={drop}
            className={cn("flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors", over ? "border-foreground bg-muted" : "hover:bg-muted/50")}
          >
            <UploadCloud className="size-8 text-muted-foreground" />
            <span className="font-medium">{t("documents:dropHere")}</span>
            <span className="text-sm text-muted-foreground">{t("documents:allowed")}</span>
          </button>
          <input
            ref={input}
            type="file"
            multiple
            accept={Object.keys(UPLOAD_TYPES).join(",")}
            className="sr-only"
            aria-label={t("documents:chooseFiles")}
            onChange={(event) => {
              add(event.target.files);
              event.target.value = "";
            }}
          />

          {items.length > 0 ? (
            <ul className="divide-y rounded-lg border">
              {items.map((item) => {
                return (
                  <li key={item.key} className="flex items-center gap-3 px-3 py-2.5" data-testid="upload-item">
                    <FileIcon mime={item.file.type} className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.file.name}</p>
                      {item.problem ? <p className="text-xs text-danger">{item.problem}</p> : <p className="text-xs text-muted-foreground">{formatBytes(item.file.size, locale)}</p>}
                    </div>
                    {item.state === "waiting" ? (
                      <>
                        <Select aria-label={t("documents:kindOf", { name: item.file.name })} value={item.type} onChange={(event) => change(item.key, { type: event.target.value as DocumentType })} className="h-9 w-28 text-sm sm:w-32">
                          {DOCUMENT_TYPES.map((value) => (
                            <option key={value} value={value}>
                              {t(`documents:type_${value}`)}
                            </option>
                          ))}
                        </Select>
                        <Button variant="ghost" size="icon" aria-label={t("documents:removeFile", { name: item.file.name })} onClick={() => setItems((current) => current.filter((other) => other.key !== item.key))}>
                          <X />
                        </Button>
                      </>
                    ) : null}
                    {item.state === "uploading" ? <Spinner className="size-5" /> : null}
                    {item.state === "done" ? <CheckCircle2 className="size-5" aria-label={t("documents:done")} /> : null}
                    {item.state === "failed" ? <CircleAlert className="size-5 text-danger" aria-label={t("documents:failed")} /> : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={running}>
              {finished ? t("common:close") : t("common:cancel")}
            </Button>
            {!finished || waiting.length > 0 ? (
              <Button onClick={() => void start()} disabled={running || waiting.length === 0}>
                {t("documents:uploadN", { count: waiting.length })}
              </Button>
            ) : null}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
};
