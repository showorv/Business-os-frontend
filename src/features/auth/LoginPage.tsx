import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { noticeShown, useAppDispatch, useAppSelector } from "@/app/store";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import { useLogin } from "./api";
import { AuthCard } from "./AuthCard";
import { loginSchema } from "./schemas";

export const LoginPage = () => {
  const { t } = useTranslation(["auth", "validation", "settings"]);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  // Kept by this page, and cleared from the store, so it shows once and not on a later visit.
  const storedNotice = useAppSelector((state) => state.auth.notice);
  const [notice] = useState(storedNotice);
  const login = useLogin();
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors } = form.formState;

  useEffect(() => {
    dispatch(noticeShown());
  }, [dispatch]);

  const submit = form.handleSubmit(async (values) => {
    const result = await login.mutateAsync(values).catch(() => null);
    if (result && "challengeToken" in result) void navigate("/login/mfa", { state: { challengeToken: result.challengeToken } });
  });

  const noticeText = notice === "passwordChanged" ? t("settings:passwordChanged") : notice === "resetDone" ? t("auth:resetDone") : notice ? t("auth:sessionEnded") : null;

  return (
    <AuthCard
      title={t("auth:loginTitle")}
      subtitle={t("auth:loginSubtitle")}
      footer={
        <>
          {t("auth:noAccount")}{" "}
          <Link to="/register" className="font-medium text-brand hover:underline">
            {t("auth:createAccount")}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {noticeText && !login.isError ? <Alert>{noticeText}</Alert> : null}
        {login.isError ? <Alert tone="danger">{errorMessage(login.error)}</Alert> : null}
        <Field label={t("auth:email")} error={errors.email && t(`validation:${errors.email.message}`)}>
          <Input type="email" autoComplete="email" autoFocus {...form.register("email")} />
        </Field>
        <Field label={t("auth:password")} error={errors.password && t(`validation:${errors.password.message}`)}>
          <Input type="password" autoComplete="current-password" {...form.register("password")} />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-brand hover:underline">
            {t("auth:forgot")}
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? t("auth:signingIn") : t("auth:signIn")}
        </Button>
      </form>
    </AuthCard>
  );
};
