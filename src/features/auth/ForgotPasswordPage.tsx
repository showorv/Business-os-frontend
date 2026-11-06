import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import { useForgotPassword } from "./api";
import { AuthCard } from "./AuthCard";
import { forgotSchema } from "./schemas";

export const ForgotPasswordPage = () => {
  const { t } = useTranslation(["auth", "validation"]);
  const forgot = useForgotPassword();
  const form = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const error = form.formState.errors.email;

  return (
    <AuthCard
      title={t("auth:forgotTitle")}
      subtitle={t("auth:forgotSubtitle")}
      footer={
        <Link to="/login" className="text-brand hover:underline">
          {t("auth:backToLogin")}
        </Link>
      }
    >
      {/* The same answer whether or not the email has an account, as the backend intends. */}
      {forgot.isSuccess ? (
        <Alert>{t("auth:forgotSent")}</Alert>
      ) : (
        <form onSubmit={form.handleSubmit((values) => forgot.mutate(values))} className="space-y-4" noValidate>
          {forgot.isError ? <Alert tone="danger">{errorMessage(forgot.error)}</Alert> : null}
          <Field label={t("auth:email")} error={error && t(`validation:${error.message}`)}>
            <Input type="email" autoComplete="email" autoFocus {...form.register("email")} />
          </Field>
          <Button type="submit" className="w-full" disabled={forgot.isPending}>
            {forgot.isPending ? t("auth:sending") : t("auth:sendLink")}
          </Button>
        </form>
      )}
    </AuthCard>
  );
};
