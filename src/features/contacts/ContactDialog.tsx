import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { errorMessage } from "@/lib/errors";
import { CONTACT_KINDS, useCreateContact, useUpdateContact, type Contact, type ContactKind } from "./api";

interface ContactDialogProps {
  businessId: string;
  // A contact to edit. Without one, the dialog adds a new one of `kind`.
  contact?: Contact;
  kind?: ContactKind;
  onClose: () => void;
  // Hands back the new contact, so a form that opened this can pick it.
  onCreated?: (contact: Contact) => void;
}

const FIELDS = ["company", "phone", "email", "address", "taxId", "notes"] as const;
type Draft = { kind: ContactKind; name: string } & Record<(typeof FIELDS)[number], string>;

export const ContactDialog = ({ businessId, contact, kind = "CUSTOMER", onClose, onCreated }: ContactDialogProps) => {
  const { t } = useTranslation(["contacts", "common"]);
  const create = useCreateContact(businessId);
  const update = useUpdateContact(businessId);
  const [draft, setDraft] = useState<Draft>({
    kind: contact?.kind ?? kind,
    name: contact?.name ?? "",
    ...(Object.fromEntries(FIELDS.map((field) => [field, contact?.[field] ?? ""])) as Record<(typeof FIELDS)[number], string>),
  });
  const set = (field: keyof Draft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    // Empty boxes clear a field when editing, and are left out when adding.
    const optional = Object.fromEntries(FIELDS.map((field) => [field, draft[field].trim() || null]));
    if (contact) {
      update.mutate({ contactId: contact.id, kind: draft.kind, name: draft.name.trim(), ...optional }, { onSuccess: () => (toast.success(t("common:saved")), onClose()) });
    } else {
      const filled = Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== null));
      create.mutate(
        { kind: draft.kind, name: draft.name.trim(), ...filled },
        {
          onSuccess: (created) => {
            toast.success(t("added", { name: created.name }));
            onCreated?.(created);
            onClose();
          },
        },
      );
    }
  };

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent title={contact ? t("edit") : t("add")} className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <form onSubmit={submit} className="space-y-4" data-testid="contact-form">
          {error ? <Alert tone="danger">{errorMessage(error)}</Alert> : null}
          <Segmented label={t("kind")} value={draft.kind} onChange={(value) => set("kind", value)} options={CONTACT_KINDS.map((value) => ({ value, label: t(`kind_${value}`) }))} />
          <Field label={t("name")} hint={t("nameHint")}>
            <Input autoFocus required maxLength={120} value={draft.name} onChange={(event) => set("name", event.target.value)} />
          </Field>
          <Field label={`${t("company")} (${t("common:optional")})`}>
            <Input maxLength={120} value={draft.company} onChange={(event) => set("company", event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`${t("phone")} (${t("common:optional")})`}>
              <Input type="tel" inputMode="tel" maxLength={30} value={draft.phone} onChange={(event) => set("phone", event.target.value)} />
            </Field>
            <Field label={`${t("email")} (${t("common:optional")})`}>
              <Input type="email" maxLength={254} value={draft.email} onChange={(event) => set("email", event.target.value)} />
            </Field>
          </div>
          <Field label={`${t("address")} (${t("common:optional")})`}>
            <Input maxLength={300} value={draft.address} onChange={(event) => set("address", event.target.value)} />
          </Field>
          <Field label={`${t("taxId")} (${t("common:optional")})`} hint={t("taxIdHint")}>
            <Input maxLength={30} value={draft.taxId} onChange={(event) => set("taxId", event.target.value)} />
          </Field>
          <Field label={`${t("notes")} (${t("common:optional")})`}>
            <Input maxLength={1000} value={draft.notes} onChange={(event) => set("notes", event.target.value)} />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={pending || !draft.name.trim()}>
              {contact ? t("common:save") : t("add")}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
