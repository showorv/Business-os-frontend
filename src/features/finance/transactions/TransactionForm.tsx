import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { currentLocale } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { minorToInput, parseMoney } from "@/lib/money";
import { CATEGORY_TYPE_FOR, TRANSACTION_TYPES, type Account, type Category, type TransactionDetail, type TransactionType } from "../api";
import { categoryName } from "../names";

const MAIN_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
const PAYMENT_METHODS = ["Cash", "Bank transfer", "Cheque", "bKash", "Nagad", "Card"];

const schema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: z.string().trim().min(1, "required"),
  txnDate: z.string().min(1, "required"),
  accountId: z.string().min(1, "required"),
  toAccountId: z.string(),
  categoryId: z.string(),
  fee: z.string(),
  description: z.string().trim().max(1000, "tooLong"),
  referenceNo: z.string().trim().max(100, "tooLong"),
  paymentMethod: z.string().trim().max(50, "tooLong"),
});
type FormValues = z.infer<typeof schema>;

// What the form hands back: amounts already in paisa, empty boxes left out.
export interface TransactionInput {
  type: TransactionType;
  amountMinor: string;
  feeMinor: string;
  txnDate: string;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  description: string | null;
  referenceNo: string | null;
  paymentMethod: string | null;
}

interface TransactionFormProps {
  currency: string;
  today: string;
  accounts: Account[];
  categories: Category[];
  // Set when editing a draft. Its type can't change: void it and make a new one instead.
  existing?: TransactionDetail;
  // Expenses above this need a second person (null: no limit).
  approvalThresholdMinor: string | null;
  error: unknown;
  pending: boolean;
  // The buttons under the form: "Save draft", "Save and post", or "Save changes".
  actions: { label: string; post: boolean; primary?: boolean }[];
  onSubmit: (input: TransactionInput, post: boolean) => void;
  onCancel: () => void;
}

export const TransactionForm = ({ currency, today, accounts, categories, existing, approvalThresholdMinor, error, pending, actions, onSubmit, onCancel }: TransactionFormProps) => {
  const { t } = useTranslation(["finance", "common", "validation"]);
  const locale = currentLocale();
  const [moreTypes, setMoreTypes] = useState(existing ? !MAIN_TYPES.includes(existing.type as (typeof MAIN_TYPES)[number]) : false);
  const usable = accounts.filter((account) => account.isActive || account.id === existing?.accountId || account.id === existing?.toAccountId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: (existing?.type as TransactionType) ?? "EXPENSE",
      amount: existing ? minorToInput(existing.amountMinor, existing.currency) : "",
      txnDate: existing?.txnDate ?? today,
      accountId: existing?.accountId ?? usable[0]?.id ?? "",
      toAccountId: existing?.toAccountId ?? "",
      categoryId: existing?.categoryId ?? "",
      fee: existing && existing.feeMinor !== "0" ? minorToInput(existing.feeMinor, existing.currency) : "",
      description: existing?.description ?? "",
      referenceNo: existing?.referenceNo ?? "",
      paymentMethod: existing?.paymentMethod ?? "",
    },
  });
  const [type, amount, accountId] = useWatch({ control: form.control, name: ["type", "amount", "accountId"] });
  const { errors } = form.formState;
  const message = (key?: string) => key && t(`validation:${key}`);

  const neededCategory = CATEGORY_TYPE_FOR[type];
  const choices = categories
    .filter((category) => (neededCategory ? category.type === neededCategory : type === "ADJUSTMENT"))
    .filter((category) => category.isActive || category.id === existing?.categoryId)
    .sort((a, b) => categoryName(a, locale).localeCompare(categoryName(b, locale)));

  // Tells the person before they save that a large expense will wait for an owner or admin.
  const amountMinor = parseMoney(amount, currency);
  const needsApproval = type === "EXPENSE" && approvalThresholdMinor !== null && amountMinor !== null && BigInt(amountMinor) > BigInt(approvalThresholdMinor);

  const changeType = (next: TransactionType) => {
    form.setValue("type", next);
    // A category of the wrong kind would be refused, so it's cleared.
    form.setValue("categoryId", "");
    if (next !== "TRANSFER") {
      form.setValue("toAccountId", "");
      form.setValue("fee", "");
    }
  };

  const submit = (post: boolean) =>
    form.handleSubmit((values) => {
      const amountValue = parseMoney(values.amount, currency);
      if (amountValue === null || amountValue === "0") return form.setError("amount", { message: "amount" });
      const feeValue = values.fee.trim() ? parseMoney(values.fee, currency) : "0";
      if (feeValue === null) return form.setError("fee", { message: "amount" });
      if (values.type === "TRANSFER" && !values.toAccountId) return form.setError("toAccountId", { message: "required" });
      if (neededCategory && !values.categoryId) return form.setError("categoryId", { message: "required" });
      onSubmit(
        {
          type: values.type,
          amountMinor: amountValue,
          feeMinor: feeValue,
          txnDate: values.txnDate,
          accountId: values.accountId,
          toAccountId: values.type === "TRANSFER" ? values.toAccountId : null,
          categoryId: values.type === "TRANSFER" ? null : values.categoryId || null,
          description: values.description || null,
          referenceNo: values.referenceNo || null,
          paymentMethod: values.paymentMethod || null,
        },
        post,
      );
    })();

  const accountLabel = type === "INCOME" ? t("finance:receivedInto") : type === "TRANSFER" ? t("finance:fromAccount") : type === "ADJUSTMENT" ? t("finance:account") : t("finance:paidFrom");

  return (
    <Card>
      <CardContent>
        <form onSubmit={(event) => (event.preventDefault(), submit(actions[0]?.post ?? false))} className="space-y-5" noValidate>
          {error ? <Alert tone="danger">{errorMessage(error)}</Alert> : null}

          {existing ? (
            <p className="text-sm">
              <span className="text-muted-foreground">{t("finance:type")}: </span>
              <span className="font-medium">{t(`finance:type_${type}`)}</span>
            </p>
          ) : (
            <div className="space-y-2">
              <Segmented
                label={t("finance:type")}
                className="flex w-full sm:inline-flex sm:w-auto"
                value={(MAIN_TYPES as readonly string[]).includes(type) ? type : ("" as TransactionType)}
                options={MAIN_TYPES.map((value) => ({ value, label: t(`finance:type_${value}`) }))}
                onChange={changeType}
              />
              {moreTypes ? (
                <Field label={t("finance:otherType")}>
                  <Select value={(MAIN_TYPES as readonly string[]).includes(type) ? "" : type} onChange={(event) => event.target.value && changeType(event.target.value as TransactionType)}>
                    <option value="">{t("finance:chooseOne")}</option>
                    <option value="REFUND">{t("finance:type_REFUND")}</option>
                    <option value="ADJUSTMENT">{t("finance:type_ADJUSTMENT")}</option>
                  </Select>
                </Field>
              ) : (
                <Button variant="link" className="text-sm" onClick={() => setMoreTypes(true)}>
                  {t("finance:moreTypes")}
                </Button>
              )}
              {type === "REFUND" || type === "ADJUSTMENT" ? <p className="text-sm text-muted-foreground">{t(`finance:typeHint_${type}`)}</p> : null}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("finance:amount")} error={message(errors.amount?.message)}>
              <MoneyInput currency={currency} placeholder="0.00" autoFocus={!existing} {...form.register("amount")} />
            </Field>
            <Field label={t("finance:date")} error={message(errors.txnDate?.message)}>
              <Input type="date" {...form.register("txnDate")} />
            </Field>
          </div>
          {needsApproval ? <Alert>{t("finance:needsApprovalHint")}</Alert> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={accountLabel} error={message(errors.accountId?.message)}>
              <Select {...form.register("accountId")}>
                {usable.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </Field>
            {type === "TRANSFER" ? (
              <Field label={t("finance:toAccount")} error={message(errors.toAccountId?.message)}>
                <Select {...form.register("toAccountId")}>
                  <option value="">{t("finance:chooseOne")}</option>
                  {usable
                    .filter((account) => account.id !== accountId)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </Select>
              </Field>
            ) : (
              <Field label={neededCategory ? t("finance:category") : `${t("finance:category")} (${t("common:optional")})`} error={message(errors.categoryId?.message)}>
                <Select {...form.register("categoryId")}>
                  <option value="">{t("finance:chooseOne")}</option>
                  {choices.map((category) => (
                    <option key={category.id} value={category.id}>
                      {categoryName(category, locale)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          {type === "TRANSFER" ? (
            <Field label={`${t("finance:fee")} (${t("common:optional")})`} error={message(errors.fee?.message)} hint={t("finance:feeHint")}>
              <MoneyInput currency={currency} placeholder="0.00" {...form.register("fee")} />
            </Field>
          ) : null}

          <Field label={`${t("finance:description")} (${t("common:optional")})`} error={message(errors.description?.message)}>
            <Input {...form.register("description")} placeholder={t("finance:descriptionPlaceholder")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`${t("finance:paymentMethod")} (${t("common:optional")})`} error={message(errors.paymentMethod?.message)}>
              <Input list="payment-methods" {...form.register("paymentMethod")} />
            </Field>
            <Field label={`${t("finance:referenceNo")} (${t("common:optional")})`} error={message(errors.referenceNo?.message)} hint={t("finance:referenceHint")}>
              <Input {...form.register("referenceNo")} />
            </Field>
          </div>
          <datalist id="payment-methods">
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method} />
            ))}
          </datalist>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onCancel}>
              {t("common:cancel")}
            </Button>
            {/* The main button goes last: rightmost on a laptop, on top on a phone (the row is reversed there). */}
            {[...actions].sort((a, b) => Number(Boolean(a.primary)) - Number(Boolean(b.primary))).map((action) => (
              <Button key={action.label} variant={action.primary ? "primary" : "outline"} disabled={pending} onClick={() => submit(action.post)}>
                {action.label}
              </Button>
            ))}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
