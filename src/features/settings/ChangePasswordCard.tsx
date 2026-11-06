import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChangePassword } from "@/features/auth/api";
import { changePasswordSchema } from "@/features/auth/schemas";
import { ApiError } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { StepUpModal } from "./StepUpModal";

// Changing the password signs out every device, this one too, so success lands on the sign-in page.
export const ChangePasswordCard = () => {
  const { t } = useTranslation(["settings", "auth", "validation"]);
  const change = useChangePassword();
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const form = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "" } });
  const { errors } = form.formState;

  const send = () =>
    change.mutate(form.getValues(), {
      onError: (error) => {
        if (error instanceof ApiError && error.code === "MFA_REQUIRED") setStepUpOpen(true);
      },
    });

  const needsStepUp = change.error instanceof ApiError && change.error.code === "MFA_REQUIRED";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings:changePassword")}</CardTitle>
        <CardDescription>{t("settings:changePasswordHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(send)} className="max-w-md space-y-4" noValidate>
          {change.isError && !needsStepUp ? <Alert tone="danger">{errorMessage(change.error)}</Alert> : null}
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
        <StepUpModal open={stepUpOpen} onOpenChange={setStepUpOpen} onConfirmed={send} />
      </CardContent>
    </Card>
  );
};
