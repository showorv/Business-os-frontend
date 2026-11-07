import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { useMoney } from "@/features/businesses/useMoney";
import type { Contact, ContactKind } from "./api";

export const KindBadge = ({ kind }: { kind: ContactKind }) => {
  const { t } = useTranslation("contacts");
  return <Badge className="border bg-transparent">{t(`kind_${kind}`)}</Badge>;
};

// The contact's totals in the business's own currency (or zero), and any other currencies after it.
export const totalsIn = (contact: Contact, currency: string) => {
  const main = contact.totals.find((row) => row.currency === currency) ?? { currency, receivedMinor: "0", paidMinor: "0", transactions: 0, lastDate: null };
  return { main, others: contact.totals.filter((row) => row.currency !== currency) };
};

// "Received ৳7,500 · Paid ৳1,500", the line under a contact's name.
export const MoneyLine = ({ contact, currency }: { contact: Contact; currency: string }) => {
  const { t } = useTranslation("contacts");
  const money = useMoney();
  const { main } = totalsIn(contact, currency);
  if (main.transactions === 0) return <span>{t("noMoneyYet")}</span>;
  return (
    <span className="tabular-nums">
      {main.receivedMinor !== "0" ? t("receivedAmount", { amount: money(main.receivedMinor, currency) }) : null}
      {main.receivedMinor !== "0" && main.paidMinor !== "0" ? " · " : null}
      {main.paidMinor !== "0" ? t("paidAmount", { amount: money(main.paidMinor, currency) }) : null}
    </span>
  );
};
