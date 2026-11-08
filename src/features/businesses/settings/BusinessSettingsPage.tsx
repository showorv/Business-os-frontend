import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Permission } from "@/lib/permissions";
import { useAccess } from "../api";
import { useCurrentBusiness } from "../useCurrentBusiness";
import { ApprovalLimitCard } from "./ApprovalLimitCard";
import { DataExportCard } from "./DataExportCard";
import { DetailsCard } from "./DetailsCard";
import { PreferencesCard } from "./PreferencesCard";
import { StatusCard } from "./StatusCard";
import { VatCard } from "./VatCard";

// Everyone in the business can see its settings. Owners and admins can change them.
export const BusinessSettingsPage = () => {
  const { t } = useTranslation("businesses");
  const { businessId } = useParams();
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  if (!business || access.isLoading) return <Spinner className="mt-16" />;

  const canManage = access.can(Permission.BUSINESS_MANAGE);
  const editable = canManage && access.writable;
  // Remounts the forms when the saved values change, e.g. after a save in another tab.
  const { name, legalName, taxId, baseCurrency, timezone, settings } = business;
  const version = JSON.stringify([business.id, name, legalName, taxId, baseCurrency, timezone, settings]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("settingsTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("settingsSubtitle")}</p>
      </div>
      {!canManage ? <Alert>{t("readOnlyRole")}</Alert> : null}
      <DetailsCard key={`details-${version}`} business={business} editable={editable} />
      <PreferencesCard key={`prefs-${version}`} business={business} editable={editable} />
      <ApprovalLimitCard key={`limit-${version}`} business={business} editable={editable} />
      <VatCard key={`vat-${version}`} business={business} editable={editable} />
      {canManage ? <DataExportCard businessId={business.id} /> : null}
      {canManage ? <StatusCard business={business} /> : null}
    </div>
  );
};
