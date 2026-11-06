import { BookOpen, ChevronRight, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { Business } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { JOURNAL_KINDS, useJournals, useLedgerAccounts, type JournalFilters, type JournalKind } from "./api";
import { AccountSelect, KindBadge } from "./parts";

// Every entry in the books, newest first. Filters live in the address so a view can be shared.
export const JournalsTab = ({ businessId, business }: { businessId: string; business: Business }) => {
  const { t } = useTranslation("ledger");
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const [params, setParams] = useSearchParams();
  const accounts = useLedgerAccounts(businessId);
  const filters: JournalFilters = {
    ...(JOURNAL_KINDS.includes(params.get("kind") as JournalKind) ? { kind: params.get("kind") as JournalKind } : {}),
    ...(params.get("account") ? { ledgerAccountId: params.get("account")! } : {}),
    ...(params.get("from") ? { from: params.get("from")! } : {}),
    ...(params.get("to") ? { to: params.get("to")! } : {}),
  };
  const journals = useJournals(businessId, filters);
  const filtered = Object.keys(filters).length > 0;
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[12rem_1fr_10rem_10rem_auto]">
        <Select aria-label={t("entryKind")} value={filters.kind ?? ""} onChange={(event) => set("kind", event.target.value)}>
          <option value="">{t("allKinds")}</option>
          {JOURNAL_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`kind_${kind}`)}
            </option>
          ))}
        </Select>
        <AccountSelect
          aria-label={t("account")}
          accounts={accounts.data ?? []}
          value={filters.ledgerAccountId ?? ""}
          onChange={(value) => set("account", value)}
          locale={locale}
          placeholder={t("anyAccount")}
          includeHidden
        />
        <Input type="date" aria-label={t("from")} value={filters.from ?? ""} onChange={(event) => set("from", event.target.value)} />
        <Input type="date" aria-label={t("to")} value={filters.to ?? ""} onChange={(event) => set("to", event.target.value)} />
        {filtered ? (
          <Button variant="ghost" onClick={() => setParams({ tab: "journals" }, { replace: true })}>
            {t("clearFilters")}
          </Button>
        ) : null}
      </div>

      {journals.isError ? <Alert tone="danger">{errorMessage(journals.error)}</Alert> : null}
      {journals.isLoading ? <Spinner className="mt-12" /> : null}
      {journals.isSuccess && journals.data.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title={filtered ? t("noJournalsFiltered") : t("noJournals")} body={filtered ? undefined : t("noJournalsHint")} />
        </Card>
      ) : null}

      {journals.data && journals.data.length > 0 ? (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {journals.data.map((entry) => {
              const reversed = Boolean(entry.reversedBy);
              return (
                <li key={entry.id} className="group relative flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 sm:px-5">
                  <div className="hidden w-24 shrink-0 text-sm text-muted-foreground tabular-nums sm:block">{formatDate(entry.entryDate, locale, digitStyle)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link to={`journals/${entry.id}`} className={cn("truncate font-medium after:absolute after:inset-0", reversed && "line-through decoration-muted-foreground/60")}>
                        {entry.memo || entry.entryNo}
                      </Link>
                      <KindBadge kind={entry.kind} />
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="font-mono">{entry.entryNo}</span>
                      <span className="sm:hidden">{formatDate(entry.entryDate, locale, digitStyle)}</span>
                      <span>{t("lines", { count: entry.lineCount })}</span>
                      {entry.reversedBy ? (
                        <span className="inline-flex items-center gap-1">
                          <Undo2 className="size-3" />
                          {t("reversedBy", { entryNo: entry.reversedBy.entryNo })}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span className={cn("text-right font-semibold tabular-nums", reversed && "text-muted-foreground")}>{money(entry.totalMinor, business.baseCurrency)}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {journals.hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void journals.fetchNextPage()} disabled={journals.isFetchingNextPage}>
            {t("loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
