import { CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { monthName } from "@/features/businesses/options";

// A placeholder home until the dashboard arrives in step 9.4.
export const BusinessHomePage = () => {
  const { t } = useTranslation(["businesses", "shell"]);
  const { business } = useCurrentBusiness();
  if (!business) return null;

  const rows: [string, string][] = [
    [t("businesses:type"), t(`businesses:type${business.type}`, { defaultValue: business.type })],
    [t("businesses:currency"), business.baseCurrency],
    [t("businesses:fiscalStart"), monthName(business.fiscalYearStartMonth)],
    [t("businesses:timezone"), business.timezone],
    [t("businesses:role"), t(`shell:role${business.roleKey}`, { defaultValue: business.roleKey })],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("businesses:welcome", { name: business.name })}</h1>
        <p className="mt-1 text-muted-foreground">{t("businesses:welcomeBody")}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("businesses:details")}</CardTitle>
            <Badge>{t(`businesses:status${business.status}`)}</Badge>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("businesses:whatsNext")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {(["next93", "next94", "next95"] as const).map((key) => (
                <li key={key} className="flex gap-2">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {t(`businesses:${key}`)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
