import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { errorMessage } from "@/lib/errors";
import { minorToInput, parseMoney } from "@/lib/money";
import { useUpdateBusiness, type Business, type BusinessSettings } from "../api";

// Expenses above this amount wait for an owner or admin, and that person can't be the one who recorded it.
// Empty means no limit: every expense posts straight away.
export const ApprovalLimitCard = ({ business, editable }: { business: Business; editable: boolean }) => {
  const { t } = useTranslation(["finance", "validation", "common"]);
  const update = useUpdateBusiness(business.id);
  const saved = (business.settings as unknown as BusinessSettings).approvalThresholdMinor ?? null;
  const [text, setText] = useState(saved === null ? "" : minorToInput(saved, business.baseCurrency));
  const [invalid, setInvalid] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim() ? parseMoney(text, business.baseCurrency) : null;
    if (text.trim() && value === null) return setInvalid(true);
    setInvalid(false);
    // A promise rather than onSuccess: the card remounts when the saved business reloads, and a
    // mutate() callback doesn't run after its component has gone.
    update.mutateAsync({ settings: { approvalThresholdMinor: value } }).then(
      () => toast.success(t("common:saved")),
      () => undefined,
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("finance:approvalLimit")}</CardTitle>
        <CardDescription>{t("finance:approvalLimitHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate>
          <fieldset disabled={!editable} className="space-y-4">
            {update.isError ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}
            <Field label={t("finance:approvalLimitLabel")} error={invalid ? t("validation:amount") : undefined}>
              <MoneyInput currency={business.baseCurrency} placeholder={t("finance:noLimit")} value={text} onChange={(event) => setText(event.target.value)} className="sm:max-w-xs" />
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
