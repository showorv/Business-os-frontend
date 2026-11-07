import { ArrowLeft, Ban, Download, Mail, Pencil, Send, Trash2, Undo2, Wallet } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useMoney } from "@/features/businesses/useMoney";
import { useAccounts } from "@/features/finance/api";
import { categoryName } from "@/features/finance/names";
import { currentLocale } from "@/i18n";
import { formatDate, formatDateTime, todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { minorToInput, parseMoney } from "@/lib/money";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import {
  useDeleteInvoice,
  useDownloadInvoicePdf,
  useEmailInvoice,
  useInvoice,
  useIssueInvoice,
  useRecordPayment,
  useVoidInvoice,
  useVoidPayment,
  type Invoice,
  type InvoiceKind,
} from "./api";
import { KIND_PATH, StatusBadge } from "./parts";

type Dialog = "pay" | "email" | "void" | "delete" | { undo: string } | null;

// One invoice or bill: what it is for, what has been paid, and what can be done with it next.
export const InvoiceDetailPage = ({ kind }: { kind: InvoiceKind }) => {
  const { t } = useTranslation(["invoices", "common", "shell"]);
  const { businessId, invoiceId } = useParams() as { businessId: string; invoiceId: string };
  const navigate = useNavigate();
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const invoice = useInvoice(businessId, invoiceId);
  const accounts = useAccounts(businessId);
  const issue = useIssueInvoice(businessId, invoiceId);
  const remove = useDeleteInvoice(businessId, invoiceId);
  const voidPayment = useVoidPayment(businessId, invoiceId);
  const download = useDownloadInvoicePdf(businessId, invoiceId);
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const [dialog, setDialog] = useState<Dialog>(null);
  if (invoice.isError) return <Alert tone="danger">{errorMessage(invoice.error)}</Alert>;
  if (!business || !invoice.data || access.isLoading) return <Spinner className="mt-16" />;

  const data = invoice.data;
  const k = kind === "SALE" ? "sale" : "bill";
  const canWrite = access.can(Permission.FINANCE_WRITE) && access.writable;
  const open = data.status === "ISSUED" || data.status === "PARTIALLY_PAID";
  const currency = data.currency;
  const day = (date: string) => formatDate(date, locale, digitStyle);
  const error = issue.error ?? remove.error ?? voidPayment.error ?? download.error;
  const listPath = `/b/${businessId}/${KIND_PATH[kind]}`;
  const pdf = (pdfLocale: "en" | "bn-BD") => download.mutate({ locale: pdfLocale, fileName: `${data.number ?? t("draftNumber")}.pdf` });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to={listPath} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t(kind === "SALE" ? "shell:invoices" : "shell:bills")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold" data-testid="invoice-title">
            {data.number ?? t(`${k}_draftTitle`)}
            <StatusBadge status={data.status} overdue={data.isOverdue} />
          </h1>
          <p className="mt-1 text-muted-foreground">
            <Link to={`/b/${businessId}/contacts/${data.contact.id}`} className="font-medium text-foreground hover:underline">
              {data.contact.name}
            </Link>
            {data.contact.company ? ` · ${data.contact.company}` : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite && data.status === "DRAFT" ? (
            <>
              <Button onClick={() => issue.mutate(undefined, { onSuccess: () => toast.success(t(`${k}_issued`)) })} disabled={issue.isPending}>
                <Send />
                {t(`${k}_issue`)}
              </Button>
              <Button variant="outline" asChild>
                <Link to="edit">
                  <Pencil />
                  {t("edit")}
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setDialog("delete")}>
                <Trash2 />
                {t("deleteDraft")}
              </Button>
            </>
          ) : null}
          {canWrite && open ? (
            <Button onClick={() => setDialog("pay")}>
              <Wallet />
              {t(`${k}_recordPayment`)}
            </Button>
          ) : null}
          {canWrite && kind === "SALE" && data.status !== "DRAFT" && data.status !== "VOID" ? (
            <Button variant="outline" onClick={() => setDialog("email")}>
              <Mail />
              {t("email")}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => pdf(locale === "bn-BD" ? "bn-BD" : "en")} disabled={download.isPending}>
            <Download />
            {t("pdf")}
          </Button>
          {canWrite && (open || data.status === "PAID") && data.paidMinor === "0" ? (
            <Button variant="outline" onClick={() => setDialog("void")}>
              <Ban />
              {t("void")}
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <Alert tone="danger">{errorMessage(error)}</Alert> : null}
      {data.status === "VOID" ? <Alert>{t("voidedBecause", { reason: data.voidReason ?? "" })}</Alert> : null}
      {data.emailedAt ? <p className="text-sm text-muted-foreground">{t("emailedAt", { when: formatDateTime(data.emailedAt, locale, digitStyle) })}</p> : null}

      <Card>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("issueDate")}</p>
            <p className="font-medium">{day(data.issueDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("dueDate")}</p>
            <p className="font-medium">{day(data.dueDate)}</p>
          </div>
          {data.referenceNo ? (
            <div>
              <p className="text-muted-foreground">{t(`${k}_reference`)}</p>
              <p className="font-medium">{data.referenceNo}</p>
            </div>
          ) : null}
          {data.journalEntryId ? (
            <div>
              <p className="text-muted-foreground">{t("inTheBooks")}</p>
              <Link to={`/b/${businessId}/ledger/journals/${data.journalEntryId}`} className="font-medium hover:underline">
                {t("seeJournal")}
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="invoice-items">
            <thead className="border-b bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">{t("description")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("quantity")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("unitPrice")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("amount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-2.5">
                    {line.description}
                    <span className="block text-xs text-muted-foreground">{categoryName(line.category, currentLocale())}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{line.quantity.replace(/\.?0+$/, "")}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(line.unitPriceMinor, currency)}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">{money(line.amountMinor, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="ml-auto max-w-xs space-y-1.5 border-t p-4 text-sm">
          <div className="flex justify-between font-medium">
            <dt>{t("total")}</dt>
            <dd className="tabular-nums">{money(data.totalMinor, currency)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>{t("paid")}</dt>
            <dd className="tabular-nums" data-testid="invoice-paid">{money(data.paidMinor, currency)}</dd>
          </div>
          <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
            <dt>{t("balanceDue")}</dt>
            <dd className="tabular-nums" data-testid="invoice-due">{money(data.dueMinor, currency)}</dd>
          </div>
        </dl>
      </Card>

      {data.notes ? (
        <section className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground">{t("notes")}</h2>
          <p className="whitespace-pre-wrap">{data.notes}</p>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-semibold">{t("payments")}</h2>
        <Card className="overflow-hidden">
          {data.payments.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{data.status === "DRAFT" ? t(`${k}_paymentsAfterIssue`) : t("noPayments")}</p>
          ) : (
            <ul className="divide-y" data-testid="invoice-payments">
              {data.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5">
                  <div className="min-w-0 flex-1">
                    <p className={payment.voidedAt ? "font-medium text-muted-foreground line-through" : "font-medium"}>
                      {money(payment.amountMinor, currency)}
                      <span className="font-normal text-muted-foreground"> · {payment.account.name}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[day(payment.paidOn), payment.note, payment.voidedAt ? t("undone") : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {canWrite && !payment.voidedAt ? (
                    <Button variant="ghost" size="sm" onClick={() => setDialog({ undo: payment.id })}>
                      <Undo2 />
                      {t("undoPayment")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {dialog === "pay" ? <PaymentDialog businessId={businessId} invoice={data} accounts={accounts.data ?? []} onClose={() => setDialog(null)} /> : null}
      {dialog === "email" ? <EmailDialog businessId={businessId} invoice={data} onClose={() => setDialog(null)} /> : null}
      {dialog === "void" ? <VoidDialog businessId={businessId} invoice={data} onClose={() => setDialog(null)} /> : null}
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(value) => !value && setDialog(null)}
        title={t("deleteTitle")}
        description={t("deleteBody")}
        confirmLabel={t("deleteDraft")}
        danger
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              toast.success(t("deleted"));
              void navigate(listPath, { replace: true });
            },
          })
        }
      />
      <ConfirmDialog
        open={typeof dialog === "object" && dialog !== null}
        onOpenChange={(value) => !value && setDialog(null)}
        title={t("undoTitle")}
        description={t("undoBody")}
        confirmLabel={t("undoPayment")}
        danger
        pending={voidPayment.isPending}
        onConfirm={() => {
          if (typeof dialog === "object" && dialog) voidPayment.mutate(dialog.undo, { onSuccess: () => (toast.success(t("paymentUndone")), setDialog(null)) });
        }}
      />
    </div>
  );
};

type Accounts = NonNullable<ReturnType<typeof useAccounts>["data"]>;

const PaymentDialog = ({ businessId, invoice, accounts, onClose }: { businessId: string; invoice: Invoice; accounts: Accounts; onClose: () => void }) => {
  const { t } = useTranslation(["invoices", "common"]);
  const { business } = useCurrentBusiness();
  const money = useMoney();
  const pay = useRecordPayment(businessId, invoice.id);
  const usable = accounts.filter((account) => account.isActive && account.currency === invoice.currency);
  const [accountId, setAccountId] = useState(usable[0]?.id ?? "");
  const [amount, setAmount] = useState(minorToInput(invoice.dueMinor, invoice.currency));
  const [paidOn, setPaidOn] = useState(todayIn(business?.timezone ?? "Asia/Dhaka"));
  const [note, setNote] = useState("");
  const amountMinor = parseMoney(amount, invoice.currency);
  const tooMuch = amountMinor !== null && BigInt(amountMinor) > BigInt(invoice.dueMinor);
  const k = invoice.kind === "SALE" ? "sale" : "bill";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!amountMinor || amountMinor === "0" || tooMuch || !accountId) return;
    pay.mutate(
      { accountId, amountMinor, paidOn, ...(note.trim() ? { note: note.trim() } : {}) },
      { onSuccess: (saved) => (toast.success(saved.status === "PAID" ? t(`${k}_paidInFull`) : t("paymentRecorded")), onClose()) },
    );
  };

  return (
    <Modal open onOpenChange={(value) => !value && onClose()}>
      <ModalContent title={t(`${k}_recordPayment`)} description={t("stillDue", { amount: money(invoice.dueMinor, invoice.currency) })} className="max-w-md">
        <form onSubmit={submit} className="space-y-4" data-testid="payment-form">
          {pay.error ? <Alert tone="danger">{errorMessage(pay.error)}</Alert> : null}
          <Field label={t("amount")} error={tooMuch ? t("moreThanDue") : undefined}>
            <MoneyInput currency={invoice.currency} autoFocus value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field label={t(`${k}_paymentAccount`)}>
            <Select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              {usable.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("paidOn")}>
            <Input type="date" required value={paidOn} min={invoice.issueDate} onChange={(event) => setPaidOn(event.target.value)} />
          </Field>
          <Field label={`${t("note")} (${t("common:optional")})`}>
            <Input maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={pay.isPending || !amountMinor || amountMinor === "0" || tooMuch || !accountId}>
              {t("savePayment")}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};

const EmailDialog = ({ businessId, invoice, onClose }: { businessId: string; invoice: Invoice; onClose: () => void }) => {
  const { t } = useTranslation(["invoices", "common"]);
  const send = useEmailInvoice(businessId, invoice.id);
  const [to, setTo] = useState(invoice.contact.email ?? "");
  const [message, setMessage] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send.mutate(
      { ...(to.trim() ? { to: to.trim() } : {}), ...(message.trim() ? { message: message.trim() } : {}) },
      { onSuccess: () => (toast.success(t("emailSent", { to: to.trim() })), onClose()) },
    );
  };
  return (
    <Modal open onOpenChange={(value) => !value && onClose()}>
      <ModalContent title={t("emailTitle")} description={t("emailBody")} className="max-w-md">
        <form onSubmit={submit} className="space-y-4" data-testid="email-form">
          {send.error ? <Alert tone="danger">{errorMessage(send.error)}</Alert> : null}
          <Field label={t("emailTo")}>
            <Input type="email" required value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
          <Field label={`${t("message")} (${t("common:optional")})`}>
            <textarea
              rows={3}
              maxLength={2000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={send.isPending || !to.trim()}>
              <Send />
              {t("send")}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};

const VoidDialog = ({ businessId, invoice, onClose }: { businessId: string; invoice: Invoice; onClose: () => void }) => {
  const { t } = useTranslation(["invoices", "common"]);
  const voidIt = useVoidInvoice(businessId, invoice.id);
  const [reason, setReason] = useState("");
  return (
    <ConfirmDialog
      open
      onOpenChange={(value) => !value && onClose()}
      title={t("voidTitle", { number: invoice.number ?? "" })}
      description={t("voidBody")}
      confirmLabel={t("void")}
      danger
      pending={voidIt.isPending || !reason.trim()}
      onConfirm={() => voidIt.mutate(reason.trim(), { onSuccess: () => (toast.success(t("voided")), onClose()) })}
    >
      {voidIt.error ? <Alert tone="danger">{errorMessage(voidIt.error)}</Alert> : null}
      <Field label={t("voidReason")}>
        <Input autoFocus maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
      </Field>
    </ConfirmDialog>
  );
};
