import { ArrowLeft, Check, CheckCircle2, FileSpreadsheet, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useMoney } from "@/features/businesses/useMoney";
import { useAccounts } from "@/features/finance/api";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import {
  DATE_FORMATS,
  MAX_STATEMENT_BYTES,
  STATEMENT_TYPES,
  useCreateTemplate,
  usePreview,
  useStartImport,
  useTemplates,
  useUploadStatement,
  type DateFormat,
  type Mapping,
  type MappingField,
  type Preview,
} from "./api";
import { signed } from "./parts";

type Draft = Partial<Omit<Mapping, "headerRow">> & { headerRow: number };
type AmountMode = "single" | "split";

// Ready to send: a date, its format, and either one amount column or money-out / money-in columns.
const complete = (draft: Draft, mode: AmountMode): Mapping | null => {
  if (!draft.dateColumn || !draft.dateFormat) return null;
  const clean = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== "" && value !== undefined)) as Draft;
  if (mode === "single") {
    if (!clean.amountColumn) return null;
    delete clean.debitColumn;
    delete clean.creditColumn;
  } else {
    if (!clean.debitColumn && !clean.creditColumn) return null;
    delete clean.amountColumn;
    delete clean.directionColumn;
  }
  return clean as Mapping;
};

const fromSuggestion = (preview: Preview): Draft => {
  const { headerRow, dateFormat, ...columns } = preview.suggestion;
  return { ...(columns as Partial<Mapping>), headerRow: headerRow ?? 1, dateFormat: (preview.dateFormats[0] ?? dateFormat ?? "DD/MM/YYYY") as DateFormat };
};

// Bring in a bank's CSV or Excel file: pick it, check the columns, then import.
export const ImportPage = () => {
  const { t } = useTranslation(["statements", "common"]);
  const businessId = useParams().businessId!;
  const navigate = useNavigate();
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const accounts = useAccounts(businessId);
  const templates = useTemplates(businessId);
  const upload = useUploadStatement(businessId);
  const preview = usePreview(businessId);
  const check = usePreview(businessId);
  const start = useStartImport(businessId);
  const saveTemplate = useCreateTemplate(businessId);
  const { locale } = useFormatting();

  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mode, setMode] = useState<AmountMode>("single");
  const [saveAs, setSaveAs] = useState("");
  const [saving, setSaving] = useState(false);

  const usable = (accounts.data ?? []).filter((account) => account.isActive);
  const chosenAccount = accountId || usable.find((account) => account.type === "BANK")?.id || usable[0]?.id || "";
  const info = preview.data;
  const mapping = draft ? complete(draft, mode) : null;
  const result = check.data?.result;
  const step = documentId && info ? 2 : 1;

  // Each change to the columns is checked against the file after a short pause.
  const mappingKey = mapping ? JSON.stringify(mapping) : "";
  const runCheck = check.mutate;
  useEffect(() => {
    if (!documentId || !mappingKey) return;
    const timer = window.setTimeout(() => runCheck({ documentId, financialAccountId: chosenAccount, mapping: JSON.parse(mappingKey) as Mapping }), 350);
    return () => window.clearTimeout(timer);
  }, [documentId, mappingKey, chosenAccount, runCheck]);

  if (!business || access.isLoading || accounts.isLoading) return <Spinner className="mt-16" />;
  if (!(access.can(Permission.FINANCE_WRITE) && access.writable)) return <Alert tone="danger">{t("statements:noAccess")}</Alert>;

  const pick = (picked: File | undefined) => {
    if (!picked) return;
    const extension = picked.name.split(".").pop()?.toLowerCase() ?? "";
    if (!STATEMENT_TYPES[extension]) return setFileProblem(t("statements:wrongFileType"));
    if (picked.size > MAX_STATEMENT_BYTES) return setFileProblem(t("statements:fileTooBig"));
    setFileProblem(null);
    setFile(picked);
  };

  const readFile = async () => {
    if (!file || !chosenAccount) return;
    try {
      const id = await upload.mutateAsync(file);
      const found = await preview.mutateAsync({ documentId: id, financialAccountId: chosenAccount });
      const template = templates.data?.find((item) => item.id === templateId);
      const start = template ? ({ headerRow: 1, ...(template.mapping as Partial<Mapping>) } as Draft) : fromSuggestion(found);
      setMode(start.debitColumn || start.creditColumn ? "split" : "single");
      setDraft(start);
      setDocumentId(id);
    } catch {
      // Shown from the hooks' own error state.
    }
  };

  const runImport = async () => {
    if (!mapping || !documentId) return;
    try {
      let template: string | undefined;
      if (saving && saveAs.trim()) template = (await saveTemplate.mutateAsync({ name: saveAs.trim(), mapping })).id;
      await start.mutateAsync({ documentId, financialAccountId: chosenAccount, ...(template ? { templateId: template } : { mapping }) });
      toast.success(t("statements:importStarted"));
      void navigate(`/b/${businessId}/statements?tab=imports`);
    } catch {
      // Shown below.
    }
  };

  const reset = () => {
    setDocumentId(null);
    setDraft(null);
    preview.reset();
    check.reset();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-28">
      <div>
        <Link to={`/b/${businessId}/statements?tab=imports`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {t("statements:backToStatements")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t("statements:importTitle")}</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">{t("statements:importSubtitle")}</p>
      </div>

      <Steps step={step} />

      {step === 1 ? (
        <Card className="mx-auto max-w-2xl space-y-5 p-5 sm:p-6">
          {upload.isError ? <Alert tone="danger">{errorMessage(upload.error)}</Alert> : null}
          {preview.isError ? <Alert tone="danger">{errorMessage(preview.error)}</Alert> : null}
          <Field label={t("statements:intoAccount")}>
            <Select value={chosenAccount} onChange={(event) => setAccountId(event.target.value)}>
              {usable.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </Field>
          <DropZone file={file} problem={fileProblem} onPick={pick} onClear={() => setFile(null)} />
          {(templates.data ?? []).length > 0 ? (
            <Field label={t("statements:useFormat")} hint={t("statements:useFormatHint")}>
              <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                <option value="">{t("statements:detectColumns")}</option>
                {templates.data!.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Button className="w-full" onClick={() => void readFile()} disabled={!file || !chosenAccount || upload.isPending || preview.isPending}>
            {upload.isPending ? t("statements:uploading") : preview.isPending ? t("statements:reading") : t("statements:readFile")}
          </Button>
        </Card>
      ) : null}

      {step === 2 && info && draft ? (
        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <MappingForm info={info} draft={draft} mode={mode} onMode={setMode} onChange={(patch) => setDraft({ ...draft, ...patch })} onStartOver={reset} />
          <div className="min-w-0 space-y-4">
            {check.isError ? <Alert tone="danger">{errorMessage(check.error)}</Alert> : null}
            {!mapping ? <Alert tone="info">{t("statements:finishMapping")}</Alert> : null}
            {mapping && result ? <ResultView result={result} currency={info.currency} checking={check.isPending} /> : null}
            {mapping && !result && check.isPending ? <Spinner className="mt-8" /> : null}
            <RawRows rows={info.rawRows} headerRow={draft.headerRow} mapping={draft} />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-surface/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
            {start.isError || saveTemplate.isError ? <p className="text-sm text-danger">{errorMessage(start.error ?? saveTemplate.error)}</p> : null}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={saving} onChange={(event) => setSaving(event.target.checked)} className="size-4 accent-foreground" />
              {t("statements:saveFormat")}
            </label>
            {saving ? <Input aria-label={t("statements:formatName")} value={saveAs} onChange={(event) => setSaveAs(event.target.value)} placeholder={t("statements:formatNamePlaceholder")} maxLength={120} className="sm:w-56" /> : null}
            <Button className="sm:ml-auto" onClick={() => void runImport()} disabled={!mapping || !result || result.readableRows === 0 || start.isPending || saveTemplate.isPending || (saving && !saveAs.trim())}>
              <Check />
              {result ? t("statements:importN", { count: result.readableRows, n: result.readableRows.toLocaleString(locale) }) : t("statements:importNow")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Steps = ({ step }: { step: number }) => {
  const { t } = useTranslation("statements");
  const items = [t("stepFile"), t("stepColumns")];
  return (
    <ol className="flex items-center gap-3 text-sm" aria-label={t("steps")}>
      {items.map((label, index) => {
        const n = index + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={label} className="flex items-center gap-3" aria-current={current ? "step" : undefined}>
            {index > 0 ? <span className={cn("h-px w-8 sm:w-12", done || current ? "bg-foreground" : "bg-border")} /> : null}
            <span className={cn("flex size-7 items-center justify-center rounded-full border text-xs font-semibold", (done || current) && "border-foreground bg-foreground text-background")}>
              {done ? <Check className="size-3.5" /> : n}
            </span>
            <span className={cn("font-medium", !current && "text-muted-foreground")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
};

const DropZone = ({ file, problem, onPick, onClear }: { file: File | null; problem: string | null; onPick: (file: File | undefined) => void; onClear: () => void }) => {
  const { t } = useTranslation("statements");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const drop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    onPick(event.dataTransfer.files[0]);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
          <FileSpreadsheet className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">{t("fileSize", { size: (file.size / 1024).toFixed(file.size < 10_240 ? 1 : 0) })}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label={t("removeFile")} onClick={onClear}>
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors focus-visible:outline-2 focus-visible:outline-brand",
          over ? "border-foreground bg-muted" : "hover:border-foreground/40 hover:bg-muted/40",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Upload className="size-5" />
        </span>
        <span className="font-medium">{t("dropFile")}</span>
        <span className="text-sm text-muted-foreground">{t("dropFileHint")}</span>
      </button>
      <input ref={input} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" aria-label={t("chooseFile")} onChange={(event) => onPick(event.target.files?.[0])} />
      {problem ? <p className="mt-2 text-sm text-danger">{problem}</p> : null}
    </div>
  );
};

const MappingForm = ({
  info,
  draft,
  mode,
  onMode,
  onChange,
  onStartOver,
}: {
  info: Preview;
  draft: Draft;
  mode: AmountMode;
  onMode: (mode: AmountMode) => void;
  onChange: (patch: Partial<Draft>) => void;
  onStartOver: () => void;
}) => {
  const { t } = useTranslation("statements");
  // The headings come from whichever row is chosen as the header row.
  const headers = (info.rawRows[draft.headerRow - 1] ?? info.headers).map((cell) => cell.trim()).filter(Boolean);

  // `optional` adds "(optional)" to the label; `allowNone` lets the box be left empty.
  const column = (field: MappingField, label: string, optional = true, hint?: string, allowNone = optional) => (
    <Field label={optional ? `${label} (${t("optional")})` : label} hint={hint}>
      <Select value={draft[field] ?? ""} onChange={(event) => onChange({ [field]: event.target.value || undefined })}>
        <option value="">{allowNone ? t("noColumn") : t("pickColumn")}</option>
        {headers.map((header) => (
          <option key={header} value={header}>
            {header}
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <Card className="h-fit space-y-4 p-5 lg:sticky lg:top-20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{info.fileName}</p>
          <p className="text-sm text-muted-foreground">{t("columnsFound", { count: headers.length })}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onStartOver}>
          {t("otherFile")}
        </Button>
      </div>
      <Field label={t("headerRow")} hint={t("headerRowHint")}>
        <Select value={String(draft.headerRow)} onChange={(event) => onChange({ headerRow: Number(event.target.value) })}>
          {info.rawRows.slice(0, 20).map((row, index) => (
            <option key={index} value={index + 1}>
              {t("rowN", { n: index + 1 })}: {row.filter(Boolean).slice(0, 3).join(", ").slice(0, 40)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {column("dateColumn", t("dateColumn"), false)}
        <Field label={t("dateFormat")}>
          <Select value={draft.dateFormat ?? ""} onChange={(event) => onChange({ dateFormat: event.target.value as DateFormat })}>
            {DATE_FORMATS.map((format) => (
              <option key={format} value={format}>
                {format}
                {info.dateFormats.includes(format) ? ` ✓` : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="space-y-3 rounded-lg bg-muted/50 p-3">
        <Segmented
          label={t("amountLayout")}
          value={mode}
          onChange={onMode}
          className="flex w-full"
          options={[
            { value: "single", label: t("oneAmount") },
            { value: "split", label: t("inOutColumns") },
          ]}
        />
        {mode === "single" ? (
          <>
            {column("amountColumn", t("amountColumn"), false, t("amountColumnHint"))}
            {column("directionColumn", t("directionColumn"), true, t("directionColumnHint"))}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* One of the two is needed, either may be missing. */}
            {column("debitColumn", t("debitColumn"), false, undefined, true)}
            {column("creditColumn", t("creditColumn"), false, undefined, true)}
          </div>
        )}
      </div>
      {column("descriptionColumn", t("descriptionColumn"))}
      <div className="grid grid-cols-2 gap-3">
        {column("referenceColumn", t("referenceColumn"))}
        {column("counterpartyColumn", t("counterpartyColumn"))}
        {column("feeColumn", t("feeColumn"))}
        {column("balanceColumn", t("balanceColumn"))}
      </div>
    </Card>
  );
};

const ResultView = ({ result, currency, checking }: { result: NonNullable<Preview["result"]>; currency: string; checking: boolean }) => {
  const { t } = useTranslation("statements");
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const number = (value: number) => value.toLocaleString(locale);
  const good = result.readableRows > 0 && result.failedRows === 0;
  const totals = result.lines.reduce(
    (sum, line) => (line.direction === "IN" ? { ...sum, in: sum.in + BigInt(line.amountMinor) } : { ...sum, out: sum.out + BigInt(line.amountMinor) }),
    { in: 0n, out: 0n },
  );

  return (
    <Card className={cn("overflow-hidden transition-opacity", checking && "opacity-60")} aria-busy={checking}>
      <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0" data-testid="preview-stats">
        <Stat label={t("rowsInFile")} value={number(result.totalRows)} />
        <Stat label={t("readable")} value={number(result.readableRows)} icon={good ? <CheckCircle2 className="size-4" /> : null} />
        <Stat label={t("unreadable")} value={number(result.failedRows)} danger={result.failedRows > 0} />
        <Stat label={t("balanceGaps")} value={number(result.balanceBreaks)} hint={t("balanceGapsHint")} />
      </div>
      {result.errors.length > 0 ? (
        <div className="border-t bg-danger-soft/40 px-4 py-3 text-sm">
          <p className="font-medium text-danger">{t("someRowsUnreadable")}</p>
          <p className="mt-1 text-muted-foreground">
            {result.errors
              .slice(0, 5)
              .map((error) => `${t("rowN", { n: error.row })}: ${t(`rowError_${error.code}`, { defaultValue: error.code })}`)
              .join(" · ")}
            {result.errors.length > 5 ? " …" : ""}
          </p>
        </div>
      ) : null}
      {result.lines.length > 0 ? (
        <div className="border-t">
          <div className="flex items-center justify-between px-4 pt-3 text-xs text-muted-foreground">
            <span>{t("firstRows", { count: result.lines.length })}</span>
            <span className="tabular-nums">
              {signed("IN", money(totals.in, currency))} · {signed("OUT", money(totals.out, currency))}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">{t("date")}</th>
                  <th className="px-4 py-2 font-medium">{t("description")}</th>
                  <th className="px-4 py-2 text-right font-medium">{t("amount")}</th>
                  <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">{t("balanceAfter")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.lines.map((line, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(line.txnDate, locale, digitStyle)}</td>
                    <td className="max-w-[16rem] truncate px-4 py-2">{line.description || line.counterparty || line.reference || "—"}</td>
                    <td className={cn("px-4 py-2 text-right whitespace-nowrap tabular-nums", line.direction === "IN" ? "font-medium" : "text-muted-foreground")}>{signed(line.direction, money(line.amountMinor, currency))}</td>
                    <td className="hidden px-4 py-2 text-right whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">{line.balanceAfterMinor ? money(line.balanceAfterMinor, currency) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Card>
  );
};

const Stat = ({ label, value, icon, danger, hint }: { label: string; value: string; icon?: ReactNode; danger?: boolean; hint?: string }) => (
  <div className="p-4" title={hint}>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={cn("mt-1 flex items-center gap-1.5 text-xl font-semibold tabular-nums", danger && "text-danger")}>
      {value}
      {icon}
    </p>
  </div>
);

// The file as it is, with the header row and the chosen columns picked out.
const RawRows = ({ rows, headerRow, mapping }: { rows: string[][]; headerRow: number; mapping: Draft }) => {
  const { t } = useTranslation("statements");
  const headers = (rows[headerRow - 1] ?? []).map((cell) => cell.trim());
  const used = new Set(Object.entries(mapping).filter(([key, value]) => key.endsWith("Column") && value).map(([, value]) => String(value)));
  const width = Math.max(...rows.map((row) => row.length), 0);

  return (
    <Card className="overflow-hidden">
      <p className="border-b px-4 py-3 text-sm font-medium">{t("fileAsIs")}</p>
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-xs">
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className={cn("border-b last:border-b-0", index + 1 === headerRow && "bg-foreground text-background", index + 1 < headerRow && "text-muted-foreground/60")}>
                <td className="sticky left-0 w-10 bg-inherit px-2 py-1.5 text-right font-mono text-muted-foreground">{index + 1}</td>
                {Array.from({ length: width }, (_, cell) => (
                  <td key={cell} className={cn("max-w-[12rem] truncate px-2 py-1.5 whitespace-nowrap", used.has(headers[cell] ?? "\u0000") && index + 1 !== headerRow && "bg-muted font-medium")}>
                    {row[cell] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
