import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { useAppSelector } from "@/app/store";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { currentLocale } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { rememberBusiness } from "@/lib/preferences";
import { BUSINESS_TYPES, useBusinesses, useCreateBusiness } from "./api";

const CURRENCIES = ["BDT", "USD", "EUR", "GBP", "INR"];
const COMMON_TIMEZONES = ["Asia/Dhaka", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"];

const schema = z.object({
  name: z.string().trim().min(1, "required").max(200, "tooLong"),
  type: z.enum(BUSINESS_TYPES),
  baseCurrency: z.string().length(3),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
  timezone: z.string().min(1),
});

// July is the usual start of Bangladesh's financial year.
export const CreateBusinessPage = () => {
  const { t } = useTranslation(["businesses", "validation", "common"]);
  const navigate = useNavigate();
  const userId = useAppSelector((state) => state.auth.user?.id);
  const hasBusinesses = (useBusinesses().data?.length ?? 0) > 0;
  const create = useCreateBusiness();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "RETAIL", baseCurrency: "BDT", fiscalYearStartMonth: 7, timezone: "Asia/Dhaka" },
  });
  const nameError = form.formState.errors.name;
  const monthName = new Intl.DateTimeFormat(currentLocale(), { month: "long" });

  const submit = form.handleSubmit((values) =>
    create.mutate(values, {
      onSuccess: (business) => {
        if (userId) rememberBusiness(userId, business.id);
        void navigate(`/b/${business.id}`, { replace: true });
      },
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("businesses:createTitle")}</CardTitle>
        <CardDescription>{t("businesses:createSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {create.isError ? <Alert tone="danger">{errorMessage(create.error)}</Alert> : null}
          <Field label={t("businesses:name")} error={nameError && t(`validation:${nameError.message}`)}>
            <Input autoFocus autoComplete="organization" {...form.register("name")} />
          </Field>
          <Field label={t("businesses:type")} hint={t("businesses:typeHint")}>
            <Select {...form.register("type")}>
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`businesses:type${type}`)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("businesses:currency")}>
              <Select {...form.register("baseCurrency")}>
                {CURRENCIES.map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </Select>
            </Field>
            <Field label={t("businesses:fiscalStart")}>
              <Select {...form.register("fiscalYearStartMonth")}>
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index} value={index + 1}>
                    {monthName.format(new Date(2026, index, 1))}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t("businesses:timezone")}>
            <Select {...form.register("timezone")}>
              {COMMON_TIMEZONES.map((zone) => (
                <option key={zone}>{zone}</option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {hasBusinesses ? (
              <Button variant="outline" asChild>
                <Link to="/">{t("common:cancel")}</Link>
              </Button>
            ) : null}
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? t("businesses:creating") : t("businesses:create")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
