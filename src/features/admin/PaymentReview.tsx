import { Check, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { errorMessage } from "@/lib/errors";
import { parseMoney } from "@/lib/money";
import { MANUAL_METHODS } from "@/features/billing/api";
import { useAdminPayments, useAdminPlans, useApprovePayment, useRecordPayment, useRejectPayment, type AdminPayment, type ManualSettings, type WorkspaceDetail } from "./api";
import { useAdminFormat } from "./parts";

// Payments made by hand: a customer sent money by bKash, Nagad, Rocket or bank and told the app. The admin
// checks it arrived (in the bKash app, or the bank statement), then approves it, which starts the plan
// and sends the receipt, or rejects it with a reason the customer sees.

const QUICK_REASONS = ["reasonNotFound", "reasonAmount", "reasonNotYet"] as const;

const ReviewCard = ({ payment }: { payment: AdminPayment }) => {
  const { t } = useTranslation(["admin", "billing"]);
  const { money, dateTime } = useAdminFormat();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const approve = useApprovePayment(() => (setApproving(false), toast.success(t("approved"))));
  const reject = useRejectPayment(() => (setRejecting(false), setReason(""), toast.success(t("rejected"))));
  const amount = money(payment.amountMinor, payment.currency);
  const method = t(`billing:method_${payment.method}`, { defaultValue: payment.method ?? "" });
  const period = t(`billing:${payment.billingCycle === "YEARLY" ? "oneYear" : "oneMonth"}`);

  return (
    <Card className="space-y-4 p-5" data-testid="review-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{amount}</p>
          <p className="text-sm text-muted-foreground">
            {method} · {payment.planName}, {period}
          </p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">{dateTime(payment.createdAt)}</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">{t("account")}</dt>
        <dd className="min-w-0">
          <Link to={`/admin/workspaces/${payment.workspaceId}`} className="font-medium underline-offset-4 hover:underline">
            {payment.billedTo?.name ?? "—"}
          </Link>
          <span className="block truncate text-xs text-muted-foreground">{payment.billedTo?.email}</span>
        </dd>
        <dt className="text-muted-foreground">{t("transactionId")}</dt>
        <dd className="font-mono font-semibold break-all" data-testid="review-reference">
          {payment.gatewayRef}
        </dd>
        <dt className="text-muted-foreground">{t("theirReference")}</dt>
        <dd className="font-mono">{payment.payReference}</dd>
        {payment.couponCode ? (
          <>
            <dt className="text-muted-foreground">{t("couponCol")}</dt>
            <dd className="font-mono">{payment.couponCode}</dd>
          </>
        ) : null}
      </dl>
      <p className="text-xs text-muted-foreground">{t("checkFirst", { amount, method })}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setApproving(true)}>
          <Check />
          {t("approve")}
        </Button>
        <Button variant="outline" onClick={() => setRejecting(true)}>
          <X />
          {t("reject")}
        </Button>
      </div>

      <ConfirmDialog
        open={approving}
        onOpenChange={setApproving}
        title={t("approveTitle", { amount, method })}
        description={t("approveBody", { plan: payment.planName, period, who: payment.billedTo?.name ?? "" })}
        confirmLabel={t("approve")}
        pending={approve.isPending}
        onConfirm={() => approve.mutate(payment.id)}
      >
        {approve.isError ? <Alert tone="danger">{errorMessage(approve.error)}</Alert> : null}
      </ConfirmDialog>
      <ConfirmDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={t("rejectTitle")}
        description={t("rejectBody")}
        confirmLabel={t("reject")}
        danger
        pending={reject.isPending || reason.trim().length < 3}
        onConfirm={() => reject.mutate({ paymentId: payment.id, reason: reason.trim() })}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((key) => (
              <Button key={key} size="sm" variant="outline" onClick={() => setReason(t(key))}>
                {t(key)}
              </Button>
            ))}
          </div>
          <Field label={t("reasonForCustomer")} error={reject.isError ? errorMessage(reject.error) : undefined}>
            <Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} />
          </Field>
        </div>
      </ConfirmDialog>
    </Card>
  );
};

// At the top of the Payments page while any payment waits for a check.
export const ReviewQueue = () => {
  const { t } = useTranslation("admin");
  const waiting = useAdminPayments({ review: "true", page: 1 });
  const items = waiting.data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <section className="mb-8 space-y-3" data-testid="review-queue">
      <div>
        <h2 className="text-lg font-semibold">{t("toReviewTitle", { count: waiting.data!.total })}</h2>
        <p className="text-sm text-muted-foreground">{t("toReviewHint")}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((payment) => (
          <ReviewCard key={payment.id} payment={payment} />
        ))}
      </div>
    </section>
  );
};

const RECORD_METHODS = ["bkash", "nagad", "rocket", "bank", "cash", "other"] as const;
type RecordMethod = (typeof RECORD_METHODS)[number];
type Cycle = "MONTHLY" | "YEARLY";

const takaOf = (minor: string) => String(Number(minor) / 100);

// Money that came another way: cash in hand, or a transfer the customer didn't tell the app about.
export const RecordPayment = ({ workspace }: { workspace: WorkspaceDetail }) => {
  const { t } = useTranslation(["admin", "billing"]);
  const { money } = useAdminFormat();
  const plans = useAdminPlans();
  const record = useRecordPayment(workspace.id);
  const paidPlans = (plans.data ?? []).filter((plan) => plan.key !== "free" && (plan.priceMonthlyMinor !== "0" || plan.priceYearlyMinor !== "0"));
  const [planKey, setPlanKey] = useState("pro");
  const [cycle, setCycle] = useState<Cycle>("YEARLY");
  const [amount, setAmount] = useState<string | null>(null);
  const [method, setMethod] = useState<RecordMethod>("cash");
  const [reference, setReference] = useState("");
  const [confirming, setConfirming] = useState(false);
  const plan = paidPlans.find((item) => item.key === planKey);
  const listPrice = plan ? (cycle === "YEARLY" ? plan.priceYearlyMinor : plan.priceMonthlyMinor) : "0";
  // The plan's price until the admin types another amount.
  const amountText = amount ?? takaOf(listPrice);
  const amountMinor = parseMoney(amountText, plan?.currency ?? "BDT");
  const valid = Boolean(plan && amountMinor && BigInt(amountMinor) > 0n);

  const save = () =>
    record.mutate(
      { planKey, billingCycle: cycle, amountMinor: amountMinor!, method, reference: reference.trim() || undefined },
      { onSuccess: () => (setConfirming(false), setAmount(null), setReference(""), toast.success(t("paymentRecorded"))) },
    );

  return (
    <Card className="space-y-4 p-5" data-testid="record-payment">
      <div>
        <h2 className="font-semibold">{t("recordPayment")}</h2>
        <p className="text-sm text-muted-foreground">{t("recordPaymentHint")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("plan")}>
          <Select value={planKey} onChange={(event) => (setPlanKey(event.target.value), setAmount(null))}>
            {paidPlans.map((item) => (
              <option key={item.key} value={item.key}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t("billing:billingCycle")}</span>
          <Segmented
            label={t("billing:billingCycle")}
            value={cycle}
            onChange={(value) => (setCycle(value), setAmount(null))}
            options={[
              { value: "MONTHLY", label: t("billing:monthly") },
              { value: "YEARLY", label: t("billing:yearly") },
            ]}
          />
        </div>
        <Field label={t("amountReceived")} hint={t("listPrice", { amount: money(listPrice, plan?.currency) })}>
          <MoneyInput currency={plan?.currency ?? "BDT"} inputMode="decimal" value={amountText} onChange={(event) => setAmount(event.target.value)} />
        </Field>
        <Field label={t("billing:paidWith")}>
          <Select value={method} onChange={(event) => setMethod(event.target.value as RecordMethod)}>
            {RECORD_METHODS.map((value) => (
              <option key={value} value={value}>
                {t(`billing:method_${value}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("transactionIdOptional")}>
        <Input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={60} className="font-mono" />
      </Field>
      {record.isError ? <Alert tone="danger">{errorMessage(record.error)}</Alert> : null}
      <Button variant="outline" onClick={() => setConfirming(true)} disabled={!valid || record.isPending}>
        {t("recordPayment")}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("recordTitle", { amount: amountMinor ? money(amountMinor, plan?.currency) : "", method: t(`billing:method_${method}`) })}
        description={t("recordBody", { plan: plan?.name ?? "", period: t(`billing:${cycle === "YEARLY" ? "oneYear" : "oneMonth"}`) })}
        confirmLabel={t("recordPayment")}
        pending={record.isPending}
        onConfirm={save}
      />
    </Card>
  );
};

type ManualMethodRow = ManualSettings["methods"][number];

// Settings: where customers send money, and how they reach you with questions.
export const ManualPaymentsSettings = ({ value, onChange }: { value: ManualSettings; onChange: (value: ManualSettings) => void }) => {
  const { t } = useTranslation(["admin", "billing"]);
  const set = (changes: Partial<ManualSettings>) => onChange({ ...value, ...changes });
  const setRow = (index: number, changes: Partial<ManualMethodRow>) => set({ methods: value.methods.map((row, at) => (at === index ? { ...row, ...changes } : row)) });
  return (
    <Card className="space-y-4 p-5" data-testid="manual-payments-settings">
      <div>
        <h2 className="font-semibold">{t("manualPayments")}</h2>
        <p className="text-sm text-muted-foreground">{t("manualPaymentsHint")}</p>
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={value.enabled} onChange={(event) => set({ enabled: event.target.checked })} className="mt-0.5 size-4 accent-foreground" />
        <span>
          <span className="block text-sm font-medium">{t("manualNextToOnline")}</span>
          <span className="block text-sm text-muted-foreground">{t("manualNextToOnlineHint")}</span>
        </span>
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("whereToSend")}</p>
        {value.methods.length === 0 ? <p className="text-sm text-muted-foreground">{t("noMethodsYet")}</p> : null}
        {value.methods.map((row, index) => (
          <div key={index} className="flex flex-wrap items-start gap-2 sm:flex-nowrap" data-testid="method-row">
            <Select value={row.method} onChange={(event) => setRow(index, { method: event.target.value as ManualMethodRow["method"] })} aria-label={t("billing:paidWith")} className="w-full sm:w-44">
              {MANUAL_METHODS.map((method) => (
                <option key={method} value={method}>
                  {t(`billing:method_${method}`)}
                </option>
              ))}
            </Select>
            <Input
              value={row.details}
              onChange={(event) => setRow(index, { details: event.target.value })}
              placeholder={t(row.method === "bank" ? "detailsBankPlaceholder" : "detailsPlaceholder")}
              aria-label={t("details")}
              maxLength={300}
              className="min-w-0 flex-1"
            />
            <Button variant="ghost" size="icon" onClick={() => set({ methods: value.methods.filter((_, at) => at !== index) })} aria-label={t("removeMethod")}>
              <Trash2 />
            </Button>
          </div>
        ))}
        {value.methods.length < 8 ? (
          <Button variant="outline" size="sm" onClick={() => set({ methods: [...value.methods, { method: "bkash", details: "" }] })}>
            <Plus />
            {t("addMethod")}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("billing:contactWhatsapp")}>
          <Input value={value.whatsapp} onChange={(event) => set({ whatsapp: event.target.value })} maxLength={30} inputMode="tel" placeholder="+8801…" />
        </Field>
        <Field label={t("contactPhoneLabel")}>
          <Input value={value.phone} onChange={(event) => set({ phone: event.target.value })} maxLength={30} inputMode="tel" />
        </Field>
        <Field label={t("billing:contactEmail")}>
          <Input type="email" value={value.email} onChange={(event) => set({ email: event.target.value })} maxLength={200} />
        </Field>
      </div>
      <Field label={t("payNoteEn")} hint={t("payNoteHint")}>
        <Input value={value.noteEn} onChange={(event) => set({ noteEn: event.target.value })} maxLength={500} />
      </Field>
      <Field label={t("payNoteBn")} hint={t("messageBnHint")}>
        <Input value={value.noteBn} onChange={(event) => set({ noteBn: event.target.value })} maxLength={500} />
      </Field>
    </Card>
  );
};
