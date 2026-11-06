import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { errorMessage } from "@/lib/errors";
import { INVITABLE_ROLES } from "@/lib/permissions";
import { invitationLink, useInvite, type SentInvitation } from "./api";

const schema = z.object({
  email: z.email("email"),
  roleKey: z.enum(["ADMIN", "ACCOUNTANT", "MANAGER", "VIEWER"]),
});

// Sends an invitation email. Afterwards it also shows the link, to share another way if needed.
export const InviteDialog = ({ businessId, onClose }: { businessId: string; onClose: () => void }) => {
  const { t } = useTranslation(["team", "shell", "common", "validation"]);
  const invite = useInvite(businessId);
  const [sent, setSent] = useState<SentInvitation | null>(null);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", roleKey: "VIEWER" as const } });
  const role = useWatch({ control: form.control, name: "roleKey" });
  const emailError = form.formState.errors.email?.message;

  const submit = form.handleSubmit((values) => invite.mutate(values, { onSuccess: setSent }));

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent title={sent ? t("team:inviteSentTitle") : t("team:inviteTitle")} description={sent ? t("team:inviteSentBody", { email: sent.email }) : t("team:inviteHint")}>
        {sent ? (
          <div className="space-y-4">
            <CopyLink link={invitationLink(sent.token)} />
            <div className="flex justify-end">
              <Button onClick={onClose}>{t("common:close")}</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            {invite.isError ? <Alert tone="danger">{errorMessage(invite.error)}</Alert> : null}
            <Field label={t("team:email")} error={emailError && t(`validation:${emailError}`)}>
              <Input type="email" autoComplete="off" autoFocus {...form.register("email")} />
            </Field>
            <Field label={t("team:role")} hint={t(`team:roleHint${role}`)}>
              <Select {...form.register("roleKey")}>
                {INVITABLE_ROLES.map((key) => (
                  <option key={key} value={key}>
                    {t(`shell:role${key}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose}>
                {t("common:cancel")}
              </Button>
              <Button type="submit" disabled={invite.isPending}>
                {t("team:sendInvite")}
              </Button>
            </div>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
};

const CopyLink = ({ link }: { link: string }) => {
  const { t } = useTranslation("team");
  const [copied, setCopied] = useState(false);
  const copy = () =>
    void navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{t("inviteLink")}</p>
      <div className="flex gap-2">
        <Input value={link} readOnly onFocus={(event) => event.target.select()} aria-label={t("inviteLink")} className="font-mono text-xs" />
        <Button variant="outline" size="icon" onClick={copy} aria-label={t("copyLink")} className="shrink-0">
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t("inviteLinkHint")}</p>
    </div>
  );
};
