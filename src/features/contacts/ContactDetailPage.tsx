import { Archive, ArchiveRestore, ArrowLeft, Mail, MapPin, Pencil, Phone, Plus, ReceiptText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useMoney } from "@/features/businesses/useMoney";
import { useAccounts, useCategories, useTransactions } from "@/features/finance/api";
import { categoryName } from "@/features/finance/names";
import { TransactionRow } from "@/features/finance/transactions/TransactionsPage";
import { currentLocale } from "@/i18n";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { useContact, useUpdateContact } from "./api";
import { ContactDialog } from "./ContactDialog";
import { ContactDues } from "./ContactDues";
import { KindBadge, totalsIn } from "./parts";

const Stat = ({ label, value, note, testId }: { label: string; value: string; note?: string; testId?: string }) => (
  <Card>
    <CardContent>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums" data-testid={testId}>
        {value}
      </p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </CardContent>
  </Card>
);

// One customer or supplier: how to reach them, what moved between you, and every transaction with them.
export const ContactDetailPage = () => {
  const { t } = useTranslation(["contacts", "shell", "finance"]);
  const { businessId, contactId } = useParams() as { businessId: string; contactId: string };
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const contact = useContact(businessId, contactId);
  const update = useUpdateContact(businessId);
  const transactions = useTransactions(businessId, { contactId });
  const accounts = useAccounts(businessId);
  const categories = useCategories(businessId);
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const [editing, setEditing] = useState(false);
  if (contact.isError) return <Alert tone="danger">{errorMessage(contact.error)}</Alert>;
  if (!business || !contact.data || access.isLoading) return <Spinner className="mt-16" />;

  const data = contact.data;
  const canWrite = access.can(Permission.FINANCE_WRITE) && access.writable;
  const currency = business.baseCurrency;
  const { main, others } = totalsIn(data, currency);
  const net = BigInt(main.receivedMinor) - BigInt(main.paidMinor);
  const accountsById = new Map((accounts.data ?? []).map((account) => [account.id, account]));
  const categoriesById = new Map((categories.data ?? []).map((category) => [category.id, category]));
  const list = transactions.data ?? [];
  const archive = (isActive: boolean) =>
    update.mutate({ contactId, isActive }, { onSuccess: () => toast.success(isActive ? t("restored") : t("archivedDone")) });

  return (
    <div className="space-y-6">
      <Link to=".." relative="path" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t("shell:contacts")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold" data-testid="contact-name">
            {data.name}
            <KindBadge kind={data.kind} />
            {data.isActive ? null : <Badge className="border bg-transparent text-muted-foreground">{t("archived")}</Badge>}
          </h1>
          {data.company ? <p className="mt-1 text-muted-foreground">{data.company}</p> : null}
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {data.phone ? (
              <li>
                <a href={`tel:${data.phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                  <Phone className="size-4 text-muted-foreground" />
                  {data.phone}
                </a>
              </li>
            ) : null}
            {data.email ? (
              <li>
                <a href={`mailto:${data.email}`} className="inline-flex items-center gap-1.5 hover:underline">
                  <Mail className="size-4 text-muted-foreground" />
                  {data.email}
                </a>
              </li>
            ) : null}
            {data.address ? (
              <li className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-muted-foreground" />
                {data.address}
              </li>
            ) : null}
            {data.taxId ? <li className="text-muted-foreground">{t("taxIdShort", { id: data.taxId })}</li> : null}
          </ul>
          {data.notes ? <p className="mt-2 max-w-prose text-sm text-muted-foreground">{data.notes}</p> : null}
        </div>
        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            {data.isActive ? (
              <Button asChild>
                <Link to={`/b/${businessId}/transactions/new?contactId=${data.id}&type=${data.kind === "SUPPLIER" ? "EXPENSE" : "INCOME"}`}>
                  <Plus />
                  {t("record")}
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil />
              {t("editShort")}
            </Button>
            <Button variant="outline" disabled={update.isPending} onClick={() => archive(!data.isActive)}>
              {data.isActive ? <Archive /> : <ArchiveRestore />}
              {data.isActive ? t("archive") : t("restore")}
            </Button>
          </div>
        ) : null}
      </div>
      {update.isError ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("received")} value={money(main.receivedMinor, currency)} note={t("receivedNote")} testId="contact-received" />
        <Stat label={t("paid")} value={money(main.paidMinor, currency)} note={t("paidNote")} testId="contact-paid" />
        <Stat
          label={t("net")}
          value={`${net < 0n ? "−" : ""}${money(net < 0n ? -net : net, currency)}`}
          note={main.lastDate ? t("lastOn", { date: formatDate(main.lastDate, locale, digitStyle) }) : t("noMoneyYet")}
          testId="contact-net"
        />
      </div>
      {others.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {others.map((row) => t("otherCurrency", { received: money(row.receivedMinor, row.currency), paid: money(row.paidMinor, row.currency) })).join(" · ")}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">{t("totalsNote")}</p>

      <ContactDues businessId={businessId} contact={data} canWrite={canWrite} />

      <section className="space-y-3">
        <h2 className="font-semibold">{t("shell:transactions")}</h2>
        <Card className="overflow-hidden">
          {transactions.isLoading ? <Spinner className="my-12" /> : null}
          {transactions.isError ? <Alert tone="danger">{errorMessage(transactions.error)}</Alert> : null}
          {transactions.isSuccess && list.length === 0 ? <EmptyState icon={ReceiptText} title={t("noTransactions")} body={t("noTransactionsHint")} /> : null}
          {list.length > 0 ? (
            <ul className="divide-y" data-testid="contact-transactions">
              {list.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  to={`/b/${businessId}/transactions/${transaction.id}`}
                  accountName={accountsById.get(transaction.accountId)?.name ?? ""}
                  toAccountName={transaction.toAccountId ? accountsById.get(transaction.toAccountId)?.name : undefined}
                  categoryLabel={categoryName(transaction.categoryId ? categoriesById.get(transaction.categoryId) : undefined, currentLocale())}
                />
              ))}
            </ul>
          ) : null}
        </Card>
        {transactions.hasNextPage ? (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => void transactions.fetchNextPage()} disabled={transactions.isFetchingNextPage}>
              {t("loadMore")}
            </Button>
          </div>
        ) : null}
      </section>

      {editing ? <ContactDialog businessId={businessId} contact={data} onClose={() => setEditing(false)} /> : null}
    </div>
  );
};
