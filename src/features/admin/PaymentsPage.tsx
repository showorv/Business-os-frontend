import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/errors";
import { useAdminPayments, type AdminPayment } from "./api";
import { Cell, PageTitle, Pager, Table, useAdminFormat } from "./parts";
import { SearchBox } from "@/components/ui/search-box";

const STATUSES = ["PAID", "PENDING", "FAILED", "CANCELLED"] as const;

export const PaymentsPage = () => {
  const { t } = useTranslation(["admin", "billing"]);
  const { money, day } = useAdminFormat();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminPayment["status"] | "">("");
  const [page, setPage] = useState(1);
  const payments = useAdminPayments({ search: search || undefined, status: status || undefined, page });
  return (
    <div>
      <PageTitle title={t("nav_payments")} hint={t("paymentsHint")} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={(value) => (setSearch(value), setPage(1))} placeholder={t("searchPayments")} />
        <Select value={status} onChange={(event) => (setStatus(event.target.value as AdminPayment["status"] | ""), setPage(1))} aria-label={t("status")} className="w-auto">
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`billing:status_${value}`)}
            </option>
          ))}
        </Select>
      </div>
      {payments.isError ? <Alert tone="danger">{errorMessage(payments.error)}</Alert> : null}
      {payments.isLoading ? <Spinner className="mt-12" /> : null}
      {payments.data ? (
        <>
          <Table head={[t("date"), t("account"), t("plan"), t("amount"), t("status"), t("receiptCol")]} testId="payments-table">
            {payments.data.items.map((payment) => (
              <tr key={payment.id}>
                <Cell className="tabular-nums">{day(payment.paidAt ?? payment.createdAt)}</Cell>
                <Cell>
                  <Link to={`/admin/workspaces/${payment.workspaceId}`} className="underline-offset-4 hover:underline">
                    {payment.billedTo?.name ?? "—"}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{payment.billedTo?.email}</span>
                </Cell>
                <Cell>
                  {payment.planName} · {t(`billing:${payment.billingCycle === "YEARLY" ? "oneYear" : "oneMonth"}`)}
                  {payment.couponCode ? <span className="block text-xs text-muted-foreground">{payment.couponCode}</span> : null}
                </Cell>
                <Cell className="tabular-nums">{money(payment.amountMinor, payment.currency)}</Cell>
                <Cell>{t(`billing:status_${payment.status}`)}</Cell>
                <Cell className="tabular-nums text-muted-foreground">{payment.receiptNumber ?? "—"}</Cell>
              </tr>
            ))}
          </Table>
          {payments.data.items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{t("noMatches")}</p> : null}
          <Pager page={payments.data.page} pages={payments.data.pages} total={payments.data.total} onPage={setPage} />
        </>
      ) : null}
    </div>
  );
};
