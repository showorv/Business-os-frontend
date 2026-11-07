import { HandCoins } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useMoney } from "@/features/businesses/useMoney";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { AGING_BUCKETS, useAging, type InvoiceKind } from "./api";
import { AgingBar, KIND_PATH, Stat } from "./parts";

// Baki: who owes the business, and whom it owes, by how long past the due date.
export const DuesPage = () => {
  const { t } = useTranslation(["invoices", "shell"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const [params, setParams] = useSearchParams();
  const side: InvoiceKind = params.get("side") === "BILL" ? "BILL" : "SALE";
  const aging = useAging(businessId, side);
  if (!business) return <Spinner className="mt-16" />;

  const currency = business.baseCurrency;
  const data = aging.data;
  const k = side === "SALE" ? "sale" : "bill";
  const overdue = data ? BigInt(data.totals.totalMinor) - BigInt(data.totals.current) : 0n;
  const serious = data ? BigInt(data.totals.days61to90) + BigInt(data.totals.over90) : 0n;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("shell:dues")}</h1>
        <p className="mt-1 text-muted-foreground">{t("duesSubtitle")}</p>
      </div>

      <Segmented
        label={t("show")}
        value={side}
        onChange={(value) => setParams(value === "SALE" ? {} : { side: value }, { replace: true })}
        options={[
          { value: "SALE", label: t("owedToYou") },
          { value: "BILL", label: t("youOwe") },
        ]}
      />

      {aging.isError ? <Alert tone="danger">{errorMessage(aging.error)}</Alert> : null}
      {!data ? <Spinner className="my-12" /> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label={t(`${k}_outstanding`)} value={money(data.totals.totalMinor, currency)} note={t("asOf", { date: formatDate(data.asOf, locale, digitStyle) })} testId="dues-total" />
            <Stat label={t("overdueAmount")} value={money(overdue, currency)} note={t("overdueNote")} testId="dues-overdue" />
            <Stat label={t("over60")} value={money(serious, currency)} note={t(`${k}_over60Note`)} />
          </div>

          <Card>
            <CardContent className="space-y-3">
              <h2 className="font-semibold">{t("byAge")}</h2>
              <AgingBar amounts={data.totals} currency={currency} />
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="font-semibold">{t(`${k}_byContact`)}</h2>
            <Card className="overflow-hidden">
              {data.rows.length === 0 ? (
                <EmptyState icon={HandCoins} title={t(`${k}_nothingOwed`)} body={t(`${k}_nothingOwedHint`)} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm" data-testid="dues-table">
                    <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">{t("contact")}</th>
                        {AGING_BUCKETS.map((bucket) => (
                          <th key={bucket} className="px-4 py-2.5 text-right font-medium">
                            {t(`bucket_${bucket}`)}
                          </th>
                        ))}
                        <th className="px-4 py-2.5 text-right font-medium">{t("total")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.rows.map((row) => (
                        <tr key={row.contactId} className="hover:bg-muted/50">
                          <td className="px-4 py-2.5">
                            <Link to={`/b/${businessId}/${KIND_PATH[side]}?contact=${row.contactId}`} className="font-medium hover:underline">
                              {row.contactName}
                            </Link>
                            <span className="block text-xs text-muted-foreground">
                              {t("openCount", { count: row.invoices })} · {t("oldestDue", { date: formatDate(row.oldestDueDate, locale, digitStyle) })}
                            </span>
                          </td>
                          {AGING_BUCKETS.map((bucket) => (
                            <td key={bucket} className={row[bucket] === "0" ? "px-4 py-2.5 text-right text-muted-foreground tabular-nums" : "px-4 py-2.5 text-right tabular-nums"}>
                              {row[bucket] === "0" ? "—" : money(row[bucket], currency)}
                            </td>
                          ))}
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{money(row.totalMinor, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 font-semibold">
                      <tr>
                        <td className="px-4 py-2.5">{t("total")}</td>
                        {AGING_BUCKETS.map((bucket) => (
                          <td key={bucket} className="px-4 py-2.5 text-right tabular-nums">
                            {money(data.totals[bucket], currency)}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right tabular-nums">{money(data.totals.totalMinor, currency)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
};
