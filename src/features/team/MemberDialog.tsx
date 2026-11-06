import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { needsStepUp, useStepUpRetry } from "@/features/auth/useStepUpRetry";
import { errorMessage } from "@/lib/errors";
import { Permission, ROLE_KEYS, type RoleKey } from "@/lib/permissions";
import { useUpdateMember, type Member } from "./api";

// Managers and viewers can also be allowed to see the money. No other role takes extra permissions.
const CAN_SEE_FINANCES: RoleKey[] = ["MANAGER", "VIEWER"];

interface MemberDialogProps {
  businessId: string;
  member: Member;
  // Only an owner can make someone an owner.
  canAssignOwner: boolean;
  onClose: () => void;
}

export const MemberDialog = ({ businessId, member, canAssignOwner, onClose }: MemberDialogProps) => {
  const { t } = useTranslation(["team", "shell", "common"]);
  const update = useUpdateMember(businessId);
  const { run, stepUpModal } = useStepUpRetry();
  const [roleKey, setRoleKey] = useState<RoleKey>(member.roleKey);
  const [finances, setFinances] = useState(member.extraPermissions.includes(Permission.FINANCE_READ));
  const roles = ROLE_KEYS.filter((role) => canAssignOwner || role !== "OWNER" || member.roleKey === "OWNER");
  const offersFinances = CAN_SEE_FINANCES.includes(roleKey);

  const save = () =>
    run(() =>
      update
        .mutateAsync({ memberId: member.id, roleKey, extraPermissions: offersFinances && finances ? [Permission.FINANCE_READ] : [] })
        .then(onClose),
    );

  return (
    <>
      <Modal open onOpenChange={(open) => !open && onClose()}>
        <ModalContent title={t("team:changeRoleTitle", { name: member.name ?? member.email })} description={t("team:changeRoleHint")}>
          <div className="space-y-4">
            {update.isError && !needsStepUp(update.error) ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}
            <Field label={t("team:role")} hint={t(`team:roleHint${roleKey}`)}>
              <Select value={roleKey} onChange={(event) => setRoleKey(event.target.value as RoleKey)}>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {t(`shell:role${role}`)}
                  </option>
                ))}
              </Select>
            </Field>
            {offersFinances ? (
              <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
                <input type="checkbox" className="mt-0.5 size-4 accent-brand" checked={finances} onChange={(event) => setFinances(event.target.checked)} />
                <span>
                  <span className="block font-medium">{t("team:financeRead")}</span>
                  <span className="block text-muted-foreground">{t("team:financeReadHint")}</span>
                </span>
              </label>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose}>
                {t("common:cancel")}
              </Button>
              <Button onClick={save} disabled={update.isPending}>
                {t("common:save")}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
      {stepUpModal}
    </>
  );
};
