import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { Permission } from "@/lib/permissions";
import { InvitationsCard } from "./InvitationsCard";
import { InviteDialog } from "./InviteDialog";
import { MembersCard } from "./MembersCard";

// Everyone can see who is in the business. Owners and admins can invite, change roles and remove.
export const TeamPage = () => {
  const { t } = useTranslation("team");
  const businessId = useParams().businessId!;
  const access = useAccess(businessId);
  const [inviting, setInviting] = useState(false);
  if (access.isLoading) return <Spinner className="mt-16" />;

  const managesMembers = access.can(Permission.MEMBERS_MANAGE);
  const canChange = managesMembers && access.writable;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canChange ? (
          <Button onClick={() => setInviting(true)}>
            <UserPlus />
            {t("invite")}
          </Button>
        ) : null}
      </div>
      {!managesMembers ? <Alert>{t("readOnlyRole")}</Alert> : null}
      <MembersCard businessId={businessId} canManage={canChange} isOwner={access.isOwner} />
      {managesMembers ? <InvitationsCard businessId={businessId} canChange={canChange} /> : null}
      {inviting ? <InviteDialog businessId={businessId} onClose={() => setInviting(false)} /> : null}
    </div>
  );
};
