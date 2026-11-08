import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { rateLabel, VAT_RATES } from "@/features/invoices/vat";
import { errorMessage } from "@/lib/errors";
import { useUpdateBusiness, type Business, type BusinessSettings } from "../api";

// Whether the business charges VAT, and the rate new invoice lines start with.
export const VatCard = ({ business, editable }: { business: Business; editable: boolean }) => {
  const { t } = useTranslation(["invoices", "common"]);
  const update = useUpdateBusiness(business.id);
  const settings = business.settings as unknown as BusinessSettings;
  const [registered, setRegistered] = useState(settings.vatRegistered === true);
  const [rate, setRate] = useState(settings.defaultVatRateBp ?? 1500);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutateAsync({ settings: { vatRegistered: registered, defaultVatRateBp: rate } }).then(
      () => toast.success(t("common:saved")),
      () => undefined,
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("vatSettings")}</CardTitle>
        <CardDescription>{t("vatSettingsHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate data-testid="vat-settings">
          <fieldset disabled={!editable} className="space-y-4">
            {update.isError ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={registered} onChange={(event) => setRegistered(event.target.checked)} className="mt-0.5 size-4 accent-foreground" />
              <span>
                <span className="block font-medium">{t("vatRegistered")}</span>
                <span className="text-muted-foreground">{t("vatRegisteredHint")}</span>
              </span>
            </label>
            <Field label={t("defaultVatRate")}>
              <Select value={rate} disabled={!registered} onChange={(event) => setRate(Number(event.target.value))} className="sm:max-w-xs">
                {VAT_RATES.map((value) => (
                  <option key={value} value={value}>
                    {rateLabel(value)}
                  </option>
                ))}
              </Select>
            </Field>
            {editable ? (
              <div className="flex justify-end">
                <Button type="submit" disabled={update.isPending}>
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
