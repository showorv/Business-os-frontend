import { ArrowRight, Lock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Alert } from "@/components/ui/alert";
import { useAccess } from "@/features/businesses/api";
import { formatDate } from "@/lib/dates";
import { useFormatting } from "@/lib/preferences";
import { daysUntil, useMyPlan } from "./api";

const PlanLink = () => {
  const { t } = useTranslation("billing");
  return (
    <Link to="/settings/plan" className="inline-flex items-center gap-1 font-medium whitespace-nowrap underline-offset-4 hover:underline">
      {t("seePlans")}
      <ArrowRight className="size-3.5" />
    </Link>
  );
};

// Above every page: a business locked by the plan, and, for the account owner, a trial or paid plan
// about to end or just ended.
export const PlanBanner = ({ businessId }: { businessId?: string }) => {
  const { t } = useTranslation("billing");
  const { locale, digitStyle } = useFormatting();
  const access = useAccess(businessId);
  const mine = useMyPlan();
  const [now] = useState(() => Date.now());

  if (access.plan?.locked) {
    return (
      <Alert tone="warning" className="mb-6">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Lock className="size-4 shrink-0" />
          <span className="flex-1">{t("lockedBusiness")}</span>
          <PlanLink />
        </span>
      </Alert>
    );
  }

  const plan = mine.data;
  if (!plan?.isOwner) return null;
  const left = daysUntil(plan.endsAt, now);
  let message: string | null = null;
  if (plan.state === "trial" && left !== null && left <= 7) message = t("bannerTrial", { count: left });
  if (plan.state === "grace") message = t("bannerGrace", { date: formatDate((plan.graceEndsAt ?? "").slice(0, 10), locale, digitStyle) });
  // Only for a fortnight after it ended, so it doesn't nag forever.
  if (plan.state === "expired" && plan.endsAt && now - new Date(plan.endsAt).getTime() < 14 * 86_400_000) {
    message = t(plan.source === "TRIAL" ? "bannerTrialEnded" : "bannerPlanEnded");
  }
  if (!message) return null;
  return (
    <Alert tone={plan.state === "trial" ? "info" : "warning"} className="mb-6">
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="plan-banner">
        <span className="flex-1">{message}</span>
        <PlanLink />
      </span>
    </Alert>
  );
};
