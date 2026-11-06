import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { useStepUp } from "@/features/auth/api";
import { codeSchema } from "@/features/auth/schemas";
import { errorMessage } from "@/lib/errors";

// Asked for when the server answers MFA_REQUIRED. A good code is trusted for 10 minutes.
export const StepUpModal = ({ open, onOpenChange, onConfirmed }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirmed: () => void }) => {
  const { t } = useTranslation(["settings", "auth", "common", "validation"]);
  const stepUp = useStepUp();
  const form = useForm({ resolver: zodResolver(codeSchema), defaultValues: { code: "" } });
  const error = form.formState.errors.code;

  const submit = form.handleSubmit((values) =>
    stepUp.mutate(values.code, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
        onConfirmed();
      },
    }),
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent title={t("settings:stepUpTitle")} description={t("settings:stepUpBody")}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {stepUp.isError ? <Alert tone="danger">{errorMessage(stepUp.error)}</Alert> : null}
          <Field label={t("auth:code")} error={error && t(`validation:${error.message}`)}>
            <Input inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} className="text-center text-lg tracking-[0.4em]" {...form.register("code")} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={stepUp.isPending}>
              {t("auth:verify")}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
