import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { useAllContacts, type Contact } from "@/features/contacts/api";
import { ContactDialog } from "@/features/contacts/ContactDialog";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAccess, type BusinessSettings } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { newRequestKey, useAccounts, useCategories, useCreateTransaction, useTransaction, useUpdateTransaction } from "../api";
import { isTransactionType } from "./parts";
import { TransactionForm, type TransactionInput } from "./TransactionForm";

// Fields the server wants left out rather than sent empty when creating.
const withoutEmpty = (input: TransactionInput) =>
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null)) as { [K in keyof TransactionInput]: Exclude<TransactionInput[K], null> };

const BackLink = ({ to, label }: { to: string; label: string }) => (
  <Link to={to} relative="path" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
    <ArrowLeft className="size-4" />
    {label}
  </Link>
);

// What the form needs from the business: accounts, categories, today's date there, the approval limit.
const useFormContext = (businessId: string) => {
  const { business } = useCurrentBusiness();
  const accounts = useAccounts(businessId);
  const categories = useCategories(businessId);
  const contacts = useAllContacts(businessId);
  // The "add a customer or supplier" dialog, opened from the form; `pick` selects the new one.
  const [adding, setAdding] = useState<{ kind: Contact["kind"]; pick: (contact: Contact) => void } | null>(null);
  const settings = business?.settings as Partial<BusinessSettings> | undefined;
  return {
    business,
    accounts: accounts.data,
    categories: categories.data,
    contacts: contacts.data ?? [],
    ready: Boolean(business && accounts.data && categories.data && (contacts.data || contacts.isError)),
    onAddContact: (kind: Contact["kind"], pick: (contact: Contact) => void) => setAdding({ kind, pick }),
    contactDialog: adding ? <ContactDialog businessId={businessId} kind={adding.kind} onCreated={adding.pick} onClose={() => setAdding(null)} /> : null,
    approvalThresholdMinor: settings?.approvalThresholdMinor ?? null,
  };
};

export const NewTransactionPage = () => {
  const { t } = useTranslation(["finance", "shell"]);
  const businessId = useParams().businessId!;
  const navigate = useNavigate();
  const access = useAccess(businessId);
  const context = useFormContext(businessId);
  const create = useCreateTransaction(businessId);
  // One key for this form, so a double click or a retry after a dropped connection creates it once.
  const [requestKey] = useState(newRequestKey);
  // Opened from a contact's page: ?contactId=…&type=INCOME
  const [params] = useSearchParams();
  const initialType = params.get("type");
  const initial = { contactId: params.get("contactId") ?? undefined, type: isTransactionType(initialType) ? initialType : undefined };
  if (!context.ready || access.isLoading) return <Spinner className="mt-16" />;
  if (!access.can(Permission.FINANCE_WRITE) || !access.writable) return <Navigate to=".." relative="path" replace />;

  const canPost = access.can(Permission.LEDGER_POST);
  const submit = (input: TransactionInput, post: boolean) =>
    create.mutate(
      { ...withoutEmpty(input), postNow: post, requestKey },
      {
        onSuccess: (created) => {
          toast.success(t(created.status === "PENDING_APPROVAL" ? "finance:sentForApproval" : created.status === "POSTED" ? "finance:posted" : "finance:draftSaved"));
          void navigate(`../${created.id}`, { relative: "path", replace: true });
        },
      },
    );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackLink to=".." label={t("shell:transactions")} />
      <h1 className="text-2xl font-semibold">{t("finance:newTransaction")}</h1>
      {context.accounts!.filter((account) => account.isActive).length === 0 ? (
        <Alert>{t("finance:needAccountFirst")}</Alert>
      ) : (
        <TransactionForm
          currency={context.business!.baseCurrency}
          today={todayIn(context.business!.timezone)}
          accounts={context.accounts!}
          categories={context.categories!}
          contacts={context.contacts}
          initial={initial}
          onAddContact={context.onAddContact}
          approvalThresholdMinor={context.approvalThresholdMinor}
          error={create.error}
          pending={create.isPending}
          // People who can post see "Save and post" first; others can only save a draft for someone to post.
          actions={canPost ? [{ label: t("finance:saveAndPost"), post: true, primary: true }, { label: t("finance:saveDraft"), post: false }] : [{ label: t("finance:saveDraft"), post: false, primary: true }]}
          onSubmit={submit}
          onCancel={() => void navigate("..", { relative: "path" })}
        />
      )}
      {context.contactDialog}
    </div>
  );
};

// Only drafts can be edited. Anything else has already reached, or is waiting for, the books.
export const EditTransactionPage = () => {
  const { t } = useTranslation("finance");
  const { businessId, transactionId } = useParams() as { businessId: string; transactionId: string };
  const navigate = useNavigate();
  const access = useAccess(businessId);
  const context = useFormContext(businessId);
  const transaction = useTransaction(businessId, transactionId);
  const update = useUpdateTransaction(businessId, transactionId);
  if (transaction.isError) return <Alert tone="danger">{errorMessage(transaction.error)}</Alert>;
  if (!context.ready || access.isLoading || !transaction.data) return <Spinner className="mt-16" />;
  if (transaction.data.status !== "DRAFT" || !access.can(Permission.FINANCE_WRITE) || !access.writable) return <Navigate to=".." relative="path" replace />;

  const submit = ({ type: _type, ...input }: TransactionInput) =>
    update.mutate(input, {
      onSuccess: () => {
        toast.success(t("draftSaved"));
        void navigate("..", { relative: "path" });
      },
    });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackLink to=".." label={transaction.data.number} />
      <h1 className="text-2xl font-semibold">{t("editDraft")}</h1>
      <TransactionForm
        currency={transaction.data.currency}
        today={todayIn(context.business!.timezone)}
        accounts={context.accounts!}
        categories={context.categories!}
        contacts={context.contacts}
        onAddContact={context.onAddContact}
        existing={transaction.data}
        approvalThresholdMinor={context.approvalThresholdMinor}
        error={update.error}
        pending={update.isPending}
        actions={[{ label: t("saveChanges"), post: false, primary: true }]}
        onSubmit={submit}
        onCancel={() => void navigate("..", { relative: "path" })}
      />
      {context.contactDialog}
    </div>
  );
};
