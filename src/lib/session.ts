// How the app stays signed in, following the backend's rules:
// - The access token lives only in this module's memory, never in localStorage, so a script injected
//   into the page can't read it from storage. It lasts 15 minutes.
// - The refresh token is an httpOnly cookie the browser sends to /api/v1/auth only. JavaScript never
//   sees it. Refreshing echoes the readable csrf_token cookie in a header, which the backend checks.
// - Each refresh replaces the refresh token. If two tabs refreshed with the same one at once, the
//   backend would treat the second as stolen and sign everyone out. So tabs take turns through a
//   browser lock, and share the new token with each other.

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  status: string;
  mfaEnabled: boolean;
  // Opens the platform admin panel (which also needs two-step verification on).
  isPlatformAdmin?: boolean;
  locale: string;
  digitStyle: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface IssuedSession {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}

type Listener = (user: SessionUser | null) => void;

const REFRESH_URL = "/api/v1/auth/refresh";
const LOCK_NAME = "business-os-auth-refresh";
// Refresh a minute before expiry, so a request rarely meets an expired token.
const REFRESH_EARLY_MS = 60_000;

let accessToken: string | null = null;
let currentUser: SessionUser | null = null;
let expiresAt = 0;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let inFlight: Promise<boolean> | null = null;
const listeners = new Set<Listener>();
const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("business-os-auth");

type Message = { type: "session"; session: IssuedSession; issuedAt: number } | { type: "signed-out" };

const notify = (user: SessionUser | null) => listeners.forEach((listener) => listener(user));

const store = (session: IssuedSession) => {
  accessToken = session.accessToken;
  currentUser = session.user;
  expiresAt = Date.now() + session.expiresIn * 1000;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => void refreshSession(), Math.max(5_000, session.expiresIn * 1000 - REFRESH_EARLY_MS));
  notify(session.user);
};

const clear = () => {
  accessToken = null;
  currentUser = null;
  expiresAt = 0;
  clearTimeout(refreshTimer);
  notify(null);
};

channel?.addEventListener("message", (event: MessageEvent<Message>) => {
  if (event.data.type === "session") store(event.data.session);
  else clear();
});

export const getAccessToken = () => accessToken;

export const onSessionChange = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// After signing in or registering.
export const startSession = (session: IssuedSession) => {
  store(session);
  channel?.postMessage({ type: "session", session, issuedAt: Date.now() } satisfies Message);
};

// The MFA step-up returns only a new access token, for the same person.
export const replaceAccessToken = (token: { accessToken: string; expiresIn: number }) => {
  if (currentUser) startSession({ ...token, user: currentUser });
};

export const endSession = () => {
  clear();
  channel?.postMessage({ type: "signed-out" } satisfies Message);
};

export const readCsrfToken = () =>
  document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("csrf_token="))
    ?.slice("csrf_token=".length);

const callRefresh = async (startedAt: number) => {
  // Another tab may have refreshed while this one waited for the lock.
  if (accessToken && expiresAt - Date.now() > REFRESH_EARLY_MS && expiresAt > startedAt) return true;

  const csrf = readCsrfToken();
  if (!csrf) {
    clear();
    return false;
  }
  const response = await fetch(REFRESH_URL, { method: "POST", credentials: "include", headers: { "X-CSRF-Token": decodeURIComponent(csrf) } });
  if (!response.ok) {
    endSession();
    return false;
  }
  const { data } = (await response.json()) as { data: IssuedSession };
  startSession(data);
  return true;
};

// Gets a new access token. Calls at the same moment share one refresh.
export const refreshSession = () => {
  if (inFlight) return inFlight;
  const startedAt = Date.now();
  const run = () => callRefresh(startedAt).catch(() => false);

  inFlight = (typeof navigator !== "undefined" && navigator.locks ? navigator.locks.request(LOCK_NAME, run) : run()).finally(() => {
    inFlight = null;
  });
  return inFlight;
};
