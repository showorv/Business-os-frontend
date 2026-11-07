import { BellRing, Mail, Monitor, Moon, Smartphone, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { usePreferences, usePushConfig, usePushSubscriptions, useRemovePushSubscription, useSavePushSubscription, useUpdatePreferences, type Preferences } from "./api";
import { browserName, pushSupported, subscribeThisBrowser, thisBrowserSubscription, unsubscribeThisBrowser } from "./push";

// How and when this person hears about things: email, push to this browser, and quiet hours.
export const NotificationSettingsPage = () => {
  const preferences = usePreferences();
  if (preferences.isError) return <Alert tone="danger">{errorMessage(preferences.error)}</Alert>;
  if (!preferences.data) return <Spinner className="mt-12" />;
  const saved = preferences.data;
  return (
    <div className="space-y-6">
      <ChannelsCard key={`${saved.emailEnabled}|${saved.pushEnabled}|${saved.quietHoursStart}|${saved.quietHoursEnd}|${saved.timezone}`} saved={saved} />
      <PushCard />
    </div>
  );
};

const Toggle = ({ checked, onChange, label, description, icon, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; description: string; icon: ReactNode; disabled?: boolean }) => (
  <label className={cn("flex items-start gap-3 py-3", !disabled && "cursor-pointer")}>
    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium">{label}</span>
      <span className="block text-sm text-muted-foreground">{description}</span>
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative disabled:opacity-50 mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground", checked ? "bg-foreground" : "bg-muted-foreground/30")}
    >
      <span className={cn("inline-block size-5 rounded-full bg-background shadow transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")} />
    </button>
  </label>
);

const timezones = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Asia/Dhaka", "UTC"];
  }
})();

const ChannelsCard = ({ saved }: { saved: Preferences }) => {
  const { t } = useTranslation(["notifications", "common"]);
  const update = useUpdatePreferences();
  const [email, setEmail] = useState(saved.emailEnabled);
  const [push, setPush] = useState(saved.pushEnabled);
  const [quiet, setQuiet] = useState(saved.quietHoursStart !== null);
  const [start, setStart] = useState(saved.quietHoursStart ?? "22:00");
  const [end, setEnd] = useState(saved.quietHoursEnd ?? "08:00");
  const [timezone, setTimezone] = useState(saved.timezone);
  const changed =
    email !== saved.emailEnabled ||
    push !== saved.pushEnabled ||
    quiet !== (saved.quietHoursStart !== null) ||
    (quiet && (start !== saved.quietHoursStart || end !== saved.quietHoursEnd)) ||
    timezone !== saved.timezone;

  // mutateAsync, because saving remounts this form, and a per-call callback would be dropped with it.
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await update
      .mutateAsync({ emailEnabled: email, pushEnabled: push, quietHoursStart: quiet ? start : null, quietHoursEnd: quiet ? end : null, timezone })
      .then(() => toast.success(t("common:saved")), () => undefined);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("notifications:settingsTitle")}</CardTitle>
        <CardDescription>{t("notifications:settingsSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
          {update.isError ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}
          <div className="divide-y">
            <Toggle checked disabled label={t("notifications:inApp")} description={t("notifications:inAppHint")} icon={<BellRing className="size-4" />} onChange={() => undefined} />
            <Toggle checked={email} onChange={setEmail} label={t("notifications:email")} description={t("notifications:emailHint")} icon={<Mail className="size-4" />} />
            <Toggle checked={push} onChange={setPush} label={t("notifications:push")} description={t("notifications:pushHint")} icon={<Smartphone className="size-4" />} />
            <Toggle checked={quiet} onChange={setQuiet} label={t("notifications:quietHours")} description={t("notifications:quietHoursHint")} icon={<Moon className="size-4" />} />
          </div>
          {quiet ? (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3">
              <Field label={t("notifications:quietFrom")}>
                <Input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
              </Field>
              <Field label={t("notifications:quietTo")}>
                <Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
              </Field>
            </div>
          ) : null}
          <Field label={t("notifications:timezone")} hint={t("notifications:timezoneHint")}>
            <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {(timezones.includes(timezone) ? timezones : [timezone, ...timezones]).map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" disabled={!changed || update.isPending}>
            {t("common:save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const PushCard = () => {
  const { t } = useTranslation(["notifications", "common"]);
  const { locale, digitStyle } = useFormatting();
  const config = usePushConfig();
  const subscriptions = usePushSubscriptions();
  const save = useSavePushSubscription();
  const remove = useRemovePushSubscription();
  const [busy, setBusy] = useState(false);
  const [here, setHere] = useState<string | null | undefined>(() => thisBrowserSubscription());
  const supported = pushSupported();
  const permission = supported ? Notification.permission : "denied";

  const turnOn = async () => {
    if (!config.data?.publicKey) return;
    setBusy(true);
    try {
      const body = await subscribeThisBrowser(config.data.publicKey);
      if (!body) return void toast.error(t("notifications:pushBlocked"));
      const saved = await save.mutateAsync(body);
      thisBrowserSubscription(saved.id);
      setHere(saved.id);
      toast.success(t("notifications:pushOn"));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async (subscriptionId: string) => {
    setBusy(true);
    try {
      await remove.mutateAsync(subscriptionId);
      if (subscriptionId === here) {
        await unsubscribeThisBrowser();
        thisBrowserSubscription(null);
        setHere(null);
      }
      toast.success(t("notifications:pushOff"));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const list = subscriptions.data ?? [];
  const hereListed = Boolean(here && list.some((item) => item.id === here));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("notifications:pushTitle")}</CardTitle>
        <CardDescription>{t("notifications:pushSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.isLoading ? <Spinner /> : null}
        {config.data && !config.data.enabled ? <Alert tone="info">{t("notifications:pushNotConfigured")}</Alert> : null}
        {config.data?.enabled && !supported ? <Alert tone="info">{t("notifications:pushUnsupported")}</Alert> : null}
        {config.data?.enabled && supported && permission === "denied" ? <Alert tone="warning">{t("notifications:pushDenied")}</Alert> : null}
        {config.data?.enabled && supported && permission !== "denied" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <span className={cn("flex size-10 items-center justify-center rounded-lg", hereListed ? "bg-foreground text-background" : "bg-muted")}>
                <Monitor className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{t("notifications:thisBrowser", { name: browserName(navigator.userAgent) })}</p>
                <p className="text-sm text-muted-foreground">{hereListed ? t("notifications:thisBrowserOn") : t("notifications:thisBrowserOff")}</p>
              </div>
            </div>
            {hereListed ? (
              <Button variant="outline" onClick={() => void turnOff(here!)} disabled={busy}>
                {t("notifications:turnOff")}
              </Button>
            ) : (
              <Button onClick={() => void turnOn()} disabled={busy}>
                {t("notifications:turnOn")}
              </Button>
            )}
          </div>
        ) : null}

        {list.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t("notifications:devices")}</p>
            <ul className="divide-y rounded-lg border">
              {list.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3" data-testid="push-device">
                  <Monitor className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {browserName(item.userAgent ?? "")}
                      {item.id === here ? <span className="ml-1.5 font-normal text-muted-foreground">· {t("notifications:thisOne")}</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("notifications:addedWhen", { when: formatRelative(item.createdAt, locale, digitStyle) })}</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={t("notifications:removeDevice")} onClick={() => void turnOff(item.id)} disabled={busy}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
