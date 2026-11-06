import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";
import { signedOut, useAppDispatch } from "@/app/store";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import { useResetPassword } from "./api";
import { AuthCard } from "./AuthCard";
import { resetSchema } from "./schemas";

// Opened from the email's link: /reset-password?token=...
export const ResetPasswordPage = () => {
  const { t } = useTranslation(["auth", "validation"]);
  const token = useSearchParams()[0].get("token");
  const reset = useResetPassword();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const form = useForm({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  const { errors } = form.formState;

  const submit = form.handleSubmit((values) =>
    reset.mutate(
      { token: token!, password: values.password },
      {
        onSuccess: () => {
          dispatch(signedOut("resetDone"));
          void navigate("/login", { replace: true });
        },
      },
    ),
  );

  return (
    <AuthCard
      title={t("auth:resetTitle")}
      footer={
        <Link to="/login" className="text-brand hover:underline">
          {t("auth:backToLogin")}
        </Link>
      }
    >
      {!token ? (
        <Alert tone="danger">{t("auth:resetMissingToken")}</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {reset.isError ? <Alert tone="danger">{errorMessage(reset.error)}</Alert> : null}
          <Field label={t("auth:newPassword")} error={errors.password && t(`validation:${errors.password.message}`)} hint={t("auth:passwordHint")}>
            <Input type="password" autoComplete="new-password" autoFocus {...form.register("password")} />
          </Field>
          <Field label={t("auth:confirmPassword")} error={errors.confirm && t(`validation:${errors.confirm.message}`)}>
            <Input type="password" autoComplete="new-password" {...form.register("confirm")} />
          </Field>
          <Button type="submit" className="w-full" disabled={reset.isPending}>
            {t("auth:resetButton")}
          </Button>
        </form>
      )}
    </AuthCard>
  );
};
