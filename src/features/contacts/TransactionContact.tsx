import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import { useAllContacts, useSetTransactionContact } from "./api";

// The customer or supplier on a transaction, with a way to set or change it. The books don't change,
// so this works after posting too (not on a voided one).
export const TransactionContact = ({ businessId, transactionId, contactId, canChange }: { businessId: string; transactionId: string; contactId: string | null; canChange: boolean }) => {
  const { t } = useTranslation(["finance", "common"]);
  const contacts = useAllContacts(businessId);
  const setContact = useSetTransactionContact(businessId, transactionId);
  const [changing, setChanging] = useState(false);
  const current = contacts.data?.find((contact) => contact.id === contactId);
  const choices = (contacts.data ?? []).filter((contact) => contact.isActive || contact.id === contactId);

  if (changing) {
    return (
      <span className="flex flex-col items-end gap-1">
        <Select
          aria-label={t("finance:contact")}
          className="h-9 w-56 max-w-full"
          autoFocus
          defaultValue={contactId ?? ""}
          disabled={setContact.isPending}
          onChange={(event) =>
            setContact.mutate(event.target.value || null, {
              onSuccess: () => (toast.success(t("common:saved")), setChanging(false)),
              onError: (error) => toast.error(errorMessage(error)),
            })
          }
        >
          <option value="">{t("finance:noContact")}</option>
          {choices.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </Select>
        <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setChanging(false)}>
          {t("common:cancel")}
        </Button>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      {current ? (
        <Link to={`/b/${businessId}/contacts/${current.id}`} className="underline-offset-4 hover:underline" data-testid="transaction-contact">
          {current.name}
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
      {canChange ? (
        <Button variant="link" className="h-auto p-0 text-xs font-normal" onClick={() => setChanging(true)}>
          {contactId ? t("finance:change") : t("finance:addContact")}
        </Button>
      ) : null}
    </span>
  );
};
