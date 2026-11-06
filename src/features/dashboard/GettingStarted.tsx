import { CircleCheck, Circle, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { Card } from "@/components/ui/card";
import { useAccess, type BusinessSettings } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useAccounts } from "@/features/finance/api";
import { useMembers } from "@/features/team/api";
import { cn } from "@/lib/cn";
import { Permission } from "@/lib/permissions";

// A new business has nothing to chart yet, so its home is a short checklist instead. Each step ticks
// itself once done; the dashboard takes over after the first transaction or balance.
export const GettingStarted = () => {
  const { t } = useTranslation(["analytics", "businesses"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const accounts = useAccounts(businessId);
  const members = useMembers(businessId);
  if (!business) return null;
  const settings = business.settings as unknown as Partial<BusinessSettings>;

  const steps = [
    { key: "account", done: (accounts.data ?? []).length > 1, to: "accounts", show: access.can(Permission.FINANCE_WRITE) },
    { key: "transaction", done: false, to: "transactions/new", show: access.can(Permission.FINANCE_WRITE) },
    { key: "limit", done: Boolean(settings.approvalThresholdMinor), to: "settings", show: access.can(Permission.BUSINESS_MANAGE) },
    { key: "team", done: (members.data ?? []).length > 1, to: "team", show: access.can(Permission.MEMBERS_MANAGE) },
  ].filter((step) => step.show);
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <div className="space-y-3">
        <span className="inline-flex rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">{t("analytics:gettingStarted")}</span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("businesses:welcome", { name: business.name })}</h1>
        <p className="max-w-xl text-muted-foreground">{t("analytics:gettingStartedBody")}</p>
      </div>
      {steps.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b p-5">
            <span className="font-medium">{t("analytics:stepsDone", { done: doneCount, total: steps.length })}</span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-chart-track">
              <div className="h-full rounded-full bg-chart-1 transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </div>
          </div>
          <ol className="divide-y">
            {steps.map((step) => (
              <li key={step.key}>
                <Link to={step.to} className="group flex items-center gap-4 p-5 transition-colors hover:bg-muted/50">
                  {step.done ? <CircleCheck className="size-6 shrink-0" /> : <Circle className="size-6 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium", step.done && "text-muted-foreground line-through")}>{t(`analytics:step_${step.key}`)}</p>
                    <p className="text-sm text-muted-foreground">{t(`analytics:stepHint_${step.key}`)}</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <Card className="p-5 text-sm text-muted-foreground">{t("analytics:nothingYet")}</Card>
      )}
    </div>
  );
};
