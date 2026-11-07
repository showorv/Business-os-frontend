import { Bell, BellOff, CheckCheck, Settings2 } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { useFormatting } from "@/lib/preferences";
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount, type Notification } from "./api";
import { NotificationRow } from "./parts";
import { useNotificationStream } from "./useNotificationStream";
import { useNotificationText } from "./words";

const SHOWN = 8;

// The bell in the top bar: how many are unread, the latest few, and a live toast when one arrives.
export const NotificationBell = () => {
  const { t } = useTranslation(["notifications", "shell"]);
  const { locale } = useFormatting();
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();
  const list = useNotifications();
  const markAll = useMarkAllRead();
  const markRead = useMarkRead();
  const describe = useNotificationText();
  const navigate = useNavigate();
  const count = unread.data?.count ?? 0;

  useNotificationStream((notification: Notification) => {
    const text = describe(notification);
    toast(text.title, {
      description: text.body || undefined,
      action: text.href
        ? {
            label: t("notifications:open"),
            onClick: () => {
              markRead.mutate(notification.id);
              void navigate(text.href!);
            },
          }
        : undefined,
    });
  });

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("shell:openNotifications", { count })}>
          <Bell />
          {count > 0 ? (
            <span className="animate-chart-fade absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] leading-none font-semibold text-background tabular-nums" data-testid="unread-badge">
              {count > 9 ? "9+" : count.toLocaleString(locale)}
            </span>
          ) : null}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className="animate-chart-fade z-50 flex max-h-[min(36rem,calc(100dvh-5rem))] w-[24rem] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-xl border bg-surface shadow-xl outline-none"
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="font-semibold">
              {t("notifications:title")}
              {count > 0 ? <span className="ml-1.5 text-sm font-normal text-muted-foreground">{t("notifications:unreadCount", { count })}</span> : null}
            </h2>
            <div className="flex items-center gap-1">
              {count > 0 ? (
                <Button variant="ghost" size="icon" aria-label={t("notifications:markAllRead")} title={t("notifications:markAllRead")} onClick={() => markAll.mutate()} disabled={markAll.isPending}>
                  <CheckCheck />
                </Button>
              ) : null}
              <Button variant="ghost" size="icon" asChild>
                <Link to="/settings/notifications" aria-label={t("notifications:settings")} title={t("notifications:settings")} onClick={() => setOpen(false)}>
                  <Settings2 />
                </Link>
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.isLoading ? <Spinner className="my-10" /> : null}
            {list.isSuccess && list.data.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <BellOff className="size-5 text-muted-foreground" />
                </span>
                <p className="font-medium">{t("notifications:empty")}</p>
                <p className="text-sm text-muted-foreground">{t("notifications:emptyHint")}</p>
              </div>
            ) : null}
            <div className="divide-y">
              {(list.data ?? []).slice(0, SHOWN).map((notification) => (
                <NotificationRow key={notification.id} notification={notification} onOpen={() => setOpen(false)} showBusiness />
              ))}
            </div>
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className={cn("block border-t px-4 py-3 text-center text-sm font-medium hover:bg-muted", !list.data?.length && "hidden")}
          >
            {t("notifications:seeAll")}
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
