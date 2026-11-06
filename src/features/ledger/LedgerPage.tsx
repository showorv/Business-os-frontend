import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { Permission } from "@/lib/permissions";
import { ChartOfAccounts } from "./ChartOfAccounts";
import { JournalsTab } from "./JournalsTab";
import { MonthsTab } from "./MonthsTab";
import { ReconcileTab } from "./ReconcileTab";
import { PillTabs } from "./parts";

const TABS = ["accounts", "journals", "months", "reconcile"] as const;
type Tab = (typeof TABS)[number];

// The books underneath: four tabs, the open one kept in the address.
export const LedgerPage = () => {
  const { t } = useTranslation(["ledger", "shell"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.includes(params.get("tab") as Tab) ? (params.get("tab") as Tab) : "accounts";
  if (!business || access.isLoading) return <Spinner className="mt-16" />;
  const canPost = access.can(Permission.LEDGER_POST) && access.writable;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("shell:ledger")}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{t("ledger:subtitle")}</p>
        </div>
        {canPost ? (
          <Button asChild>
            <Link to="journals/new">
              <Plus />
              {t("ledger:newEntry")}
            </Link>
          </Button>
        ) : null}
      </header>

      <PillTabs
        label={t("shell:ledger")}
        value={tab}
        options={TABS.map((value) => ({ value, label: t(`ledger:tab_${value}`) }))}
        onChange={(value) => setParams({ tab: value })}
      />

      {tab === "accounts" ? <ChartOfAccounts businessId={businessId} business={business} canPost={canPost} /> : null}
      {tab === "journals" ? <JournalsTab businessId={businessId} business={business} /> : null}
      {tab === "months" ? <MonthsTab businessId={businessId} business={business} access={access} /> : null}
      {tab === "reconcile" ? <ReconcileTab businessId={businessId} business={business} canPost={canPost} /> : null}
    </div>
  );
};
