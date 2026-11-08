import {
  BookOpenCheck,
  Bot,
  Check,
  FileSpreadsheet,
  FolderOpen,
  Landmark,
  ListChecks,
  Percent,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { useSignupInfo } from "./api";
import { useGuestDigits } from "./parts";

const FEATURES: { key: string; icon: LucideIcon; pro?: boolean }[] = [
  { key: "books", icon: BookOpenCheck },
  { key: "invoices", icon: FileSpreadsheet },
  { key: "vat", icon: Percent },
  { key: "statements", icon: Landmark },
  { key: "budgets", icon: PiggyBank },
  { key: "tasks", icon: ListChecks },
  { key: "documents", icon: FolderOpen },
  { key: "ai", icon: Bot, pro: true },
];

// The front door for people who haven't signed in: what the app does, who it's for, and the way in.
export const HomePage = () => {
  const { t } = useTranslation("public");
  const signup = useSignupInfo();
  const trialDays = signup.data?.trialDays ?? 0;
  const closed = signup.data?.signupsEnabled === false;

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">{t("hero_title")}</h1>
          <p className="max-w-xl text-lg text-muted-foreground">{t("hero_body")}</p>
          <div className="flex flex-wrap gap-3">
            {closed ? null : (
              <Button asChild className="h-11 px-5 text-base">
                <Link to="/register">{t("cta_start")}</Link>
              </Button>
            )}
            <Button asChild className="h-11 px-5 text-base" variant="outline">
              <Link to="/pricing">{t("cta_pricing")}</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="hero-trial">
            {closed ? t("signupsClosed") : trialDays > 0 ? t("hero_trial", { count: trialDays }) : t("hero_free")}
          </p>
        </div>
        <ExampleMonth />
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">{t("features_title")}</h2>
            <p className="text-muted-foreground">{t("features_body")}</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ key, icon: Icon, pro }) => (
              <li key={key}>
                <Card className="h-full">
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex size-10 items-center justify-center rounded-lg border bg-background">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      {pro ? <Badge className="bg-foreground text-background">{t("f_pro")}</Badge> : null}
                    </div>
                    <h3 className="pt-2 font-semibold">{t(`f_${key}_title`)}</h3>
                    <p className="text-sm text-muted-foreground">{t(`f_${key}_body`)}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
        <CheckList title={t("local_title")} items={[t("local_1"), t("local_2"), t("local_3"), t("local_4")]} />
        <CheckList title={t("safe_title")} items={[t("safe_1"), t("safe_2"), t("safe_3"), t("safe_4")]} />
      </section>

      <section className="border-t">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">{t("how_title")}</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((step) => (
              <li key={step} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">{step}</span>
                <div>
                  <h3 className="font-semibold">{t(`how_${step}_title`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`how_${step}_body`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t bg-foreground text-background">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">{t("end_title")}</h2>
            <p className="opacity-75">{t("end_body")}</p>
          </div>
          {closed ? null : (
            <Button asChild variant="outline" className="h-11 border-background px-5 text-base bg-background text-foreground hover:bg-background/90">
              <Link to="/register">{t("cta_start")}</Link>
            </Button>
          )}
        </div>
      </section>
    </>
  );
};

const CheckList = ({ title, items }: { title: string; items: string[] }) => (
  <div className="space-y-4">
    <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <Check className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

// A made-up month, drawn with the app's own pieces, so people see what they'll get. Marked as an example.
const ExampleMonth = () => {
  const { t } = useTranslation("public");
  const digitStyle = useGuestDigits();
  const money = (minor: number) => formatMoney(String(minor), "BDT", { digitStyle }).replace(/\.[0০]{2}$/, "");
  const bars = [52, 61, 47, 70, 66, 84];
  return (
    <figure className="space-y-2" aria-label={t("mock_note")}>
      <Card className="shadow-lg">
        <CardContent className="space-y-5">
          <p className="text-sm font-medium text-muted-foreground">{t("mock_title")}</p>
          <dl className="grid grid-cols-3 gap-3">
            {[
              ["mock_in", 48500000],
              ["mock_out", 31250000],
              ["mock_profit", 17250000],
            ].map(([key, minor]) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">{t(key as string)}</dt>
                <dd className="text-lg font-semibold tracking-tight tabular-nums sm:text-xl">{money(minor as number)}</dd>
              </div>
            ))}
          </dl>
          <div className="flex h-24 items-end gap-2" aria-hidden>
            {bars.map((height, index) => (
              <div key={index} className="flex-1 rounded-t-[4px]" style={{ height: `${height}%`, background: index === bars.length - 1 ? "var(--chart-1)" : "var(--chart-4)" }} />
            ))}
          </div>
          <div className="divide-y rounded-lg border text-sm">
            <div className="flex items-center justify-between px-3 py-2.5">
              <span>
                <span className="text-muted-foreground">{t("mock_dues")}: </span>
                {t("mock_owes")}
                <span className="block text-xs text-muted-foreground">{t("mock_late")}</span>
              </span>
              <span className="font-medium tabular-nums">{money(1250000)}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-muted-foreground">{t("mock_vat")}</span>
              <span className="font-medium tabular-nums">{money(2250000)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <figcaption className="text-center text-xs text-muted-foreground">{t("mock_note")}</figcaption>
    </figure>
  );
};
