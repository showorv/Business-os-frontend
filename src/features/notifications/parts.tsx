import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/dates";
import { useFormatting } from "@/lib/preferences";
import { useMarkRead, type Notification } from "./api";
import { useNotificationText } from "./words";

// One notification in the bell's list or the inbox. Opening it marks it read and goes where it points.
export const NotificationRow = ({ notification, onOpen, showBusiness }: { notification: Notification; onOpen?: () => void; showBusiness?: boolean }) => {
  const { t } = useTranslation("notifications");
  const describe = useNotificationText();
  const { locale, digitStyle } = useFormatting();
  const { businesses } = useCurrentBusiness();
  const navigate = useNavigate();
  const markRead = useMarkRead();
  const text = describe(notification);
  const unread = !notification.readAt;
  const Icon = text.icon;
  const business = showBusiness && businesses.length > 1 ? businesses.find((item) => item.id === notification.businessId) : undefined;

  const open = () => {
    if (unread) markRead.mutate(notification.id);
    onOpen?.();
    if (text.href) void navigate(text.href);
  };

  return (
    <button
      type="button"
      onClick={open}
      data-testid="notification"
      data-unread={unread || undefined}
      className={cn("group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none", unread && "bg-muted/30")}
    >
      <span className={cn("relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full", unread ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>
        <Icon className="size-4" />
        {text.urgent ? <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface bg-danger" aria-hidden /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm leading-snug", unread ? "font-semibold" : "font-medium text-muted-foreground")}>{text.title}</span>
        {text.body ? <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{text.body}</span> : null}
        <span className="mt-1 block text-xs text-muted-foreground">
          {formatRelative(notification.createdAt, locale, digitStyle)}
          {business ? ` · ${business.name}` : null}
        </span>
      </span>
      {unread ? (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-foreground" aria-label={t("unread")} />
      ) : null}
    </button>
  );
};
