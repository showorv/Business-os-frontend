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
import { useUpdateBusiness, type Business, type BusinessSettings } from "../api";

const schema = z.object({
  locale: z.enum(["en", "bn-BD"]),
  currencyDisplay: z.enum(["symbol", "code"]),
  numberGrouping: z.enum(["lakh", "western"]),
  weekStart: z.enum(["saturday", "sunday", "monday"]),
  transactionPrefix: z.string().trim().min(1, "required").max(10, "tooLong"),
});

const OPTIONS = {
  currencyDisplay: ["symbol", "code"],
  numberGrouping: ["lakh", "western"],
  weekStart: ["saturday", "sunday", "monday"],
} as const;

// How the business writes money, numbers and dates, and the language of its emails and documents.
export const PreferencesCard = ({ business, editable }: { business: Business; editable: boolean }) => {
  const { t } = useTranslation(["businesses", "validation", "common"]);
  const update = useUpdateBusiness(business.id);
  const saved = business.settings as unknown as BusinessSettings;
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      locale: saved.locale ?? "en",
      currencyDisplay: saved.currencyDisplay ?? "symbol",
      numberGrouping: saved.numberGrouping ?? "lakh",
      weekStart: saved.weekStart ?? "saturday",
      transactionPrefix: saved.transactionPrefix ?? "TXN",
    },
  });
  const prefixError = form.formState.errors.transactionPrefix?.message;

  const submit = form.handleSubmit(async (values) => {
    await update.mutateAsync({ settings: values }).then(
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
        <CardTitle>{t("businesses:preferences")}</CardTitle>
        <CardDescription>{t("businesses:preferencesHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate>
          <fieldset disabled={!editable} className="space-y-4">
            {update.isError ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("businesses:locale")} hint={t("businesses:localeHint")}>
                <Select {...form.register("locale")}>
                  <option value="en">{t("common:english")}</option>
                  <option value="bn-BD">{t("common:bangla")}</option>
                </Select>
              </Field>
              {(Object.keys(OPTIONS) as (keyof typeof OPTIONS)[]).map((name) => (
                <Field key={name} label={t(`businesses:${name}`)}>
                  <Select {...form.register(name)}>
                    {OPTIONS[name].map((value) => (
                      <option key={value} value={value}>
                        {t(`businesses:${name}_${value}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
              <Field label={t("businesses:transactionPrefix")} hint={t("businesses:transactionPrefixHint")} error={prefixError && t(`validation:${prefixError}`)}>
                <Input className="uppercase" {...form.register("transactionPrefix")} />
              </Field>
            </div>
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
