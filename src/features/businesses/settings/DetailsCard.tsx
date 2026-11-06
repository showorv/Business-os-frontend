import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import { useUpdateBusiness, type Business } from "../api";
import { COMMON_TIMEZONES, CURRENCIES, monthName } from "../options";

const schema = z.object({
  name: z.string().trim().min(1, "required").max(120, "tooLong"),
  legalName: z.string().trim().max(200, "tooLong"),
  taxId: z.string().trim().max(50, "tooLong"),
  baseCurrency: z.string().length(3),
  timezone: z.string().min(1),
});

// Name, legal details, currency and time zone. The financial year start can't change once set up.
export const DetailsCard = ({ business, editable }: { business: Business; editable: boolean }) => {
  const { t } = useTranslation(["businesses", "validation", "common"]);
  const update = useUpdateBusiness(business.id);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: business.name,
      legalName: business.legalName ?? "",
      taxId: business.taxId ?? "",
      baseCurrency: business.baseCurrency,
      timezone: business.timezone,
    },
  });
  const { errors } = form.formState;
  const message = (key?: string) => key && t(`validation:${key}`);
  // Keeps the saved zone in the list even if it isn't one of the common ones.
  const zones = COMMON_TIMEZONES.includes(business.timezone) ? COMMON_TIMEZONES : [business.timezone, ...COMMON_TIMEZONES];

  const submit = form.handleSubmit(async (values) => {
    const body = { ...values, legalName: values.legalName || null, taxId: values.taxId || null };
    await update.mutateAsync(body).then(
      () => {
        form.reset(values);
        toast.success(t("common:saved"));
      },
      () => undefined,
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("businesses:details")}</CardTitle>
        <CardDescription>{t("businesses:detailsHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate>
          <fieldset disabled={!editable} className="space-y-4">
            {update.isError ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}
            <Field label={t("businesses:name")} error={message(errors.name?.message)}>
              <Input autoComplete="organization" {...form.register("name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`${t("businesses:legalName")} (${t("common:optional")})`} error={message(errors.legalName?.message)}>
                <Input {...form.register("legalName")} />
              </Field>
              <Field label={`${t("businesses:taxId")} (${t("common:optional")})`} error={message(errors.taxId?.message)}>
                <Input {...form.register("taxId")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("businesses:currency")} hint={t("businesses:currencyHint")}>
                <Select {...form.register("baseCurrency")}>
                  {[...new Set([business.baseCurrency, ...CURRENCIES])].map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("businesses:timezone")}>
                <Select {...form.register("timezone")}>
                  {zones.map((zone) => (
                    <option key={zone}>{zone}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={t("businesses:fiscalStart")} hint={t("businesses:fiscalLocked")}>
              <Input value={monthName(business.fiscalYearStartMonth)} readOnly disabled />
            </Field>
            {editable ? (
              <div className="flex justify-end">
                <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
                  {t("common:save")}
                </Button>
              </div>
            ) : null}
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
};
