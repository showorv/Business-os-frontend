import type { NewPushSubscription } from "./api";

// Browser push: a service worker (public/sw.js) receives messages even while the app is closed.

const SAVED_KEY = "business-os-push-subscription";

export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// The server's id for this browser's subscription, kept so this browser can turn itself off.
// Called with a value it stores it; with null it forgets it.
export const thisBrowserSubscription = (value?: string | null) => {
  try {
    if (value === undefined) return localStorage.getItem(SAVED_KEY);
    if (value === null) localStorage.removeItem(SAVED_KEY);
    else localStorage.setItem(SAVED_KEY, value);
  } catch {
    // Private windows may block storage. Push still works; this browser just can't tell it's on.
  }
  return value ?? null;
};

// The public key arrives as URL-safe base64; the browser wants the raw bytes.
const keyBytes = (base64: string) => {
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

// Asks permission, then subscribes. Returns null when the person says no.
export const subscribeThisBrowser = async (publicKey: string): Promise<NewPushSubscription | null> => {
  if ((await Notification.requestPermission()) !== "granted") return null;
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return null;
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
};

export const unsubscribeThisBrowser = async () => {
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  await subscription?.unsubscribe();
};

// "Chrome on macOS" from a user-agent string, for the list of devices.
export const browserName = (userAgent: string) => {
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : null;
  const system = /Android/.test(userAgent)
    ? "Android"
    : /iPhone|iPad/.test(userAgent)
      ? "iOS"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;
  if (browser && system) return `${browser} · ${system}`;
  return browser ?? system ?? "Browser";
};
