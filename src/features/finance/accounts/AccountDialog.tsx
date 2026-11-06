import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { parseMoney } from "@/lib/money";
import { ACCOUNT_TYPES, useCreateAccount, useUpdateAccount, type Account } from "../api";

// A bank number or wallet phone. The server keeps only the last 4 digits.
const accountNumber = z
  .string()
  .trim()
  .refine((value) => value === "" || /^[\d০-৯\s+-]{4,34}$/.test(value), "accountNumber");

const createSchema = z.object({
  name: z.string().trim().min(1, "required").max(120, "tooLong"),
  type: z.enum(ACCOUNT_TYPES),
  openingBalance: z.string(),
  openingDate: z.string().min(1, "required"),
  accountNumber,
});

const editSchema = z.object({ name: z.string().trim().min(1, "required").max(120, "tooLong"), accountNumber });

interface AccountDialogProps {
  businessId: string;
  currency: string;
  timezone: string;
  // An account to edit. Without one, the dialog adds a new account.
  account?: Account;
  onClose: () => void;
}

export const AccountDialog = (props: AccountDialogProps) => (props.account ? <EditAccount {...props} account={props.account} /> : <CreateAccount {...props} />);

const CreateAccount = ({ businessId, currency, timezone, onClose }: AccountDialogProps) => {
  const { t } = useTranslation(["finance", "common", "validation"]);
  const create = useCreateAccount(businessId);
  const form = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", type: "BANK" as (typeof ACCOUNT_TYPES)[number], openingBalance: "", openingDate: todayIn(timezone), accountNumber: "" },
  });
  const type = useWatch({ control: form.control, name: "type" });
  const { errors } = form.formState;
  const message = (key?: string) => key && t(`validation:${key}`);

  const submit = form.handleSubmit((values) => {
    const opening = values.openingBalance.trim() === "" ? "0" : parseMoney(values.openingBalance, currency);
    if (opening === null) {
      form.setError("openingBalance", { message: "amount" });
      return;
    }
    create.mutate(
      {
        name: values.name,
        type: values.type,
        openingBalanceMinor: opening,
        openingDate: values.openingDate,
        ...(values.accountNumber ? { accountNumber: values.accountNumber } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t("finance:accountAdded"));
          onClose();
        },
      },
    );
  });

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent title={t("finance:addAccount")} description={t("finance:addAccountHint")}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {create.isError ? <Alert tone="danger">{errorMessage(create.error)}</Alert> : null}
          <Field label={t("finance:accountName")} error={message(errors.name?.message)} hint={t("finance:accountNameHint")}>
            <Input autoFocus {...form.register("name")} />
          </Field>
          <Field label={t("finance:accountType")}>
            <Select {...form.register("type")}>
              {ACCOUNT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`finance:accountType_${value}`)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("finance:openingBalance")} error={message(errors.openingBalance?.message)} hint={t("finance:openingBalanceHint")}>
              <MoneyInput currency={currency} placeholder="0.00" {...form.register("openingBalance")} />
            </Field>
            <Field label={t("finance:openingDate")} error={message(errors.openingDate?.message)}>
              <Input type="date" {...form.register("openingDate")} />
            </Field>
          </div>
          {type !== "CASH" ? (
            <Field label={`${t("finance:accountNumber")} (${t("common:optional")})`} error={message(errors.accountNumber?.message)} hint={t("finance:accountNumberHint")}>
              <Input inputMode="tel" autoComplete="off" {...form.register("accountNumber")} />
            </Field>
          ) : null}
          <DialogButtons pending={create.isPending} onClose={onClose} label={t("finance:addAccount")} />
        </form>
      </ModalContent>
    </Modal>
  );
};

const EditAccount = ({ businessId, account, onClose }: AccountDialogProps & { account: Account }) => {
  const { t } = useTranslation(["finance", "common", "validation"]);
  const update = useUpdateAccount(businessId);
  const form = useForm({ resolver: zodResolver(editSchema), defaultValues: { name: account.name, accountNumber: "" } });
  const { errors } = form.formState;
  const message = (key?: string) => key && t(`validation:${key}`);

  // A blank number box keeps the saved number. Only a new number replaces it.
  const submit = form.handleSubmit((values) =>
    update.mutate(
      { accountId: account.id, name: values.name, ...(values.accountNumber ? { accountNumber: values.accountNumber } : {}) },
      {
        onSuccess: () => {
          toast.success(t("common:saved"));
          onClose();
        },
      },
    ),
  );

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent title={t("finance:editAccount")}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {update.isError ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}
          <Field label={t("finance:accountName")} error={message(errors.name?.message)}>
            <Input autoFocus {...form.register("name")} />
          </Field>
          {account.type !== "CASH" ? (
            <Field
              label={`${t("finance:accountNumber")} (${t("common:optional")})`}
              error={message(errors.accountNumber?.message)}
              hint={account.maskedNumber ? t("finance:accountNumberSaved", { number: account.maskedNumber }) : t("finance:accountNumberHint")}
            >
              <Input inputMode="tel" autoComplete="off" {...form.register("accountNumber")} />
            </Field>
          ) : null}
          <p className="text-sm text-muted-foreground">{t("finance:openingLocked")}</p>
          <DialogButtons pending={update.isPending} onClose={onClose} label={t("common:save")} />
        </form>
      </ModalContent>
    </Modal>
  );
};

const DialogButtons = ({ pending, onClose, label }: { pending: boolean; onClose: () => void; label: string }) => {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="outline" onClick={onClose}>
        {t("cancel")}
      </Button>
      <Button type="submit" disabled={pending}>
        {label}
      </Button>
    </div>
  );
};
