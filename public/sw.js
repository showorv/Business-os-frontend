// Shows push notifications from Business OS while the app is closed, and opens the right page on a click.
// The server sends { notificationId, title, body, url }.
/* global self, URL */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let message;
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { title: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(message.title || "Business OS", {
      body: message.body || "",
      tag: message.notificationId,
      icon: "/logo.svg",
      badge: "/logo.svg",
      data: { url: message.url || "/notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only pages on this site are opened, whatever the message says.
  const target = new URL(event.notification.data?.url || "/notifications", self.location.origin);
  const url = target.origin === self.location.origin ? target.href : new URL("/notifications", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin));
      if (open) return open.focus().then(() => open.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
