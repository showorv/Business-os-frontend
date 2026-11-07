import { Check, Minus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { daysUntil, planDescription, planName, useMyPlan, usePlans, type MyPlan, type Plan } from "./api";
import { bytesText, priceText, storageText, UsageMeter } from "./parts";

type Cycle = "MONTHLY" | "YEARLY";

// Your workspace's plan: what it allows, what you're using, and the plans you can move to.
export const PlanPage = () => {
  const { t } = useTranslation("billing");
  const mine = useMyPlan();
  const plans = usePlans();
  const [cycle, setCycle] = useState<Cycle>("YEARLY");

  if (mine.isLoading || plans.isLoading) return <Spinner className="mt-12" />;
  if (mine.isError) return <Alert tone="danger">{errorMessage(mine.error)}</Alert>;
  if (plans.isError) return <Alert tone="danger">{errorMessage(plans.error)}</Alert>;
  const current = mine.data!;

  return (
    <div className="space-y-8">
      <CurrentPlan mine={current} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("choose")}</h2>
            <p className="text-sm text-muted-foreground">{t("chooseHint")}</p>
          </div>
          <Segmented
            label={t("billingCycle")}
            value={cycle}
            onChange={setCycle}
            options={[
              { value: "MONTHLY", label: t("monthly") },
              { value: "YEARLY", label: t("yearly") },
            ]}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.data!.map((plan) => (
            <PlanCard key={plan.key} plan={plan} cycle={cycle} mine={current} />
          ))}
        </div>
        {!current.isOwner ? <p className="text-sm text-muted-foreground">{t("ownerOnly")}</p> : null}
      </section>
    </div>
  );
};

const CurrentPlan = ({ mine }: { mine: MyPlan }) => {
  const { t, i18n } = useTranslation("billing");
  const { locale, digitStyle } = useFormatting();
  const [now] = useState(() => Date.now());
  const plan = mine.plan;
  const left = daysUntil(mine.endsAt, now);
  const endDate = mine.endsAt ? formatDate(mine.endsAt.slice(0, 10), locale, digitStyle) : null;
  const graceDate = mine.graceEndsAt ? formatDate(mine.graceEndsAt.slice(0, 10), locale, digitStyle) : null;
  const unlimited = t("unlimited");
  const count = (value: number | null) => (value === null ? unlimited : value.toLocaleString(locale));

  // One sentence on where the plan stands.
  const status =
    mine.state === "trial"
      ? t("trialLeft", { count: left ?? 0, date: endDate })
      : mine.state === "active"
        ? t("renews", { date: endDate })
        : mine.state === "granted"
          ? endDate
            ? t("grantedUntil", { date: endDate })
            : t("grantedForever")
          : mine.state === "grace"
            ? t("graceUntil", { date: graceDate })
            : mine.state === "expired"
              ? t(mine.source === "TRIAL" ? "trialEnded" : "planEnded")
              : t("freeForever");

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5 sm:p-6">
        <div>
          <p className="text-sm text-muted-foreground">{t("yourPlan")}</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight" data-testid="current-plan">
            {planName(plan, i18n.language)}
            <Badge className={cn(mine.state === "grace" || mine.state === "expired" ? "border border-danger/40 bg-transparent text-danger" : "border bg-transparent")}>{t(`state_${mine.state}`)}</Badge>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{status}</p>
        </div>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <UsageMeter label={t("businesses")} used={mine.usage.businesses} limit={plan.maxBusinesses} usedText={mine.usage.businesses.toLocaleString(locale)} limitText={count(plan.maxBusinesses)} />
        <UsageMeter label={t("people")} used={mine.usage.members} limit={plan.maxMembers} usedText={mine.usage.members.toLocaleString(locale)} limitText={count(plan.maxMembers)} />
        <UsageMeter
          label={t("storage")}
          used={Number(mine.usage.storageBytes) / 1024 / 1024}
          limit={plan.storageMb}
          usedText={bytesText(Number(mine.usage.storageBytes), locale)}
          limitText={storageText(plan.storageMb, locale, unlimited)}
        />
        {plan.aiEnabled ? (
          <UsageMeter label={t("aiToday")} used={mine.usage.aiTokensToday} limit={plan.aiDailyTokens} usedText={mine.usage.aiTokensToday.toLocaleString(locale)} limitText={plan.aiDailyTokens.toLocaleString(locale)} />
        ) : (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{t("ai")}</span>
            <span className="font-medium">{t("notOnPlan")}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

const Feature = ({ on, children }: { on: boolean; children: string }) => (
  <li className={cn("flex items-start gap-2.5 text-sm", !on && "text-muted-foreground")}>
    {on ? <Check className="mt-0.5 size-4 shrink-0" /> : <Minus className="mt-0.5 size-4 shrink-0" />}
    <span>{children}</span>
  </li>
);

const PlanCard = ({ plan, cycle, mine }: { plan: Plan; cycle: Cycle; mine: MyPlan }) => {
  const { t, i18n } = useTranslation("billing");
  const { locale, digitStyle } = useFormatting();
  const free = plan.priceMonthlyMinor === "0" && plan.priceYearlyMinor === "0";
  // During a trial or grace period Pro is on, but it still has to be bought to keep it.
  const isCurrent = mine.plan.key === plan.key && mine.state !== "trial" && mine.state !== "grace";
  const featured = plan.key === "pro";
  const price = cycle === "YEARLY" ? plan.priceYearlyMinor : plan.priceMonthlyMinor;
  // How much a year saves against twelve months.
  const saving = BigInt(plan.priceMonthlyMinor) * 12n - BigInt(plan.priceYearlyMinor);
  const unlimited = t("unlimited");
  const n = (value: number | null, key: string) => (value === null ? t(`${key}Unlimited`) : t(key, { count: value, n: value.toLocaleString(locale) }));

  return (
    <div
      className={cn("relative flex flex-col rounded-xl border bg-surface p-6 transition-shadow hover:shadow-md", featured && "border-foreground shadow-md ring-1 ring-foreground")}
      data-testid={`plan-${plan.key}`}
    >
      {featured ? <Badge className="absolute -top-2.5 left-6 bg-foreground text-background">{t("recommended")}</Badge> : null}
      <p className="text-lg font-semibold">{planName(plan, i18n.language)}</p>
      <p className="mt-1 min-h-10 text-sm text-muted-foreground">{planDescription(plan, i18n.language)}</p>
      <p className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">{free ? t("free") : priceText(price, plan.currency, digitStyle)}</span>
        {!free ? <span className="text-sm text-muted-foreground">{cycle === "YEARLY" ? t("perYear") : t("perMonth")}</span> : null}
      </p>
      <p className="mt-1 h-5 text-xs text-muted-foreground">
        {!free && cycle === "YEARLY" && saving > 0n ? t("youSave", { amount: priceText(saving.toString(), plan.currency, digitStyle) }) : null}
      </p>
      <ul className="mt-5 flex-1 space-y-2.5">
        <Feature on>{n(plan.maxBusinesses, "businessesN")}</Feature>
        <Feature on>{n(plan.maxMembers, "peopleN")}</Feature>
        <Feature on>{t("storageN", { size: storageText(plan.storageMb, locale, unlimited) })}</Feature>
        <Feature on>{t("everything")}</Feature>
        <Feature on={plan.aiEnabled}>{t("aiFeature")}</Feature>
        <Feature on={(plan.maxBusinesses ?? 2) > 1}>{t("combined")}</Feature>
      </ul>
      <div className="mt-6">
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            {t("currentPlan")}
          </Button>
        ) : free ? null : (
          <>
            {/* Paying online arrives in step 11.2. Until then the button says so. */}
            <Button className="w-full" disabled>
              {t("upgradeTo", { plan: planName(plan, i18n.language) })}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">{t("paymentsSoon")}</p>
          </>
        )}
      </div>
    </div>
  );
};
