import { BookUser, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/ui/search-box";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useContacts, type ContactFilters } from "./api";
import { ContactDialog } from "./ContactDialog";
import { KindBadge, MoneyLine } from "./parts";

type Tab = "ALL" | "CUSTOMER" | "SUPPLIER";

// Customers and suppliers, by name, with what was received from and paid to each.
export const ContactsPage = () => {
  const { t } = useTranslation(["contacts", "shell"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  // The tab lives in the address, so "Suppliers" can be bookmarked.
  const [params, setParams] = useSearchParams();
  const tab = (params.get("kind") as Tab | null) ?? "ALL";
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const filters: ContactFilters = { ...(tab !== "ALL" ? { kind: tab } : {}), search, includeArchived: archived };
  const contacts = useContacts(businessId, filters);
  if (!business || access.isLoading) return <Spinner className="mt-16" />;
  const canWrite = access.can(Permission.FINANCE_WRITE) && access.writable;
  const list = contacts.data ?? [];
  const filtered = Boolean(search) || tab !== "ALL";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("shell:contacts")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canWrite ? (
          <Button onClick={() => setAdding(true)}>
            <Plus />
            {t("add")}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label={t("show")}
          value={tab}
          onChange={(value) => setParams(value === "ALL" ? {} : { kind: value }, { replace: true })}
          options={[
            { value: "ALL", label: t("all") },
            { value: "CUSTOMER", label: t("customers") },
            { value: "SUPPLIER", label: t("suppliers") },
          ]}
        />
        <SearchBox value={search} onChange={setSearch} placeholder={t("search")} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} className="size-4 accent-foreground" />
          {t("showArchived")}
        </label>
      </div>

      {contacts.isError ? <Alert tone="danger">{errorMessage(contacts.error)}</Alert> : null}
      <Card className="overflow-hidden">
        {contacts.isLoading ? <Spinner className="my-12" /> : null}
        {contacts.isSuccess && list.length === 0 ? (
          <EmptyState icon={BookUser} title={filtered ? t("noMatches") : t("empty")} body={filtered ? t("noMatchesHint") : t("emptyHint")} />
        ) : null}
        {list.length > 0 ? (
          <ul className="divide-y" aria-label={t("shell:contacts")} data-testid="contacts-list">
            {list.map((contact) => (
              <li key={contact.id} className="relative flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 md:px-5">
                <div className="min-w-0 flex-1">
                  <Link to={contact.id} className="font-medium after:absolute after:inset-0">
                    {contact.name}
                  </Link>
                  {contact.company ? <span className="text-muted-foreground"> · {contact.company}</span> : null}
                  <p className="truncate text-sm text-muted-foreground">
                    {[contact.phone, contact.email].filter(Boolean).join(" · ") || " "}
                  </p>
                  <p className="text-sm text-muted-foreground sm:hidden">
                    <MoneyLine contact={contact} currency={business.baseCurrency} />
                  </p>
                </div>
                <div className="hidden text-right text-sm text-muted-foreground sm:block">
                  <MoneyLine contact={contact} currency={business.baseCurrency} />
                </div>
                <div className="flex items-center gap-1.5">
                  {contact.isActive ? null : <Badge className="border bg-transparent text-muted-foreground">{t("archived")}</Badge>}
                  <KindBadge kind={contact.kind} />
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {contacts.hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void contacts.fetchNextPage()} disabled={contacts.isFetchingNextPage}>
            {t("loadMore")}
          </Button>
        </div>
      ) : null}

      {adding ? <ContactDialog businessId={businessId} kind={tab === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER"} onClose={() => setAdding(false)} /> : null}
    </div>
  );
};
