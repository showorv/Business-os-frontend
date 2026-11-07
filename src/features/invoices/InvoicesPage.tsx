import { ChevronRight, FileText, Plus, ReceiptText, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { SearchBox } from "@/components/ui/search-box";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useMoney } from "@/features/businesses/useMoney";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { useAging, useInvoices, type InvoiceFilters, type InvoiceKind, type InvoiceStatus } from "./api";
import { Stat, StatusBadge } from "./parts";

const SHOW = ["ALL", "DRAFT", "ISSUED", "PARTIALLY_PAID", "OVERDUE", "PAID", "VOID"] as const;
type Show = (typeof SHOW)[number];

// Invoices to customers, or bills from suppliers: what is owed, and each one newest first.
export const InvoicesPage = ({ kind }: { kind: InvoiceKind }) => {
  const { t } = useTranslation(["invoices", "shell"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  // The filter lives in the address, so "Overdue" can be bookmarked.
  const [params, setParams] = useSearchParams();
  const show = (params.get("show") as Show | null) ?? "ALL";
  // From the dues page or a contact: one customer's or supplier's invoices only.
  const contactId = params.get("contact") ?? undefined;
  const [search, setSearch] = useState("");
  const filters: InvoiceFilters = {
    ...(show === "OVERDUE" ? { overdue: true } : show !== "ALL" ? { status: show as InvoiceStatus } : {}),
    search,
    ...(contactId ? { contactId } : {}),
  };
  const invoices = useInvoices(businessId, kind, filters);
  const aging = useAging(businessId, kind);
  if (!business || access.isLoading) return <Spinner className="mt-16" />;

  const canWrite = access.can(Permission.FINANCE_WRITE) && access.writable;
  const currency = business.baseCurrency;
  const list = invoices.data ?? [];
  const filtered = Boolean(search) || show !== "ALL" || Boolean(contactId);
  const setFilter = (name: "show" | "contact", value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  };
  const totals = aging.data?.totals;
  const overdue = totals ? BigInt(totals.totalMinor) - BigInt(totals.current) : 0n;
  const openCount = (aging.data?.rows ?? []).reduce((sum, row) => sum + row.invoices, 0);
  const k = kind === "SALE" ? "sale" : "bill";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t(kind === "SALE" ? "shell:invoices" : "shell:bills")}</h1>
          <p className="mt-1 text-muted-foreground">{t(`${k}_subtitle`)}</p>
        </div>
        {canWrite ? (
          <Button asChild>
            <Link to="new">
              <Plus />
              {t(`${k}_new`)}
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t(`${k}_outstanding`)} value={money(totals?.totalMinor ?? "0", currency)} note={t("openCount", { count: openCount })} testId="invoices-outstanding" />
        <Stat label={t("overdueAmount")} value={money(overdue, currency)} note={t("overdueNote")} testId="invoices-overdue" />
        <Card className="flex items-center">
          <Link to={`/b/${businessId}/dues${kind === "BILL" ? "?side=BILL" : ""}`} className="flex w-full items-center justify-between gap-3 p-6 text-sm hover:bg-muted/50">
            <span>
              <span className="block font-medium">{t("seeDues")}</span>
              <span className="text-muted-foreground">{t("seeDuesHint")}</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label={t("show")}
          value={show}
          onChange={(event) => setFilter("show", event.target.value === "ALL" ? null : event.target.value)}
          className="w-auto"
        >
          {SHOW.map((value) => (
            <option key={value} value={value}>
              {value === "ALL" ? t("all") : value === "OVERDUE" ? t("overdue") : t(`status_${value}`)}
            </option>
          ))}
        </Select>
        <SearchBox value={search} onChange={setSearch} placeholder={t("search")} />
        {contactId ? (
          <button type="button" onClick={() => setFilter("contact", null)} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm hover:bg-muted">
            {t("oneContact", { name: list[0]?.contact.name ?? "…" })}
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {invoices.isError ? <Alert tone="danger">{errorMessage(invoices.error)}</Alert> : null}
      <Card className="overflow-hidden">
        {invoices.isLoading ? <Spinner className="my-12" /> : null}
        {invoices.isSuccess && list.length === 0 ? (
          <EmptyState
            icon={kind === "SALE" ? FileText : ReceiptText}
            title={filtered ? t("noMatches") : t(`${k}_empty`)}
            body={filtered ? t("noMatchesHint") : t(`${k}_emptyHint`)}
          />
        ) : null}
        {list.length > 0 ? (
          <ul className="divide-y" aria-label={t(kind === "SALE" ? "shell:invoices" : "shell:bills")} data-testid="invoices-list">
            {list.map((invoice) => (
              <li key={invoice.id} className="relative flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 md:px-5">
                <div className="min-w-0 flex-1">
                  <Link to={invoice.id} className="font-medium after:absolute after:inset-0">
                    {invoice.contact.name}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">
                    {[invoice.number ?? t("draftNumber"), invoice.referenceNo, t("dueOn", { date: formatDate(invoice.dueDate, locale, digitStyle) })]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium tabular-nums">{money(invoice.totalMinor, currency)}</p>
                  {invoice.status === "PARTIALLY_PAID" || invoice.isOverdue ? (
                    <p className="text-xs text-muted-foreground tabular-nums">{t("leftToPay", { amount: money(invoice.dueMinor, currency) })}</p>
                  ) : null}
                </div>
                <StatusBadge status={invoice.status} overdue={invoice.isOverdue} />
                <ChevronRight className="hidden size-4 text-muted-foreground sm:block" />
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {invoices.hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void invoices.fetchNextPage()} disabled={invoices.isFetchingNextPage}>
            {t("loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
