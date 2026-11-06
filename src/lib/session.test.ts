import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = { accessToken: "new-token", expiresIn: 900, user: { id: "u1", email: "a@b.c", name: "A", status: "ACTIVE", mfaEnabled: false, locale: "en", digitStyle: "latin", lastLoginAt: null, createdAt: "" } };

describe("refreshing the session", () => {
  beforeEach(() => {
    vi.resetModules();
    document.cookie = "csrf_token=csrf-value";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("several callers at once share one refresh, so the backend never sees a reused token", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: session }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { refreshSession, getAccessToken } = await import("./session");

    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    expect(results).toEqual([true, true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("new-token");
  });

  it("sends the CSRF cookie's value as a header", async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify({ data: session }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { refreshSession } = await import("./session");
    await refreshSession();
    const init = fetchMock.mock.calls[0]![1];
    expect((init.headers as Record<string, string>)["X-CSRF-Token"]).toBe("csrf-value");
    expect(init.credentials).toBe("include");
  });

  it("a refused refresh signs out, and tells listeners", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { code: "REFRESH_INVALID" } }), { status: 401 })));
    const { refreshSession, onSessionChange, getAccessToken } = await import("./session");
    const seen: unknown[] = [];
    onSessionChange((user) => seen.push(user));
    expect(await refreshSession()).toBe(false);
    expect(getAccessToken()).toBeNull();
    expect(seen).toEqual([null]);
  });

  it("without the CSRF cookie there's no session to restore, so it doesn't call the API", async () => {
    document.cookie = "csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { refreshSession } = await import("./session");
    expect(await refreshSession()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
