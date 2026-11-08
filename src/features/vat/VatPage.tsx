import { ChevronLeft, ChevronRight, Printer, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useMoney } from "@/features/businesses/useMoney";
import { KIND_PATH, Stat } from "@/features/invoices/parts";
import { rateLabel } from "@/features/invoices/vat";
import { formatDate, todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { addMonths, formatMonth, lastDayOf, toMonth } from "@/lib/months";
import { useFormatting } from "@/lib/preferences";
import { useVatSummary, type VatSummary } from "./api";

// A month's VAT: charged on sales, claimable on bills, and the difference to pay. It helps fill in
// the monthly return (Mushak 9.1); it doesn't file it.
export const VatPage = () => {
  const { t } = useTranslation(["invoices", "shell"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const [params, setParams] = useSearchParams();
  const thisMonth = toMonth(todayIn(business?.timezone ?? "Asia/Dhaka"));
  const month = params.get("month") ?? thisMonth;
  const summary = useVatSummary(businessId, `${month}-01`, lastDayOf(month));
  if (!business) return <Spinner className="mt-16" />;

  const data = summary.data;
  const currency = business.baseCurrency;
  const net = data ? BigInt(data.netMinor) : 0n;
  const go = (value: string) => setParams(value === thisMonth ? {} : { month: value }, { replace: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("shell:vat")}</h1>
          <p className="mt-1 text-muted-foreground">{t("vatSubtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="print:hidden">
          <Printer />
          {t("print")}
        </Button>
      </div>

      <div className="flex items-center gap-2 print:hidden">
        <Button variant="outline" size="icon" aria-label={t("previousMonth")} onClick={() => go(addMonths(month, -1))}>
          <ChevronLeft />
        </Button>
        <input
          type="month"
          aria-label={t("month")}
          value={month}
          max={thisMonth}
          onChange={(event) => event.target.value && go(event.target.value)}
          className="h-10 rounded-md border bg-surface px-3 text-sm"
        />
        <Button variant="outline" size="icon" aria-label={t("nextMonth")} disabled={month >= thisMonth} onClick={() => go(addMonths(month, 1))}>
          <ChevronRight />
        </Button>
        <span className="ml-2 hidden font-medium sm:inline" data-testid="vat-month">{formatMonth(month, locale, digitStyle, "long")}</span>
      </div>

      {data && !data.registered ? (
        <Alert>
          {t("vatNotRegistered")}{" "}
          <Link to={`/b/${businessId}/settings`} className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
            <Settings className="size-3.5" />
            {t("vatTurnOn")}
          </Link>
        </Alert>
      ) : null}
      {summary.isError ? <Alert tone="danger">{errorMessage(summary.error)}</Alert> : null}
      {!data ? <Spinner className="my-12" /> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label={t("outputVat")} value={money(data.output.vatMinor, currency)} note={t("outputVatNote", { count: data.output.documents })} testId="vat-output" />
            <Stat label={t("inputVat")} value={money(data.input.vatMinor, currency)} note={t("inputVatNote", { count: data.input.documents })} testId="vat-input" />
            <Stat
              label={net >= 0n ? t("vatToPay") : t("vatCarryForward")}
              value={money(net < 0n ? -net : net, currency)}
              note={net >= 0n ? t("vatToPayNote") : t("vatCarryForwardNote")}
              testId="vat-net"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <RateTable title={t("onSales")} side={data.output} currency={currency} testId="vat-sales" />
            <RateTable title={t("onPurchases")} side={data.input} currency={currency} testId="vat-purchases" />
          </div>

          <section className="space-y-3">
            <h2 className="font-semibold">{t("vatDocuments")}</h2>
            <Card className="overflow-hidden">
              {data.documents.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">{t("vatNoDocuments")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm" data-testid="vat-documents">
                    <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">{t("issueDate")}</th>
                        <th className="px-4 py-2.5 font-medium">{t("number")}</th>
                        <th className="px-4 py-2.5 font-medium">{t("contact")}</th>
                        <th className="px-4 py-2.5 text-right font-medium">{t("subtotal")}</th>
                        <th className="px-4 py-2.5 text-right font-medium">{t("vat")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.documents.map((doc) => (
                        <tr key={doc.invoiceId}>
                          <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(doc.issueDate, locale, digitStyle)}</td>
                          <td className="px-4 py-2.5">
                            <Link to={`/b/${businessId}/${KIND_PATH[doc.kind]}/${doc.invoiceId}`} className="font-medium hover:underline">
                              {doc.number}
                            </Link>
                            <span className="block text-xs text-muted-foreground">
                              {doc.kind === "SALE" ? t("vatSale") : doc.vatRecoverable || doc.vatMinor === "0" ? t("vatPurchase") : t("vatPurchaseCost")}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {doc.contactName}
                            {doc.contactTaxId ? <span className="block text-xs text-muted-foreground">{t("binShort", { id: doc.contactTaxId })}</span> : null}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{money(doc.subtotalMinor, currency)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{money(doc.vatMinor, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </section>
          <p className="text-xs text-muted-foreground">{t("vatDisclaimer")}</p>
        </>
      ) : null}
    </div>
  );
};

const RateTable = ({ title, side, currency, testId }: { title: string; side: VatSummary["output"]; currency: string; testId: string }) => {
  const { t } = useTranslation("invoices");
  const money = useMoney();
  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 className="font-semibold">{title}</h2>
        {side.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("vatNothing")}</p>
        ) : (
          <table className="w-full text-sm" data-testid={testId}>
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1.5 font-medium">{t("vatRate")}</th>
                <th className="py-1.5 text-right font-medium">{t("taxableValue")}</th>
                <th className="py-1.5 text-right font-medium">{t("vat")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {side.rows.map((row) => (
                <tr key={row.rateBp}>
                  <td className="py-1.5">{row.rateBp === 0 ? t("zeroRated") : rateLabel(row.rateBp)}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(row.taxableMinor, currency)}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(row.vatMinor, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t font-semibold">
              <tr>
                <td className="py-1.5">{t("total")}</td>
                <td className="py-1.5 text-right tabular-nums">{money(side.taxableMinor, currency)}</td>
                <td className="py-1.5 text-right tabular-nums">{money(side.vatMinor, currency)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </CardContent>
    </Card>
  );
};
