import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { useInvitations, useRevokeInvitation } from "./api";

// Invitations sent but not yet accepted. Each link lasts 7 days.
export const InvitationsCard = ({ businessId, canChange }: { businessId: string; canChange: boolean }) => {
  const { t } = useTranslation(["team", "shell"]);
  const { locale, digitStyle } = useFormatting();
  const invitations = useInvitations(businessId);
  const revoke = useRevokeInvitation(businessId);
  const list = invitations.data ?? [];

  const cancel = (id: string, email: string) => revoke.mutate(id, { onSuccess: () => toast.success(t("team:inviteCancelled", { email })) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("team:pending")}</CardTitle>
        <CardDescription>{t("team:pendingHint")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        {invitations.isLoading ? <Spinner /> : null}
        {invitations.isError || revoke.isError ? <Alert tone="danger">{errorMessage(invitations.error ?? revoke.error)}</Alert> : null}
        {invitations.isSuccess && list.length === 0 ? <p className="py-2 text-sm text-muted-foreground">{t("team:noPending")}</p> : null}
        <ul className="divide-y">
          {list.map((invitation) => (
            <li key={invitation.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{invitation.email}</p>
                <p className="text-sm text-muted-foreground">{t("team:expires", { date: formatDateTime(invitation.expiresAt, locale, digitStyle) })}</p>
              </div>
              <Badge>{t(`shell:role${invitation.roleKey}`)}</Badge>
              {canChange ? (
                <Button variant="ghost" size="icon" onClick={() => cancel(invitation.id, invitation.email)} disabled={revoke.isPending} aria-label={t("team:cancelInvite", { email: invitation.email })}>
                  <X />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
