import { ChevronRight, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useMoney } from "@/features/businesses/useMoney";
import { useAging, useInvoices, type InvoiceKind } from "@/features/invoices/api";
import { KIND_PATH, StatusBadge } from "@/features/invoices/parts";
import { formatDate } from "@/lib/dates";
import { useFormatting } from "@/lib/preferences";
import type { Contact } from "./api";

// Baki with one contact: what they still owe on invoices, what is owed to them on bills, and
// their latest invoices and bills.
export const ContactDues = ({ businessId, contact, canWrite }: { businessId: string; contact: Contact; canWrite: boolean }) => {
  const { t } = useTranslation("invoices");
  const sides: InvoiceKind[] = contact.kind === "CUSTOMER" ? ["SALE"] : contact.kind === "SUPPLIER" ? ["BILL"] : ["SALE", "BILL"];
  return (
    <section className="space-y-3" data-testid="contact-dues">
      <h2 className="font-semibold">{t("contactDues")}</h2>
      <div className={sides.length > 1 ? "grid gap-4 lg:grid-cols-2" : ""}>
        {sides.map((side) => (
          <Side key={side} businessId={businessId} contact={contact} side={side} canWrite={canWrite} />
        ))}
      </div>
    </section>
  );
};

const Side = ({ businessId, contact, side, canWrite }: { businessId: string; contact: Contact; side: InvoiceKind; canWrite: boolean }) => {
  const { t } = useTranslation("invoices");
  const money = useMoney();
  const currency = useCurrentBusiness().business?.baseCurrency ?? "BDT";
  const { locale, digitStyle } = useFormatting();
  const aging = useAging(businessId, side, contact.id);
  const invoices = useInvoices(businessId, side, { contactId: contact.id });
  const k = side === "SALE" ? "sale" : "bill";
  const totals = aging.data?.totals;
  const overdue = totals ? BigInt(totals.totalMinor) - BigInt(totals.current) : 0n;
  const recent = (invoices.data ?? []).slice(0, 5);
  const base = `/b/${businessId}/${KIND_PATH[side]}`;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 md:p-5">
        <div>
          <p className="text-sm text-muted-foreground">{t(`${k}_theyOwe`)}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums" data-testid={`contact-due-${side}`}>
            {money(totals?.totalMinor ?? "0", currency)}
          </p>
          {overdue > 0n ? <p className="text-sm text-muted-foreground">{t("overdueOf", { amount: money(overdue, currency) })}</p> : null}
        </div>
        {canWrite && contact.isActive ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={`${base}/new?contactId=${contact.id}`}>
              <Plus />
              {t(`${k}_new`)}
            </Link>
          </Button>
        ) : null}
      </div>
      {recent.length > 0 ? (
        <ul className="divide-y border-t">
          {recent.map((invoice) => (
            <li key={invoice.id} className="relative flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 md:px-5">
              <Link to={`${base}/${invoice.id}`} className="min-w-0 flex-1 font-medium after:absolute after:inset-0">
                {invoice.number ?? t("draftNumber")}
                <span className="block text-xs font-normal text-muted-foreground">{t("dueOn", { date: formatDate(invoice.dueDate, locale, digitStyle) })}</span>
              </Link>
              <span className="tabular-nums">{money(invoice.totalMinor, invoice.currency)}</span>
              <StatusBadge status={invoice.status} overdue={invoice.isOverdue} />
            </li>
          ))}
        </ul>
      ) : null}
      {(invoices.data?.length ?? 0) > 0 ? (
        <Link to={`${base}?contact=${contact.id}`} className="flex items-center justify-between border-t px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground md:px-5">
          {t(`${k}_seeAll`)}
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </Card>
  );
};
