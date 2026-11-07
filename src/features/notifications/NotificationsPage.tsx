import { BellOff, CheckCheck, Settings2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { useMarkAllRead, useNotifications, useUnreadCount, type Notification } from "./api";
import { NotificationRow } from "./parts";

type Show = "all" | "unread";

// Groups by day in the reader's own time: Today, Yesterday, then dates.
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA").format(new Date(iso));

// Every notification, newest first, with a filter for the unread ones.
export const NotificationsPage = () => {
  const { t } = useTranslation(["notifications", "common"]);
  const { locale, digitStyle } = useFormatting();
  const [params, setParams] = useSearchParams();
  const show: Show = params.get("show") === "unread" ? "unread" : "all";
  const list = useNotifications(show === "unread");
  const unread = useUnreadCount();
  const markAll = useMarkAllRead();
  const count = unread.data?.count ?? 0;

  const [now] = useState(() => Date.now());
  const today = dayKey(new Date(now).toISOString());
  const yesterday = dayKey(new Date(now - 86_400_000).toISOString());
  const groups = new Map<string, Notification[]>();
  for (const item of list.data ?? []) groups.set(dayKey(item.createdAt), [...(groups.get(dayKey(item.createdAt)) ?? []), item]);
  const label = (day: string) =>
    day === today
      ? t("notifications:today")
      : day === yesterday
        ? t("notifications:yesterday")
        : new Intl.DateTimeFormat(`${locale === "bn-BD" ? "bn-BD" : "en-GB"}-u-nu-${digitStyle === "bangla" ? "beng" : "latn"}`, { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00`));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("notifications:title")}</h1>
          <p className="mt-1 text-muted-foreground">{count > 0 ? t("notifications:unreadSummary", { count }) : t("notifications:allCaughtUp")}</p>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 ? (
            <Button
              variant="outline"
              onClick={() => markAll.mutate(undefined, { onSuccess: () => toast.success(t("notifications:allMarked")), onError: (error) => toast.error(errorMessage(error)) })}
              disabled={markAll.isPending}
            >
              <CheckCheck />
              {t("notifications:markAllRead")}
            </Button>
          ) : null}
          <Button variant="ghost" size="icon" asChild>
            <Link to="/settings/notifications" aria-label={t("notifications:settings")} title={t("notifications:settings")}>
              <Settings2 />
            </Link>
          </Button>
        </div>
      </header>

      <Segmented
        label={t("notifications:show")}
        value={show}
        onChange={(next) => setParams(next === "all" ? {} : { show: next })}
        options={[
          { value: "all", label: t("notifications:show_all") },
          { value: "unread", label: t("notifications:show_unread") },
        ]}
      />

      {list.isError ? <Alert tone="danger">{errorMessage(list.error)}</Alert> : null}
      {list.isLoading ? <Spinner className="mt-12" /> : null}
      {list.isSuccess && list.data.length === 0 ? (
        <Card>
          <EmptyState icon={BellOff} title={show === "unread" ? t("notifications:noUnread") : t("notifications:empty")} body={t("notifications:emptyHint")} />
        </Card>
      ) : null}

      {[...groups].map(([day, items]) => (
        <section key={day} aria-label={label(day)}>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label(day)}</h2>
          <Card className="divide-y overflow-hidden">
            {items.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} showBusiness />
            ))}
          </Card>
        </section>
      ))}

      {list.hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            {t("common:loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
