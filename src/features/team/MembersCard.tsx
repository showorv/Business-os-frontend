import { EllipsisVertical, Trash2, UserCog } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAppSelector } from "@/app/store";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { needsStepUp, useStepUpRetry } from "@/features/auth/useStepUpRetry";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { initials } from "@/lib/text";
import { useMembers, useRemoveMember, type Member } from "./api";
import { MemberDialog } from "./MemberDialog";

interface MembersCardProps {
  businessId: string;
  // Can change roles and remove people (and the business is active).
  canManage: boolean;
  isOwner: boolean;
}

export const MembersCard = ({ businessId, canManage, isOwner }: MembersCardProps) => {
  const { t } = useTranslation(["team", "shell"]);
  const myId = useAppSelector((state) => state.auth.user?.id);
  const members = useMembers(businessId);
  const remove = useRemoveMember(businessId);
  const { run, stepUpModal } = useStepUpRetry();
  const [editing, setEditing] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);

  // Only an owner can change or remove an owner. Nobody removes themselves from here.
  const mayChange = (member: Member) => canManage && (isOwner || member.roleKey !== "OWNER");

  const confirmRemove = () => {
    if (!removing) return;
    const name = removing.name ?? removing.email;
    run(() =>
      remove.mutateAsync(removing.id).then(() => {
        setRemoving(null);
        toast.success(t("team:removed", { name }));
      }),
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("team:members")}</CardTitle>
        <CardDescription>{t("team:membersHint")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        {members.isLoading ? <Spinner /> : null}
        {members.isError ? <Alert tone="danger">{errorMessage(members.error)}</Alert> : null}
        <ul className="divide-y">
          {(members.data ?? []).map((member) => {
            const isMe = member.userId === myId;
            const finances = member.extraPermissions.includes(Permission.FINANCE_READ);
            return (
              // On a phone the badges sit under the name, so long names keep their room. Wider, they move right.
              <li key={member.id} className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-x-3 gap-y-1.5 py-3 sm:grid-cols-[2.25rem_1fr_auto_auto]">
                <span className="row-span-2 flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold sm:row-span-1" aria-hidden>
                  {initials(member.name ?? member.email ?? "?") || "?"}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{member.name ?? member.email}</span>
                    {isMe ? <Badge>{t("team:you")}</Badge> : null}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                </div>
                <div className="col-start-2 row-start-2 flex flex-wrap gap-1.5 sm:col-start-3 sm:row-start-1">
                  <Badge className="border text-foreground">{t(`shell:role${member.roleKey}`)}</Badge>
                  {finances ? <Badge>{t("team:financeReadShort")}</Badge> : null}
                </div>
                {mayChange(member) && !isMe ? (
                  <div className="col-start-3 row-span-2 row-start-1 sm:col-start-4 sm:row-span-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={t("team:actionsFor", { name: member.name ?? member.email })}>
                          <EllipsisVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem onSelect={() => setEditing(member)}>
                          <UserCog />
                          {t("team:changeRole")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setRemoving(member)} className="text-danger">
                          <Trash2 />
                          {t("team:remove")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : canManage ? (
                  // Keeps the badges lined up with the rows that have a menu.
                  <span className="hidden size-10 sm:block" aria-hidden />
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
      {editing ? <MemberDialog businessId={businessId} member={editing} canAssignOwner={isOwner} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoving(null);
            remove.reset();
          }
        }}
        title={t("team:removeTitle", { name: removing?.name ?? removing?.email })}
        description={t("team:removeBody")}
        confirmLabel={t("team:remove")}
        danger
        pending={remove.isPending}
        onConfirm={confirmRemove}
      >
        {remove.isError && !needsStepUp(remove.error) ? <Alert tone="danger">{errorMessage(remove.error)}</Alert> : null}
      </ConfirmDialog>
      {stepUpModal}
    </Card>
  );
};
