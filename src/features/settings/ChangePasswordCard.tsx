import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChangePassword } from "@/features/auth/api";
import { changePasswordSchema } from "@/features/auth/schemas";
import { errorMessage } from "@/lib/errors";
import { needsStepUp, useStepUpRetry } from "@/features/auth/useStepUpRetry";

// Changing the password signs out every device, this one too, so success lands on the sign-in page.
export const ChangePasswordCard = () => {
  const { t } = useTranslation(["settings", "auth", "validation"]);
  const change = useChangePassword();
  const { run, stepUpModal } = useStepUpRetry();
  const form = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "" } });
  const { errors } = form.formState;

  const send = () => run(() => change.mutateAsync(form.getValues()));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings:changePassword")}</CardTitle>
        <CardDescription>{t("settings:changePasswordHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(send)} className="max-w-md space-y-4" noValidate>
          {change.isError && !needsStepUp(change.error) ? <Alert tone="danger">{errorMessage(change.error)}</Alert> : null}
          <Field label={t("settings:currentPassword")} error={errors.currentPassword && t(`validation:${errors.currentPassword.message}`)}>
            <Input type="password" autoComplete="current-password" {...form.register("currentPassword")} />
          </Field>
          <Field label={t("auth:newPassword")} error={errors.newPassword && t(`validation:${errors.newPassword.message}`)} hint={t("auth:passwordHint")}>
            <Input type="password" autoComplete="new-password" {...form.register("newPassword")} />
          </Field>
          <Button type="submit" disabled={change.isPending}>
            {t("settings:changePassword")}
          </Button>
        </form>
        {stepUpModal}
      </CardContent>
    </Card>
  );
};
