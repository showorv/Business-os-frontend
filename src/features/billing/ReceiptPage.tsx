import { ArrowLeft, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { brand } from "@/config/brand";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { dhakaDay, paymentPlanName, usePayment } from "./api";
import { priceText } from "./parts";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-2 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-right font-medium">{children}</dd>
  </div>
);

// A receipt for one paid payment, laid out to print or save as PDF.
export const ReceiptPage = () => {
  const { t, i18n } = useTranslation("billing");
  const { paymentId = "" } = useParams();
  const { locale, digitStyle } = useFormatting();
  const payment = usePayment(paymentId);

  if (payment.isLoading) return <Spinner className="mt-12" />;
  if (payment.isError) return <Alert tone="danger">{errorMessage(payment.error)}</Alert>;
  const data = payment.data!;
  const day = (iso: string | null) => (iso ? formatDate(dhakaDay(iso), locale, digitStyle) : "");
  const amount = priceText(data.amountMinor, data.currency, digitStyle);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/settings/plan">
            <ArrowLeft />
            {t("backToPlan")}
          </Link>
        </Button>
        {data.status === "PAID" ? (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer />
            {t("print")}
          </Button>
        ) : null}
      </div>

      {data.status !== "PAID" ? (
        <Alert tone="warning">{t("noReceipt")}</Alert>
      ) : (
        <article className="rounded-xl border bg-surface p-6 sm:p-8 print:border-0 print:p-0" data-testid="receipt">
          <header className="flex items-start justify-between gap-4 border-b pb-5">
            <div className="flex items-center gap-2 font-semibold">
              <img src={brand.logo} alt="" className="size-8" />
              {brand.name}
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tracking-tight">{t("receipt")}</p>
              <p className="text-sm text-muted-foreground tabular-nums">{data.receiptNumber}</p>
            </div>
          </header>

          <dl className="divide-y border-b py-2">
            <Row label={t("paidOn")}>{day(data.paidAt)}</Row>
            {data.billedTo ? (
              <Row label={t("billedTo")}>
                {data.billedTo.name}
                <span className="block font-normal text-muted-foreground">{data.billedTo.email}</span>
              </Row>
            ) : null}
            <Row label={t("paidWith")}>{data.method ? t(`method_${data.method}`) : "—"}</Row>
            {data.gatewayRef ? <Row label={t("reference")}>{data.gatewayRef}</Row> : null}
          </dl>

          <div className="flex items-start justify-between gap-4 py-5">
            <div>
              <p className="font-medium">
                {paymentPlanName(data, i18n.language)} · {t(data.billingCycle === "YEARLY" ? "oneYear" : "oneMonth")}
              </p>
              <p className="text-sm text-muted-foreground">{t("period", { from: day(data.periodStart), to: day(data.periodEnd) })}</p>
            </div>
            <p className="font-medium tabular-nums">{amount}</p>
          </div>
          <div className="flex justify-between border-t pt-4 text-lg font-semibold">
            <span>{t("totalPaid")}</span>
            <span className="tabular-nums">{amount}</span>
          </div>
          {data.gateway === "demo" ? <p className="mt-6 text-xs text-muted-foreground">{t("demoReceipt")}</p> : null}
        </article>
      )}
    </div>
  );
};
