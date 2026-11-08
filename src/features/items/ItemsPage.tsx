import { Package, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/ui/search-box";
import { Spinner } from "@/components/ui/spinner";
import { useAccess, type BusinessSettings } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useMoney } from "@/features/businesses/useMoney";
import { showQuantity } from "@/features/invoices/parts";
import { rateLabel } from "@/features/invoices/vat";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useItems, type Item } from "./api";
import { ItemDialog } from "./ItemDialog";

// What the business sells or buys, saved once so invoice and bill lines fill themselves in.
export const ItemsPage = () => {
  const { t } = useTranslation(["items", "shell"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const money = useMoney();
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  // null: closed; "new": adding; an item: editing it.
  const [open, setOpen] = useState<Item | "new" | null>(null);
  const items = useItems(businessId, { search, includeArchived: archived });
  if (!business || access.isLoading) return <Spinner className="mt-16" />;
  const canWrite = access.can(Permission.FINANCE_WRITE) && access.writable;
  const currency = business.baseCurrency;
  const settings = business.settings as Partial<BusinessSettings> | undefined;
  const defaultVat = settings?.vatRegistered ? (settings.defaultVatRateBp ?? 1500) : 0;
  const list = items.data ?? [];
  const price = (minor: string | null) => (minor === null ? "—" : money(minor, currency));
  const per = (item: Item) => (item.unit ? ` / ${item.unit}` : "");
  const moved = (movement: Item["totals"]["sold"], unit: string | null) =>
    movement.lines === 0 ? "—" : `${showQuantity(movement.quantity)}${unit ? ` ${unit}` : ""} · ${money(movement.amountMinor, currency)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("shell:items")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canWrite ? (
          <Button onClick={() => setOpen("new")}>
            <Plus />
            {t("add")}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder={t("search")} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} className="size-4 accent-foreground" />
          {t("showArchived")}
        </label>
      </div>

      {items.isError ? <Alert tone="danger">{errorMessage(items.error)}</Alert> : null}
      <Card className="overflow-hidden">
        {items.isLoading ? <Spinner className="my-12" /> : null}
        {items.isSuccess && list.length === 0 ? (
          <EmptyState icon={Package} title={search ? t("noMatches") : t("empty")} body={search ? t("noMatchesHint") : t("emptyHint")} />
        ) : null}
        {list.length > 0 ? (
          <ul className="divide-y md:hidden" aria-label={t("shell:items")} data-testid="items-list">
            {list.map((item) => (
              <li key={item.id} className="space-y-1 px-4 py-3">
                <div className="flex items-center gap-2">
                  {canWrite ? (
                    <button type="button" className="text-left font-medium hover:underline" onClick={() => setOpen(item)}>
                      {item.name}
                    </button>
                  ) : (
                    <span className="font-medium">{item.name}</span>
                  )}
                  {item.isActive ? null : <Badge className="border bg-transparent text-muted-foreground">{t("archived")}</Badge>}
                  <span className="ml-auto text-sm text-muted-foreground tabular-nums">{rateLabel(item.vatRateBp)} {t("vat")}</span>
                </div>
                {item.code || item.description ? <p className="text-xs text-muted-foreground">{[item.code, item.description].filter(Boolean).join(" · ")}</p> : null}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
                  <dt className="text-muted-foreground">{t("sellsFor")}</dt>
                  <dd className="text-right tabular-nums">
                    {price(item.salePriceMinor)}
                    {item.salePriceMinor ? <span className="text-muted-foreground">{per(item)}</span> : null}
                  </dd>
                  <dt className="text-muted-foreground">{t("buysFor")}</dt>
                  <dd className="text-right tabular-nums">
                    {price(item.purchasePriceMinor)}
                    {item.purchasePriceMinor ? <span className="text-muted-foreground">{per(item)}</span> : null}
                  </dd>
                  <dt className="text-muted-foreground">{t("sold")}</dt>
                  <dd className="text-right tabular-nums" data-testid="item-sold">{moved(item.totals.sold, item.unit)}</dd>
                  <dt className="text-muted-foreground">{t("bought")}</dt>
                  <dd className="text-right tabular-nums">{moved(item.totals.bought, item.unit)}</dd>
                </dl>
              </li>
            ))}
          </ul>
        ) : null}
        {list.length > 0 ? (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-sm" data-testid="items-table">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t("name")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("sellsFor")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("buysFor")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("vat")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("sold")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("bought")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50">
                    <td className="px-4 py-2.5">
                      {canWrite ? (
                        <button type="button" className="text-left font-medium hover:underline" onClick={() => setOpen(item)}>
                          {item.name}
                        </button>
                      ) : (
                        <span className="font-medium">{item.name}</span>
                      )}
                      {item.isActive ? null : <Badge className="ml-2 border bg-transparent text-muted-foreground">{t("archived")}</Badge>}
                      <span className="block text-xs text-muted-foreground">{[item.code, item.unit, item.description].filter(Boolean).join(" · ") || " "}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {price(item.salePriceMinor)}
                      {item.salePriceMinor ? <span className="text-muted-foreground">{per(item)}</span> : null}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {price(item.purchasePriceMinor)}
                      {item.purchasePriceMinor ? <span className="text-muted-foreground">{per(item)}</span> : null}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{rateLabel(item.vatRateBp)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums" data-testid="item-sold">{moved(item.totals.sold, item.unit)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{moved(item.totals.bought, item.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
      {list.length > 0 ? <p className="text-xs text-muted-foreground">{t("totalsNote")}</p> : null}

      {items.hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void items.fetchNextPage()} disabled={items.isFetchingNextPage}>
            {t("loadMore")}
          </Button>
        </div>
      ) : null}

      {open ? <ItemDialog businessId={businessId} currency={currency} item={open === "new" ? undefined : open} defaultVatRateBp={defaultVat} onClose={() => setOpen(null)} /> : null}
    </div>
  );
};
