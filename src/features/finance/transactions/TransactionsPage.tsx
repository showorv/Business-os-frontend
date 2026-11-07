import { Copy, Plus, ReceiptText, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { currentLocale } from "@/i18n";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { TRANSACTION_STATUSES, TRANSACTION_TYPES, useAccounts, useCategories, useTransactions, type Transaction, type TransactionFilters } from "../api";
import { categoryName } from "../names";
import { amountSign, StatusBadge } from "./parts";

// The filters live in the address (?status=DRAFT&accountId=…), so a filtered list can be bookmarked,
// shared, or reached from an account card.
const FILTER_KEYS = ["status", "type", "accountId", "contactId", "from", "to", "possibleDuplicate"] as const;

export const TransactionsPage = () => {
  const { t } = useTranslation(["finance", "shell"]);
  const businessId = useParams().businessId!;
  const access = useAccess(businessId);
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) ?? undefined])) as Omit<TransactionFilters, "limit" | "cursor">;
  const transactions = useTransactions(businessId, filters);
  const accounts = useAccounts(businessId);
  const categories = useCategories(businessId);
  const canWrite = access.can(Permission.FINANCE_WRITE) && access.writable;
  const filtered = FILTER_KEYS.some((key) => params.get(key));

  const setFilter = (key: (typeof FILTER_KEYS)[number], value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const list = transactions.data ?? [];
  const accountsById = new Map((accounts.data ?? []).map((account) => [account.id, account]));
  const categoriesById = new Map((categories.data ?? []).map((category) => [category.id, category]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("shell:transactions")}</h1>
          <p className="mt-1 text-muted-foreground">{t("finance:transactionsSubtitle")}</p>
        </div>
        {canWrite ? (
          <Button asChild>
            <Link to="new">
              <Plus />
              {t("finance:newTransaction")}
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Status as tabs, the rest as dropdowns. Both wrap on a phone. */}
      <div className="space-y-3">
        <div role="tablist" aria-label={t("finance:status")} className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {(["", ...TRANSACTION_STATUSES] as const).map((status) => (
            <button
              key={status || "all"}
              type="button"
              role="tab"
              aria-selected={(filters.status ?? "") === status}
              onClick={() => setFilter("status", status)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                (filters.status ?? "") === status ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
              )}
            >
              {status ? t(`finance:statusTab_${status}`) : t("finance:all")}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <Select aria-label={t("finance:type")} value={filters.type ?? ""} onChange={(event) => setFilter("type", event.target.value)}>
            <option value="">{t("finance:allTypes")}</option>
            {TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`finance:type_${type}`)}
              </option>
            ))}
          </Select>
          <Select aria-label={t("finance:account")} value={filters.accountId ?? ""} onChange={(event) => setFilter("accountId", event.target.value)}>
            <option value="">{t("finance:allAccounts")}</option>
            {(accounts.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
          <Input type="date" aria-label={t("finance:from")} value={filters.from ?? ""} onChange={(event) => setFilter("from", event.target.value)} />
          <Input type="date" aria-label={t("finance:to")} value={filters.to ?? ""} onChange={(event) => setFilter("to", event.target.value)} />
          {filtered ? (
            <Button variant="ghost" className="col-span-2 md:col-span-1" onClick={() => setParams({}, { replace: true })}>
              <X />
              {t("finance:clearFilters")}
            </Button>
          ) : null}
        </div>
      </div>

      {transactions.isError ? <Alert tone="danger">{errorMessage(transactions.error)}</Alert> : null}

      <Card>
        {transactions.isLoading ? <Spinner className="my-12" /> : null}
        {transactions.isSuccess && list.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={filtered ? t("finance:noMatches") : t("finance:noTransactions")}
            body={filtered ? t("finance:noMatchesHint") : t("finance:noTransactionsHint")}
          />
        ) : null}
        {list.length > 0 ? (
          <ul className="divide-y" aria-label={t("shell:transactions")}>
            {list.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                accountName={accountsById.get(transaction.accountId)?.name ?? ""}
                toAccountName={transaction.toAccountId ? accountsById.get(transaction.toAccountId)?.name : undefined}
                categoryLabel={categoryName(transaction.categoryId ? categoriesById.get(transaction.categoryId) : undefined, currentLocale())}
              />
            ))}
          </ul>
        ) : null}
      </Card>

      {transactions.hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void transactions.fetchNextPage()} disabled={transactions.isFetchingNextPage}>
            {t("finance:loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

interface RowProps {
  transaction: Transaction;
  // Where the row opens. Defaults to the transaction, from the transactions list.
  to?: string;
  accountName: string;
  toAccountName?: string;
  categoryLabel: string;
}

// One line on a laptop; two on a phone. The whole row opens the transaction.
export const TransactionRow = ({ transaction, to, accountName, toAccountName, categoryLabel }: RowProps) => {
  const { t } = useTranslation("finance");
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const title = transaction.description || categoryLabel || t(`type_${transaction.type}`);
  const where = toAccountName ? `${accountName} → ${toAccountName}` : accountName;
  const detail = [categoryLabel && categoryLabel !== title ? categoryLabel : null, where].filter(Boolean).join(" · ");
  const crossed = transaction.status === "VOID" || transaction.status === "REJECTED";

  return (
    <li className="relative grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/50 md:grid-cols-[6.5rem_1fr_auto_8rem] md:items-center md:px-5">
      <span className="order-3 text-sm text-muted-foreground md:order-none">
        {formatDate(transaction.txnDate, locale, digitStyle)}
      </span>
      <div className="min-w-0">
        <Link to={to ?? transaction.id} className="block truncate font-medium after:absolute after:inset-0">
          {title}
        </Link>
        <p className="truncate text-sm text-muted-foreground">
          {transaction.number} · {detail}
        </p>
      </div>
      <div className="order-4 flex items-center justify-end gap-1.5 md:order-none">
        {transaction.possibleDuplicate ? <Copy className="size-4 text-muted-foreground" aria-label={t("possibleDuplicate")} /> : null}
        <StatusBadge status={transaction.status} />
      </div>
      <span className={cn("text-right font-semibold tabular-nums", crossed && "text-muted-foreground line-through")}>
        {amountSign(transaction.type)}
        {money(transaction.amountMinor, transaction.currency)}
      </span>
    </li>
  );
};
