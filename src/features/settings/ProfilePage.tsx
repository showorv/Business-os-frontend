import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useAppSelector } from "@/app/store";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { useUpdateMe } from "@/features/auth/api";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import type { SessionUser } from "@/lib/session";

const schema = z.object({
  name: z.string().trim().min(1, "required").max(120, "tooLong"),
  locale: z.enum(["en", "bn-BD"]),
  digitStyle: z.enum(["latin", "bangla"]),
});

// Starts again whenever the saved profile changes elsewhere, such as the language button in the top bar.
export const ProfilePage = () => {
  const user = useAppSelector((state) => state.auth.user)!;
  return <ProfileForm key={`${user.name}|${user.locale}|${user.digitStyle}`} user={user} />;
};

const ProfileForm = ({ user }: { user: SessionUser }) => {
  const { t } = useTranslation(["settings", "auth", "common", "validation"]);
  const update = useUpdateMe();
  const saved: z.infer<typeof schema> = {
    name: user.name,
    locale: user.locale === "bn-BD" ? "bn-BD" : "en",
    digitStyle: user.digitStyle === "bangla" ? "bangla" : "latin",
  };
  const form = useForm({ resolver: zodResolver(schema), defaultValues: saved });
  const nameError = form.formState.errors.name;
  const digitStyle = useWatch({ control: form.control, name: "digitStyle" });

  // mutateAsync, because saving remounts this form, and a per-call callback would be dropped with it.
  const submit = form.handleSubmit(async (values) => {
    await update.mutateAsync(values).then(() => toast.success(t("common:saved")), () => undefined);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings:profileTitle")}</CardTitle>
        <CardDescription>{t("settings:profileSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="max-w-md space-y-4" noValidate>
          {update.isError ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}
          <Field label={t("auth:name")} error={nameError && t(`validation:${nameError.message}`)}>
            <Input autoComplete="name" {...form.register("name")} />
          </Field>
          <Field label={t("auth:email")}>
            <Input value={user.email} disabled readOnly />
          </Field>
          <Field label={t("common:language")}>
            <Select {...form.register("locale")}>
              <option value="en">{t("common:english")}</option>
              <option value="bn-BD">{t("common:bangla")}</option>
            </Select>
          </Field>
          <Field label={t("settings:digitStyle")} hint={formatMoney(12_500_000n, "BDT", { digitStyle })}>
            <Select {...form.register("digitStyle")}>
              <option value="latin">{t("settings:digitsLatin")}</option>
              <option value="bangla">{t("settings:digitsBangla")}</option>
            </Select>
          </Field>
          <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
            {t("common:save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
