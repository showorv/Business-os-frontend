import { CreditCard, FlaskConical, Lock, Smartphone, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { paymentPlanName, useDemoAnswer, usePayment, type PayMethod } from "./api";
import { priceText } from "./parts";

const METHODS: { value: PayMethod; icon: LucideIcon }[] = [
  { value: "bkash", icon: Smartphone },
  { value: "nagad", icon: Smartphone },
  { value: "card", icon: CreditCard },
];

// A pretend payment page, standing in for SSLCommerz or bKash until the merchant accounts exist.
// Nothing is charged: it lets you choose what the gateway answers, to see what happens in each case.
export const DemoPayPage = () => {
  const { t, i18n } = useTranslation("billing");
  const { paymentId = "" } = useParams();
  const navigate = useNavigate();
  const { digitStyle } = useFormatting();
  const payment = usePayment(paymentId);
  const answer = useDemoAnswer(paymentId);
  const [method, setMethod] = useState<PayMethod>("bkash");

  if (payment.isLoading) return <Spinner className="mt-12" />;
  if (payment.isError) return <Alert tone="danger">{errorMessage(payment.error)}</Alert>;
  const data = payment.data!;
  const backToPlan = () => void navigate(`/settings/plan?payment=${paymentId}`, { replace: true });
  const send = (outcome: "PAID" | "FAILED" | "CANCELLED") => answer.mutate({ outcome, method }, { onSuccess: backToPlan, onError: () => void payment.refetch() });
  const amount = priceText(data.amountMinor, data.currency, digitStyle);

  if (data.status !== "PENDING") {
    return (
      <div className="space-y-4 rounded-xl border bg-surface p-6 text-center">
        <p className="font-semibold">{t("demoClosed")}</p>
        <Button asChild variant="outline">
          <Link to={`/settings/plan?payment=${paymentId}`}>{t("backToPlan")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-surface shadow-sm" data-testid="demo-pay">
      <div className="flex items-start gap-3 border-b border-dashed bg-muted/60 px-5 py-3 text-sm">
        <FlaskConical className="mt-0.5 size-4 shrink-0" />
        <p>
          <span className="font-semibold">{t("demoTitle")}</span> {t("demoBody")}
        </p>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("paying")}</p>
            <p className="mt-0.5 font-semibold">
              {paymentPlanName(data, i18n.language)} · {t(data.billingCycle === "YEARLY" ? "oneYear" : "oneMonth")}
            </p>
          </div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums" data-testid="demo-amount">
            {amount}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("payWith")}</p>
          <div role="radiogroup" aria-label={t("payWith")} className="grid grid-cols-3 gap-2">
            {METHODS.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={method === value}
                onClick={() => setMethod(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand",
                  method === value ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                <Icon className="size-5" />
                {t(`method_${value}`)}
              </button>
            ))}
          </div>
        </div>

        {answer.isError ? <Alert tone="danger">{errorMessage(answer.error)}</Alert> : null}

        <div className="space-y-2">
          <Button className="h-11 w-full" disabled={answer.isPending} onClick={() => send("PAID")}>
            <Lock />
            {t("payAmount", { amount })}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={answer.isPending} onClick={() => send("FAILED")}>
              {t("demoFail")}
            </Button>
            <Button variant="ghost" disabled={answer.isPending} onClick={() => send("CANCELLED")}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
