import { zodResolver } from "@hookform/resolvers/zod";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useAppSelector } from "@/app/store";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { useConfirmMfa, useDisableMfa, useStartMfa } from "@/features/auth/api";
import { codeSchema } from "@/features/auth/schemas";
import { errorMessage } from "@/lib/errors";

const passwordSchema = z.object({ password: z.string().min(1, "required") });
const disableSchema = passwordSchema.merge(codeSchema);

const codeInput = { inputMode: "numeric", autoComplete: "one-time-code", maxLength: 6, className: "text-center text-lg tracking-[0.4em]" } as const;

// Turning on is two steps: the password unlocks a new secret, then a code from the app proves it was saved.
const EnableFlow = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation(["settings", "auth", "validation", "common"]);
  const start = useStartMfa();
  const confirm = useConfirmMfa();
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { password: "" } });
  const codeForm = useForm({ resolver: zodResolver(codeSchema), defaultValues: { code: "" } });

  if (!start.data) {
    const error = passwordForm.formState.errors.password;
    return (
      <form onSubmit={passwordForm.handleSubmit((values) => start.mutate(values.password))} className="space-y-4" noValidate>
        <p className="text-sm text-muted-foreground">{t("settings:mfaStart")}</p>
        {start.isError ? <Alert tone="danger">{errorMessage(start.error)}</Alert> : null}
        <Field label={t("auth:password")} error={error && t(`validation:${error.message}`)}>
          <Input type="password" autoComplete="current-password" autoFocus {...passwordForm.register("password")} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={start.isPending}>
            {t("common:continue")}
          </Button>
        </div>
      </form>
    );
  }

  const error = codeForm.formState.errors.code;
  return (
    <form onSubmit={codeForm.handleSubmit((values) => confirm.mutate(values.code, { onSuccess: onDone }))} className="space-y-4" noValidate>
      <p className="text-sm">{t("settings:mfaScan")}</p>
      {/* White behind the code, so phone cameras read it in dark rooms too. */}
      <div className="flex justify-center rounded-md bg-white p-4">
        <QRCodeSVG value={start.data.otpauthUri} size={176} />
      </div>
      <div className="text-sm">
        <p className="text-muted-foreground">{t("settings:mfaManual")}</p>
        <code className="mt-1 block rounded bg-muted px-2 py-1.5 font-mono text-xs break-all select-all">{start.data.secret}</code>
      </div>
      <Alert tone="warning">{t("settings:mfaNoRecovery")}</Alert>
      {confirm.isError ? <Alert tone="danger">{errorMessage(confirm.error)}</Alert> : null}
      <Field label={t("auth:code")} error={error && t(`validation:${error.message}`)}>
        <Input autoFocus {...codeInput} {...codeForm.register("code")} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={confirm.isPending}>
          {t("settings:mfaConfirm")}
        </Button>
      </div>
    </form>
  );
};

const DisableFlow = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation(["settings", "auth", "validation"]);
  const disable = useDisableMfa();
  const form = useForm({ resolver: zodResolver(disableSchema), defaultValues: { password: "", code: "" } });
  const { errors } = form.formState;
  return (
    <form onSubmit={form.handleSubmit((values) => disable.mutate(values, { onSuccess: onDone }))} className="space-y-4" noValidate>
      {disable.isError ? <Alert tone="danger">{errorMessage(disable.error)}</Alert> : null}
      <Field label={t("auth:password")} error={errors.password && t(`validation:${errors.password.message}`)}>
        <Input type="password" autoComplete="current-password" autoFocus {...form.register("password")} />
      </Field>
      <Field label={t("auth:code")} error={errors.code && t(`validation:${errors.code.message}`)}>
        <Input {...codeInput} {...form.register("code")} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" variant="danger" disabled={disable.isPending}>
          {t("settings:mfaDisable")}
        </Button>
      </div>
    </form>
  );
};

export const MfaCard = () => {
  const { t } = useTranslation("settings");
  const enabled = useAppSelector((state) => state.auth.user?.mfaEnabled) ?? false;
  // Chosen when the dialog opens. Reading `enabled` instead would swap the dialog's content the moment
  // the server confirms, before it closes.
  const [mode, setMode] = useState<"enable" | "disable" | null>(null);

  const finish = (message: string) => {
    setMode(null);
    toast.success(message);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{t("mfa")}</CardTitle>
          <CardDescription>{enabled ? t("mfaOnBody") : t("mfaOffBody")}</CardDescription>
        </div>
        <Badge className={enabled ? "bg-brand-soft text-brand" : undefined}>{enabled ? t("mfaOn") : t("mfaOff")}</Badge>
      </CardHeader>
      <CardContent>
        <Button variant={enabled ? "outline" : "primary"} onClick={() => setMode(enabled ? "disable" : "enable")}>
          {enabled ? t("mfaDisable") : t("mfaEnable")}
        </Button>
        <Modal open={mode !== null} onOpenChange={(open) => !open && setMode(null)}>
          <ModalContent title={t("mfa")} description={mode === "disable" ? t("mfaDisableBody") : undefined}>
            {/* Remounted on every open, so a cancelled attempt starts fresh. */}
            {mode === "disable" ? <DisableFlow onDone={() => finish(t("mfaDisabled"))} /> : null}
            {mode === "enable" ? <EnableFlow onDone={() => finish(t("mfaEnabled"))} /> : null}
          </ModalContent>
        </Modal>
      </CardContent>
    </Card>
  );
};
