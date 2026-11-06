import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { currentLocale } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { useRegister } from "./api";
import { AuthCard } from "./AuthCard";
import { registerSchema } from "./schemas";

export const RegisterPage = () => {
  const { t } = useTranslation(["auth", "validation"]);
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
          <Link to="/login" className="font-medium text-brand hover:underline">
            {t("auth:signIn")}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {register.isError ? <Alert tone="danger">{errorMessage(register.error)}</Alert> : null}
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
      </form>
    </AuthCard>
  );
};
