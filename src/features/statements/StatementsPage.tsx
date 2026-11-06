import { Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { PillTabs } from "@/features/ledger/parts";
import { Permission } from "@/lib/permissions";
import { ImportsTab } from "./ImportsTab";
import { InboxTab } from "./InboxTab";
import { RulesTab } from "./RulesTab";

const TABS = ["inbox", "imports", "rules"] as const;
type Tab = (typeof TABS)[number];

// Bank statements: lines to review, the files they came from, and rules that sort them.
export const StatementsPage = () => {
  const { t } = useTranslation(["statements", "shell"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.includes(params.get("tab") as Tab) ? (params.get("tab") as Tab) : "inbox";
  if (!business || access.isLoading) return <Spinner className="mt-16" />;
  const canWrite = access.can(Permission.FINANCE_WRITE) && access.writable;
  const canPost = canWrite && access.can(Permission.LEDGER_POST);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("shell:statements")}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{t("statements:subtitle")}</p>
        </div>
        {canWrite ? (
          <Button asChild>
            <Link to="import">
              <Upload />
              {t("statements:importStatement")}
            </Link>
          </Button>
        ) : null}
      </header>

      <PillTabs
        label={t("shell:statements")}
        value={tab}
        options={TABS.map((value) => ({ value, label: t(`statements:tab_${value}`) }))}
        onChange={(value) => setParams({ tab: value })}
      />

      {tab === "inbox" ? <InboxTab businessId={businessId} business={business} canWrite={canWrite} canPost={canPost} /> : null}
      {tab === "imports" ? <ImportsTab businessId={businessId} canWrite={canWrite} /> : null}
      {tab === "rules" ? <RulesTab businessId={businessId} business={business} canWrite={canWrite} canPost={canPost} /> : null}
    </div>
  );
};
