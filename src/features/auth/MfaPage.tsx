import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import { useVerifyMfa } from "./api";
import { AuthCard } from "./AuthCard";
import { codeSchema } from "./schemas";

// The challenge token lives only in this page's state: never in the URL, where it could be shared.
export const MfaPage = () => {
  const { t } = useTranslation(["auth", "validation"]);
  const state = useLocation().state as { challengeToken?: string; from?: string } | null;
  const challengeToken = state?.challengeToken;
  const verify = useVerifyMfa();
  const form = useForm({ resolver: zodResolver(codeSchema), defaultValues: { code: "" } });

  if (!challengeToken) return <Navigate to="/login" replace />;

  const submit = form.handleSubmit((values) => verify.mutate({ challengeToken, code: values.code }));
  const error = form.formState.errors.code;

  return (
    <AuthCard
      title={t("auth:mfaTitle")}
      subtitle={t("auth:mfaSubtitle")}
      footer={
        <Link to="/login" state={{ from: state?.from }} className="text-brand hover:underline">
          {t("auth:backToLogin")}
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {verify.isError ? <Alert tone="danger">{errorMessage(verify.error)}</Alert> : null}
        <Field label={t("auth:code")} error={error && t(`validation:${error.message}`)}>
          <Input inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} className="text-center text-lg tracking-[0.4em]" {...form.register("code")} />
        </Field>
        <Button type="submit" className="w-full" disabled={verify.isPending}>
          {verify.isPending ? t("auth:verifying") : t("auth:verify")}
        </Button>
      </form>
    </AuthCard>
  );
};
