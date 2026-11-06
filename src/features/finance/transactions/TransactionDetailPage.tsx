import { ArrowLeft, Check, Copy, Pencil, RotateCcw, Send, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { useAppSelector } from "@/app/store";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { currentLocale } from "@/i18n";
import { formatDate, formatDateTime } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { useAccounts, useCategories, useReverseTransaction, useTransaction, useTransactionStep, type TransactionDetail, type TransactionStep } from "../api";
import { categoryName } from "../names";
import { AttachmentsCard } from "./AttachmentsCard";
import { amountSign, StatusBadge } from "./parts";

type Confirming = TransactionStep | "reverse";

export const TransactionDetailPage = () => {
  const { t } = useTranslation(["finance", "shell"]);
  const { businessId, transactionId } = useParams() as { businessId: string; transactionId: string };
  const transaction = useTransaction(businessId, transactionId);
  const access = useAccess(businessId);
  const accounts = useAccounts(businessId);
  const categories = useCategories(businessId);
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();

  if (transaction.isError) return <Alert tone="danger">{errorMessage(transaction.error)}</Alert>;
  if (!transaction.data || access.isLoading) return <Spinner className="mt-16" />;
  const txn = transaction.data;
  const account = accounts.data?.find((item) => item.id === txn.accountId);
  const toAccount = accounts.data?.find((item) => item.id === txn.toAccountId);
  const category = categories.data?.find((item) => item.id === txn.categoryId);

  const rows: [string, ReactNode][] = [
    [t("finance:type"), t(`finance:type_${txn.type}`)],
    [t("finance:date"), formatDate(txn.txnDate, locale, digitStyle)],
    [txn.type === "TRANSFER" ? t("finance:fromAccount") : t("finance:account"), account?.name ?? "—"],
    ...(txn.type === "TRANSFER" ? ([[t("finance:toAccount"), toAccount?.name ?? "—"]] as [string, ReactNode][]) : []),
    ...(txn.feeMinor !== "0" ? ([[t("finance:fee"), money(txn.feeMinor, txn.currency)]] as [string, ReactNode][]) : []),
    ...(category ? ([[t("finance:category"), categoryName(category, currentLocale())]] as [string, ReactNode][]) : []),
    ...(txn.paymentMethod ? ([[t("finance:paymentMethod"), txn.paymentMethod]] as [string, ReactNode][]) : []),
    ...(txn.referenceNo ? ([[t("finance:referenceNo"), txn.referenceNo]] as [string, ReactNode][]) : []),
    [t("finance:source"), t(`finance:source_${txn.source}`, { defaultValue: txn.source })],
    [t("finance:createdAt"), formatDateTime(txn.createdAt, locale, digitStyle)],
    ...(txn.approvedAt ? ([[t("finance:approvedAt"), formatDateTime(txn.approvedAt, locale, digitStyle)]] as [string, ReactNode][]) : []),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to=".." relative="path" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t("shell:transactions")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{txn.number}</p>
          <h1 className="text-2xl font-semibold break-words">{txn.description || categoryName(category, currentLocale()) || t(`finance:type_${txn.type}`)}</h1>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-semibold tabular-nums ${txn.status === "VOID" || txn.status === "REJECTED" ? "text-muted-foreground line-through" : ""}`}>
            {amountSign(txn.type)}
            {money(txn.amountMinor, txn.currency)}
          </p>
          <StatusBadge status={txn.status} className="mt-1" />
        </div>
      </div>

      <StatusNotice transaction={txn} />
      <Actions businessId={businessId} transaction={txn} access={access} />

      <Card>
        <CardHeader>
          <CardTitle>{t("finance:details")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <AttachmentsCard
        businessId={businessId}
        transaction={txn}
        canChange={access.can(Permission.FINANCE_WRITE) && access.can(Permission.DOCUMENTS_WRITE) && access.writable && txn.status !== "VOID"}
      />
    </div>
  );
};

// A sentence on what this status means and what happens next.
const StatusNotice = ({ transaction }: { transaction: TransactionDetail }) => {
  const { t } = useTranslation("finance");
  return (
    <div className="space-y-2">
      {transaction.possibleDuplicate ? (
        <Alert tone="warning" className="flex items-start gap-2">
          <Copy className="mt-0.5 size-4 shrink-0" />
          <span>
            {t("duplicateNotice")}{" "}
            {transaction.duplicateOfId ? (
              <Link to={`../${transaction.duplicateOfId}`} relative="path" className="font-medium underline">
                {t("openOther")}
              </Link>
            ) : null}
          </span>
        </Alert>
      ) : null}
      <p className="text-sm text-muted-foreground">{t(`statusHint_${transaction.status}`)}</p>
    </div>
  );
};

interface ActionsProps {
  businessId: string;
  transaction: TransactionDetail;
  access: ReturnType<typeof useAccess>;
}

// The buttons depend on the status and on what this person may do. The server checks again.
const Actions = ({ businessId, transaction, access }: ActionsProps) => {
  const { t } = useTranslation(["finance", "common"]);
  const myId = useAppSelector((state) => state.auth.user?.id);
  const step = useTransactionStep(businessId);
  const reverse = useReverseTransaction(businessId);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const [memo, setMemo] = useState("");
  if (!access.writable) return null;

  const can = access.can;
  const status = transaction.status;
  // The person who made a transaction can't approve it: approval needs a second person.
  const isMine = transaction.createdBy === myId;
  const buttons: { key: Confirming; label: string; icon: typeof Send; danger?: boolean; primary?: boolean }[] = [];
  if (status === "DRAFT" && can(Permission.LEDGER_POST)) buttons.push({ key: "post", label: t("finance:post"), icon: Send, primary: true });
  if (status === "DRAFT" && can(Permission.FINANCE_WRITE)) buttons.push({ key: "void", label: t("finance:void"), icon: Trash2, danger: true });
  if (status === "PENDING_APPROVAL" && can(Permission.TRANSACTIONS_APPROVE) && !isMine) {
    buttons.push({ key: "approve", label: t("finance:approve"), icon: Check, primary: true }, { key: "reject", label: t("finance:reject"), icon: X, danger: true });
  }
  if (status === "POSTED" && can(Permission.LEDGER_REVERSE)) buttons.push({ key: "reverse", label: t("finance:reverse"), icon: RotateCcw, danger: true });
  if (transaction.possibleDuplicate && status !== "VOID" && can(Permission.FINANCE_WRITE)) buttons.push({ key: "dismissDuplicate", label: t("finance:notDuplicate"), icon: Check });

  const waitingForSomeoneElse = status === "PENDING_APPROVAL" && (!can(Permission.TRANSACTIONS_APPROVE) || isMine);
  const editable = status === "DRAFT" && can(Permission.FINANCE_WRITE);
  if (buttons.length === 0 && !editable && !waitingForSomeoneElse) return null;

  const done = (key: Confirming) => {
    setConfirming(null);
    setMemo("");
    toast.success(t(`finance:done_${key}`));
  };
  const run = () => {
    if (!confirming) return;
    if (confirming === "reverse") reverse.mutate({ transactionId: transaction.id, memo: memo.trim() || undefined }, { onSuccess: () => done("reverse") });
    else step.mutate({ transactionId: transaction.id, step: confirming }, { onSuccess: () => done(confirming) });
  };
  const failed = confirming === "reverse" ? reverse.error : step.error;
  const close = () => {
    setConfirming(null);
    step.reset();
    reverse.reset();
  };

  return (
    <div className="space-y-2">
      {waitingForSomeoneElse ? <Alert>{isMine && can(Permission.TRANSACTIONS_APPROVE) ? t("finance:cantApproveOwn") : t("finance:waitingForApprover")}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {editable ? (
          <Button variant="outline" asChild>
            <Link to="edit">
              <Pencil />
              {t("finance:edit")}
            </Link>
          </Button>
        ) : null}
        {buttons.map(({ key, label, icon: Icon, danger, primary }) => (
          <Button key={key} variant={primary ? "primary" : danger ? "outline" : "outline"} className={danger ? "text-danger" : undefined} onClick={() => setConfirming(key)}>
            <Icon />
            {label}
          </Button>
        ))}
      </div>
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && close()}
        title={confirming ? t(`finance:confirmTitle_${confirming}`) : ""}
        description={confirming ? t(`finance:confirmBody_${confirming}`) : undefined}
        confirmLabel={confirming ? t(`finance:confirmButton_${confirming}`) : ""}
        danger={confirming === "void" || confirming === "reject" || confirming === "reverse"}
        pending={step.isPending || reverse.isPending}
        onConfirm={run}
      >
        <div className="space-y-3">
          {failed ? <Alert tone="danger">{errorMessage(failed)}</Alert> : null}
          {confirming === "reverse" ? (
            <Field label={`${t("finance:reverseMemo")} (${t("common:optional")})`}>
              <Input value={memo} onChange={(event) => setMemo(event.target.value)} maxLength={500} />
            </Field>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  );
};
