import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";

// Shown on sign-in and register when someone arrived from an invitation link.
export const InvitationNotice = ({ from }: { from?: string }) => {
  const { t } = useTranslation("team");
  if (!from?.startsWith("/invitations/accept")) return null;
  return <Alert>{t("signInToAccept")}</Alert>;
};
