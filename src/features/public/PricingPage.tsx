import { Check, Minus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useAppSelector } from "@/app/store";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { planDescription, planName, usePlans, type Plan } from "@/features/billing/api";
import { priceText, storageText } from "@/features/billing/parts";
import { currentLocale } from "@/i18n";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/errors";
import { useSignupInfo } from "./api";
import { useGuestDigits } from "./parts";

type Cycle = "MONTHLY" | "YEARLY";

// The plans and prices as the platform admin set them, for anyone to read.
export const PricingPage = () => {
  const { t } = useTranslation(["public", "billing"]);
  const plans = usePlans();
  const signup = useSignupInfo();
  const [cycle, setCycle] = useState<Cycle>("YEARLY");
  const trialDays = signup.data?.trialDays ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6 md:py-16">
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">{t("pricing_title")}</h1>
        <p className="text-lg text-muted-foreground">{t("pricing_body")}</p>
      </div>

      <div className="flex justify-center">
        <Segmented
          label={t("billing:billingCycle")}
          value={cycle}
          onChange={setCycle}
          options={[
            { value: "MONTHLY", label: t("billing:monthly") },
            { value: "YEARLY", label: t("billing:yearly") },
          ]}
        />
      </div>

      {plans.isError ? <Alert tone="danger">{errorMessage(plans.error)}</Alert> : null}
      {plans.isLoading ? <Spinner className="my-12" /> : null}
      {plans.data ? (
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {plans.data.map((plan) => (
            <PricingCard key={plan.key} plan={plan} cycle={cycle} trialPlan={trialDays > 0 ? signup.data?.trialPlanKey : undefined} closed={signup.data?.signupsEnabled === false} />
          ))}
        </div>
      ) : null}
      {trialDays > 0 ? (
        <p className="text-center text-sm text-muted-foreground" data-testid="pricing-trial">
          {t("pricing_trial", { count: trialDays })}
        </p>
      ) : null}

      <section className="mx-auto max-w-3xl space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">{t("faq_title")}</h2>
        <div className="divide-y rounded-xl border">
          {[1, 2, 3, 4, 5].map((n) => (
            <details key={n} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {t(`faq_${n}_q`)}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 text-muted-foreground">{t(`faq_${n}_a`)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
};

const Feature = ({ on, children }: { on: boolean; children: string }) => (
  <li className={cn("flex items-start gap-2.5 text-sm", !on && "text-muted-foreground")}>
    {on ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />}
    <span>{children}</span>
  </li>
);

const PricingCard = ({ plan, cycle, trialPlan, closed }: { plan: Plan; cycle: Cycle; trialPlan?: string; closed: boolean }) => {
  const { t, i18n } = useTranslation(["public", "billing"]);
  const signedIn = useAppSelector((state) => state.auth.status === "signedIn");
  const digitStyle = useGuestDigits();
  const locale = currentLocale();
  const free = plan.priceMonthlyMinor === "0" && plan.priceYearlyMinor === "0";
  const featured = plan.key === "pro";
  const price = cycle === "YEARLY" ? plan.priceYearlyMinor : plan.priceMonthlyMinor;
  const saving = BigInt(plan.priceMonthlyMinor) * 12n - BigInt(plan.priceYearlyMinor);
  const n = (value: number | null, key: string) => (value === null ? t(`billing:${key}Unlimited`) : t(`billing:${key}`, { count: value, n: value.toLocaleString(locale) }));
  const action = signedIn
    ? { to: "/settings/plan", label: t("pricing_yourPlan") }
    : { to: "/register", label: free ? t("pricing_start") : trialPlan === plan.key ? t("pricing_tryPro") : t("pricing_getPro") };

  return (
    <div className={cn("relative flex flex-col rounded-xl border bg-surface p-6", featured && "border-foreground shadow-md ring-1 ring-foreground")} data-testid={`pricing-${plan.key}`}>
      {featured ? <Badge className="absolute -top-2.5 left-6 bg-foreground text-background">{t("billing:recommended")}</Badge> : null}
      <p className="text-lg font-semibold">{planName(plan, i18n.language)}</p>
      <p className="mt-1 min-h-10 text-sm text-muted-foreground">{planDescription(plan, i18n.language)}</p>
      <p className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-tight tabular-nums" data-testid="pricing-price">
          {free ? t("billing:free") : priceText(price, plan.currency, digitStyle)}
        </span>
        {!free ? <span className="text-sm text-muted-foreground">{cycle === "YEARLY" ? t("billing:perYear") : t("billing:perMonth")}</span> : null}
      </p>
      <p className="mt-1 h-5 text-xs text-muted-foreground">
        {!free && cycle === "YEARLY" && saving > 0n ? t("billing:youSave", { amount: priceText(saving.toString(), plan.currency, digitStyle) }) : null}
      </p>
      <ul className="mt-5 flex-1 space-y-2.5">
        <Feature on>{n(plan.maxBusinesses, "businessesN")}</Feature>
        <Feature on>{n(plan.maxMembers, "peopleN")}</Feature>
        <Feature on>{t("billing:storageN", { size: storageText(plan.storageMb, locale, t("billing:unlimited")) })}</Feature>
        <Feature on>{t("billing:everything")}</Feature>
        <Feature on={plan.aiEnabled}>{t("billing:aiFeature")}</Feature>
        <Feature on={(plan.maxBusinesses ?? 2) > 1}>{t("billing:combined")}</Feature>
      </ul>
      {closed && !signedIn ? null : (
        <Button asChild className="mt-6 w-full" variant={featured ? "primary" : "outline"}>
          <Link to={action.to}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
};
