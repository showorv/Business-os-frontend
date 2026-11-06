import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useAppSelector } from "@/app/store";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogout } from "@/features/auth/api";
import { ApiError } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { rememberBusiness } from "@/lib/preferences";
import { useAcceptInvitation } from "./api";

// Opened from the invitation email. Joining takes a click, so a link preview can't accept by accident.
export const AcceptInvitationPage = () => {
  const { t } = useTranslation(["team", "common", "errors"]);
  const navigate = useNavigate();
  const token = useSearchParams()[0].get("token") ?? "";
  const user = useAppSelector((state) => state.auth.user);
  const accept = useAcceptInvitation();
  const logout = useLogout();
  const code = accept.error instanceof ApiError ? accept.error.code : null;

  const join = () =>
    accept.mutate(token, {
      onSuccess: ({ businessId }) => {
        if (user) rememberBusiness(user.id, businessId);
        toast.success(t("team:joined"));
        void navigate(`/b/${businessId}`, { replace: true });
      },
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("team:acceptTitle")}</CardTitle>
        <CardDescription>{t("team:acceptBody", { email: user?.email })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!token ? <Alert tone="danger">{t("errors:INVITATION_INVALID")}</Alert> : null}
        {accept.isError ? <Alert tone="danger">{errorMessage(accept.error)}</Alert> : null}
        {code === "INVITATION_EMAIL_MISMATCH" ? (
          <Button variant="outline" className="w-full" onClick={() => logout.mutate(false)}>
            {t("team:useOtherAccount")}
          </Button>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" asChild>
            <Link to="/">{t("common:cancel")}</Link>
          </Button>
          <Button onClick={join} disabled={!token || accept.isPending || code === "INVITATION_INVALID"}>
            {t("team:join")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
