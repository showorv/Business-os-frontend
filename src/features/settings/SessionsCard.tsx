import { Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useLogout, useRevokeSession, useSessions } from "@/features/auth/api";
import { formatRelative } from "@/lib/dates";
import { describeDevice } from "@/lib/device";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";

export const SessionsCard = () => {
  const { t } = useTranslation(["settings", "common"]);
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const logout = useLogout();
  const { locale, digitStyle } = useFormatting();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{t("settings:sessions")}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => logout.mutate(true)} disabled={logout.isPending}>
          {t("settings:signOutEverywhere")}
        </Button>
      </CardHeader>
      <CardContent>
        {sessions.isLoading ? <Spinner /> : null}
        {sessions.isError ? <Alert tone="danger">{errorMessage(sessions.error)}</Alert> : null}
        {revoke.isError ? <Alert tone="danger">{errorMessage(revoke.error)}</Alert> : null}
        <ul className="divide-y">
          {sessions.data?.map((session) => (
            <li key={session.id} className="flex items-center gap-3 py-3">
              <Monitor className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {describeDevice(session.userAgent) ?? t("settings:unknownDevice")}
                  {session.current ? <Badge className="bg-brand-soft text-brand">{t("settings:thisDevice")}</Badge> : null}
                </p>
                <p className="truncate text-muted-foreground">
                  {[session.ip, t("settings:lastActive", { time: formatRelative(session.lastSeenAt ?? session.createdAt, locale, digitStyle) })].filter(Boolean).join(" · ")}
                </p>
              </div>
              {session.current ? null : (
                <Button variant="ghost" size="sm" onClick={() => revoke.mutate(session.id)} disabled={revoke.isPending}>
                  {t("settings:signOutDevice")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
