import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/errors";
import { useAdminPlans, useSettings, useUpdateSettings, type Settings } from "./api";
import { PageTitle } from "./parts";

const Switch = ({ checked, onChange, label, hint, testId }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint: string; testId?: string }) => (
  <label className="flex items-start gap-3">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4 accent-foreground" data-testid={testId} />
    <span>
      <span className="block text-sm font-medium">{label}</span>
      <span className="block text-sm text-muted-foreground">{hint}</span>
    </span>
  </label>
);

const SettingsForm = ({ settings }: { settings: Settings }) => {
  const { t } = useTranslation("admin");
  const plans = useAdminPlans();
  const save = useUpdateSettings();
  const [draft, setDraft] = useState(settings);
  const set = <K extends keyof Settings>(field: K, value: Settings[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const setNote = (changes: Partial<Settings["announcement"]>) => setDraft((current) => ({ ...current, announcement: { ...current.announcement, ...changes } }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(
      {
        trialDays: Number(draft.trialDays),
        trialPlanKey: draft.trialPlanKey,
        graceDays: Number(draft.graceDays),
        aiEnabled: draft.aiEnabled,
        signupsEnabled: draft.signupsEnabled,
        announcement: { ...draft.announcement, en: draft.announcement.en.trim(), bn: draft.announcement.bn.trim() },
      },
      { onSuccess: () => toast.success(t("settingsSaved")) },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-6" data-testid="settings-form">
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">{t("newAccounts")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("trialDays")} hint={t("trialDaysHint")}>
            <Input type="number" min={0} max={365} required value={draft.trialDays} onChange={(event) => set("trialDays", Number(event.target.value))} />
          </Field>
          <Field label={t("trialPlan")}>
            <Select value={draft.trialPlanKey} onChange={(event) => set("trialPlanKey", event.target.value)}>
              {(plans.data ?? []).filter((plan) => plan.key !== "free").map((plan) => (
                <option key={plan.key} value={plan.key}>
                  {plan.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("graceDays")} hint={t("graceDaysHint")}>
            <Input type="number" min={0} max={60} required value={draft.graceDays} onChange={(event) => set("graceDays", Number(event.target.value))} />
          </Field>
        </div>
        <Switch checked={draft.signupsEnabled} onChange={(value) => set("signupsEnabled", value)} label={t("signupsOpen")} hint={t("signupsOpenHint")} testId="signups-switch" />
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">{t("assistant")}</h2>
        <Switch checked={draft.aiEnabled} onChange={(value) => set("aiEnabled", value)} label={t("aiOn")} hint={t("aiOnHint")} testId="ai-switch" />
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">{t("announcement")}</h2>
        <Switch checked={draft.announcement.active} onChange={(active) => setNote({ active })} label={t("announcementOn")} hint={t("announcementOnHint")} testId="announcement-switch" />
        <Segmented
          label={t("tone")}
          value={draft.announcement.tone}
          onChange={(tone) => setNote({ tone })}
          options={[
            { value: "info", label: t("tone_info") },
            { value: "warning", label: t("tone_warning") },
          ]}
        />
        <Field label={t("messageEn")}>
          <Input value={draft.announcement.en} maxLength={300} required={draft.announcement.active} onChange={(event) => setNote({ en: event.target.value })} />
        </Field>
        <Field label={t("messageBn")} hint={t("messageBnHint")}>
          <Input value={draft.announcement.bn} maxLength={300} onChange={(event) => setNote({ bn: event.target.value })} />
        </Field>
      </Card>

      {save.isError ? <Alert tone="danger">{errorMessage(save.error)}</Alert> : null}
      <Button type="submit" disabled={save.isPending}>
        {t("saveSettings")}
      </Button>
    </form>
  );
};

export const SettingsPage = () => {
  const { t } = useTranslation("admin");
  const settings = useSettings();
  return (
    <div className="max-w-3xl">
      <PageTitle title={t("nav_settings")} hint={t("settingsHint")} />
      {settings.isError ? <Alert tone="danger">{errorMessage(settings.error)}</Alert> : null}
      {settings.isLoading ? <Spinner className="mt-12" /> : null}
      {settings.data ? <SettingsForm settings={settings.data} /> : null}
    </div>
  );
};
