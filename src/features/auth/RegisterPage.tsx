import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { currentLocale } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { useRegister } from "./api";
import { useReturnTo } from "@/app/guards";
import { InvitationNotice } from "./InvitationNotice";
import { AuthCard } from "./AuthCard";
import { registerSchema } from "./schemas";

export const RegisterPage = () => {
  const { t } = useTranslation(["auth", "validation"]);
  const from = useReturnTo();
  const register = useRegister();
  const form = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "" } });
  const { errors } = form.formState;

  // The language on screen now becomes the account's language.
  const submit = form.handleSubmit((values) => register.mutate({ ...values, locale: currentLocale() }));

  return (
    <AuthCard
      title={t("auth:registerTitle")}
      subtitle={t("auth:registerSubtitle")}
      footer={
        <>
          {t("auth:haveAccount")}{" "}
          <Link to="/login" state={{ from }} className="font-medium text-brand hover:underline">
            {t("auth:signIn")}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {register.isError ? <Alert tone="danger">{errorMessage(register.error)}</Alert> : null}
        <InvitationNotice from={from} />
        <Field label={t("auth:name")} error={errors.name && t(`validation:${errors.name.message}`)}>
          <Input autoComplete="name" autoFocus {...form.register("name")} />
        </Field>
        <Field label={t("auth:email")} error={errors.email && t(`validation:${errors.email.message}`)}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label={t("auth:password")} error={errors.password && t(`validation:${errors.password.message}`)} hint={t("auth:passwordHint")}>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>
        <Button type="submit" className="w-full" disabled={register.isPending}>
          {register.isPending ? t("auth:registering") : t("auth:register")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          <Trans
            i18nKey="public:agree"
            components={{
              terms: <Link to="/terms" target="_blank" className="underline underline-offset-2 hover:text-foreground" />,
              privacy: <Link to="/privacy" target="_blank" className="underline underline-offset-2 hover:text-foreground" />,
            }}
          />
        </p>
      </form>
    </AuthCard>
  );
};
