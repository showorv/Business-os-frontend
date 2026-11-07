import type { paths } from "@/api/schema";
import { api } from "@/lib/api";
import type { Body, Data } from "@/lib/api-types";
import { queryKeys, useApiMutation, useApiPages, useApiQuery } from "@/lib/query";

type Get<P extends keyof paths> = paths[P] extends { get: { responses: { 200: infer R } } } ? Data<R> : never;

export type Notification = Get<"/api/v1/notifications">["items"][number];
export type Preferences = Get<"/api/v1/notifications/preferences">;
export type PreferenceChanges = Body<paths["/api/v1/notifications/preferences"]["patch"]>;
export type PushSubscription = Get<"/api/v1/notifications/push/subscriptions">[number];
export type NewPushSubscription = Body<paths["/api/v1/notifications/push/subscriptions"]["post"]>;

const reload = { invalidates: [queryKeys.notifications] };

export const useNotifications = (unreadOnly = false) =>
  useApiPages(queryKeys.notificationItem("list", unreadOnly ? "unread" : "all"), (cursor) =>
    api.GET("/api/v1/notifications", { params: { query: { cursor, limit: 30, ...(unreadOnly ? { unreadOnly: "true" } : {}) } } }),
  );

export const useUnreadCount = () => useApiQuery(queryKeys.notificationItem("unread"), () => api.GET("/api/v1/notifications/unread-count"));

export const useMarkRead = () =>
  useApiMutation((notificationId: string) => api.POST("/api/v1/notifications/{notificationId}/read", { params: { path: { notificationId } } }), reload);

export const useMarkAllRead = () => useApiMutation(() => api.POST("/api/v1/notifications/read-all"), reload);

export const usePreferences = () => useApiQuery(queryKeys.notificationItem("preferences"), () => api.GET("/api/v1/notifications/preferences"));

export const useUpdatePreferences = () => useApiMutation((body: PreferenceChanges) => api.PATCH("/api/v1/notifications/preferences", { body }), reload);

export const usePushConfig = () => useApiQuery(queryKeys.notificationItem("push-config"), () => api.GET("/api/v1/notifications/push/config"), { staleTime: Infinity });

export const usePushSubscriptions = () => useApiQuery(queryKeys.notificationItem("push-subscriptions"), () => api.GET("/api/v1/notifications/push/subscriptions"));

export const useSavePushSubscription = () => useApiMutation((body: NewPushSubscription) => api.POST("/api/v1/notifications/push/subscriptions", { body }), reload);

export const useRemovePushSubscription = () =>
  useApiMutation((subscriptionId: string) => api.DELETE("/api/v1/notifications/push/subscriptions/{subscriptionId}", { params: { path: { subscriptionId } } }), reload);
