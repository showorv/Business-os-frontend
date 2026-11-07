import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useMoney } from "@/features/businesses/useMoney";
import { useAllContacts, type Contact } from "@/features/contacts/api";
import { ContactDialog } from "@/features/contacts/ContactDialog";
import { useCategories } from "@/features/finance/api";
import { categoryName } from "@/features/finance/names";
import { currentLocale } from "@/i18n";
import { todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { minorToInput, parseMoney } from "@/lib/money";
import { useCreateInvoice, useInvoice, useIssueInvoice, useUpdateInvoice, type Invoice, type InvoiceKind } from "./api";
import { KIND_PATH, lineAmount } from "./parts";

interface LineDraft {
  key: string;
  description: string;
  quantity: string;
  price: string;
  categoryId: string;
}

const addDays = (date: string, days: number) => {
  const moment = new Date(`${date}T00:00:00Z`);
  moment.setUTCDate(moment.getUTCDate() + days);
  return moment.toISOString().slice(0, 10);
};

const TERMS = [0, 7, 15, 30] as const;

const blankLine = (categoryId = ""): LineDraft => ({ key: crypto.randomUUID(), description: "", quantity: "1", price: "", categoryId });

// The page for a new invoice or bill, and for changing a draft.
export const NewInvoicePage = ({ kind }: { kind: InvoiceKind }) => {
  const businessId = useParams().businessId!;
  const [params] = useSearchParams();
  return <InvoiceForm kind={kind} businessId={businessId} contactId={params.get("contactId") ?? ""} />;
};

export const EditInvoicePage = ({ kind }: { kind: InvoiceKind }) => {
  const { businessId, invoiceId } = useParams() as { businessId: string; invoiceId: string };
  const invoice = useInvoice(businessId, invoiceId);
  if (invoice.isError) return <Alert tone="danger">{errorMessage(invoice.error)}</Alert>;
  if (!invoice.data) return <Spinner className="mt-16" />;
  return <InvoiceForm kind={kind} businessId={businessId} invoice={invoice.data} contactId={invoice.data.contactId} />;
};

const InvoiceForm = ({ kind, businessId, invoice, contactId }: { kind: InvoiceKind; businessId: string; invoice?: Invoice; contactId: string }) => {
  const { t } = useTranslation(["invoices", "common", "shell"]);
  const navigate = useNavigate();
  const { business } = useCurrentBusiness();
  const money = useMoney();
  const contacts = useAllContacts(businessId);
  const categories = useCategories(businessId);
  const create = useCreateInvoice(businessId);
  const update = useUpdateInvoice(businessId, invoice?.id ?? "");
  const issue = useIssueInvoice(businessId, invoice?.id ?? "");
  const currency = business?.baseCurrency ?? "BDT";
  const today = todayIn(business?.timezone ?? "Asia/Dhaka");
  const k = kind === "SALE" ? "sale" : "bill";

  const [contact, setContact] = useState(contactId);
  const [issueDate, setIssueDate] = useState(invoice?.issueDate ?? today);
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? addDays(today, kind === "SALE" ? 15 : 30));
  const [referenceNo, setReferenceNo] = useState(invoice?.referenceNo ?? "");
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    invoice
      ? invoice.lines.map((line) => ({
          key: line.id,
          description: line.description,
          quantity: line.quantity.replace(/\.?0+$/, ""),
          price: minorToInput(line.unitPriceMinor, currency),
          categoryId: line.categoryId,
        }))
      : [blankLine()],
  );
  const [adding, setAdding] = useState(false);
  // A contact added from here shows at once, before the list reloads.
  const [added, setAdded] = useState<Contact | null>(null);
  const [tried, setTried] = useState(false);

  if (!business || !contacts.data || !categories.data) return <Spinner className="mt-16" />;

  const wanted = kind === "SALE" ? "INCOME" : "EXPENSE";
  const usableCategories = categories.data.filter((category) => category.type === wanted && (category.isActive || lines.some((line) => line.categoryId === category.id)));
  const fits = (item: Contact) => (kind === "SALE" ? item.kind !== "SUPPLIER" : item.kind !== "CUSTOMER");
  const people = [...contacts.data.filter((item) => fits(item) && (item.isActive || item.id === contact)), ...(added && !contacts.data.some((item) => item.id === added.id) ? [added] : [])];
  const defaultCategory = usableCategories[0]?.id ?? "";

  const priced = lines.map((line) => ({ ...line, priceMinor: parseMoney(line.price, currency) }));
  const amounts = priced.map((line) => lineAmount(line.quantity, line.priceMinor));
  const total = amounts.reduce<bigint>((sum, amount) => sum + (amount ?? 0n), 0n);
  const lineProblems = priced.map((line) => ({
    description: !line.description.trim(),
    quantity: (lineAmount(line.quantity, "1000") ?? 0n) <= 0n,
    price: line.priceMinor === null,
    category: !line.categoryId,
  }));
  const dateProblem = dueDate < issueDate;
  const invalid = !contact || dateProblem || lineProblems.some((problem) => Object.values(problem).some(Boolean));
  const pending = create.isPending || update.isPending || issue.isPending;
  const error = create.error ?? update.error ?? issue.error;

  const setLine = (key: string, field: keyof LineDraft, value: string) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, [field]: value } : line)));

  const save = (andIssue: boolean) => (event?: FormEvent) => {
    event?.preventDefault();
    setTried(true);
    if (invalid) return;
    const body = {
      contactId: contact,
      issueDate,
      dueDate,
      referenceNo: referenceNo.trim() || null,
      notes: notes.trim() || null,
      lines: priced.map((line) => ({ description: line.description.trim(), quantity: line.quantity.trim(), unitPriceMinor: line.priceMinor!, categoryId: line.categoryId })),
    };
    const done = (id: string) => {
      toast.success(andIssue ? t(`${k}_issued`) : t("draftSaved"));
      void navigate(`/b/${businessId}/${KIND_PATH[kind]}/${id}`, { replace: true });
    };
    if (invoice) {
      update.mutate(body, { onSuccess: (saved) => (andIssue ? issue.mutate(undefined, { onSuccess: () => done(saved.id) }) : done(saved.id)) });
    } else {
      const { referenceNo: reference, notes: note, ...rest } = body;
      create.mutate({ kind, ...rest, ...(reference ? { referenceNo: reference } : {}), ...(note ? { notes: note } : {}), issue: andIssue }, { onSuccess: (saved) => done(saved.id) });
    }
  };

  const show = (problem: boolean) => tried && problem;

  return (
    <form className="mx-auto max-w-4xl space-y-6" onSubmit={save(false)} data-testid="invoice-form" noValidate>
      <Link to={invoice ? ".." : `/b/${businessId}/${KIND_PATH[kind]}`} relative="path" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t(kind === "SALE" ? "shell:invoices" : "shell:bills")}
      </Link>
      <h1 className="text-2xl font-semibold">{invoice ? t(`${k}_edit`) : t(`${k}_new`)}</h1>
      {error ? <Alert tone="danger">{errorMessage(error)}</Alert> : null}

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Field label={t(`${k}_contact`)} error={show(!contact) ? t(`${k}_pickContact`) : undefined}>
              <Select value={contact} onChange={(event) => setContact(event.target.value)}>
                <option value="">{t("choose")}</option>
                {people.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.company ? `${item.name} · ${item.company}` : item.name}
                  </option>
                ))}
              </Select>
            </Field>
            <button type="button" className="text-sm font-medium underline-offset-4 hover:underline" onClick={() => setAdding(true)}>
              {t(`${k}_addContact`)}
            </button>
          </div>
          <Field label={t("issueDate")}>
            <Input type="date" required value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
          </Field>
          <div className="space-y-1.5">
            <Field label={t("dueDate")} error={show(dateProblem) ? t("dueBeforeIssue") : undefined}>
              <Input type="date" required value={dueDate} min={issueDate} onChange={(event) => setDueDate(event.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("terms")}>
              {TERMS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDueDate(addDays(issueDate, days))}
                  className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted aria-pressed:bg-foreground aria-pressed:text-background"
                  aria-pressed={dueDate === addDays(issueDate, days)}
                >
                  {days === 0 ? t("onReceipt") : t("inDays", { count: days })}
                </button>
              ))}
            </div>
          </div>
          <Field label={`${t(`${k}_reference`)} (${t("common:optional")})`} hint={t(`${k}_referenceHint`)}>
            <Input maxLength={60} value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-semibold">{t("items")}</h2>
        <ol className="space-y-3" data-testid="invoice-lines">
          {lines.map((line, index) => {
            const problem = lineProblems[index]!;
            const amount = amounts[index];
            return (
              <li key={line.key}>
                <Card>
                  <CardContent className="grid gap-3 sm:grid-cols-12 sm:items-start">
                    <div className="sm:col-span-5">
                      <Field label={t("description")} error={show(problem.description) ? t("needDescription") : undefined}>
                        <Input maxLength={300} value={line.description} onChange={(event) => setLine(line.key, "description", event.target.value)} />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label={t("quantity")} error={show(problem.quantity) ? t("needQuantity") : undefined}>
                        <Input inputMode="decimal" className="tabular-nums" value={line.quantity} onChange={(event) => setLine(line.key, "quantity", event.target.value)} />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label={t("unitPrice")} error={show(problem.price) ? t("needPrice") : undefined}>
                        <MoneyInput currency={currency} value={line.price} onChange={(event) => setLine(line.key, "price", event.target.value)} />
                      </Field>
                    </div>
                    <div className="sm:col-span-3">
                      <Field label={t(`${k}_category`)} error={show(problem.category) ? t("needCategory") : undefined}>
                        <Select value={line.categoryId || ""} onChange={(event) => setLine(line.key, "categoryId", event.target.value)}>
                          <option value="">{t("choose")}</option>
                          {usableCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {categoryName(category, currentLocale())}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:col-span-12">
                      <p className="text-sm text-muted-foreground">
                        {t("lineAmount")} <span className="font-medium text-foreground tabular-nums" data-testid="line-amount">{amount === null || amount === undefined ? "—" : money(amount, currency)}</span>
                      </p>
                      {lines.length > 1 ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>
                          <Trash2 />
                          {t("removeLine")}
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
        <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, blankLine(current.at(-1)?.categoryId || defaultCategory)])} disabled={lines.length >= 100}>
          <Plus />
          {t("addLine")}
        </Button>
      </section>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-baseline justify-between">
            <span className="font-medium">{t("total")}</span>
            <span className="text-2xl font-semibold tabular-nums" data-testid="invoice-total">
              {money(total, currency)}
            </span>
          </div>
          <Field label={`${t("notes")} (${t("common:optional")})`} hint={t(`${k}_notesHint`)}>
            <textarea
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" variant="outline" disabled={pending}>
          {t("saveDraft")}
        </Button>
        <Button type="button" disabled={pending} onClick={save(true)}>
          {t(`${k}_saveAndIssue`)}
        </Button>
      </div>
      <p className="text-right text-xs text-muted-foreground">{t(`${k}_issueNote`)}</p>

      {adding ? (
        <ContactDialog
          businessId={businessId}
          kind={kind === "SALE" ? "CUSTOMER" : "SUPPLIER"}
          onCreated={(created) => {
            setAdded(created);
            setContact(created.id);
          }}
          onClose={() => setAdding(false)}
        />
      ) : null}
    </form>
  );
};
