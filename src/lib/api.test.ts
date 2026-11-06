import { afterEach, describe, expect, it, vi } from "vitest";

const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("the API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("refreshes an expired token once and sends the request again", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: Request | string) => {
      const url = typeof input === "string" ? input : input.url;
      const auth = typeof input === "string" ? "" : (input.headers.get("Authorization") ?? "");
      calls.push(`${url.replace(/^https?:\/\/[^/]+/, "")} ${auth}`);
      if (url.endsWith("/auth/refresh")) return json(200, { data: { accessToken: "fresh", expiresIn: 900, user: { id: "u" } } });
      return auth === "Bearer fresh" ? json(200, { success: true, data: { name: "Me" } }) : json(401, { success: false, error: { code: "TOKEN_EXPIRED" } });
    }));
    document.cookie = "csrf_token=c";
    const { api, unwrap } = await import("./api");

    const me = await unwrap(api.GET("/api/v1/users/me"));
    expect(me).toEqual({ name: "Me" });
    expect(calls).toEqual(["/api/v1/users/me ", "/api/v1/auth/refresh ", "/api/v1/users/me Bearer fresh"]);
  });

  it("turns an error into a code to translate", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(422, { success: false, error: { code: "VALIDATION_FAILED", params: { field: "email" } } })));
    const { api, unwrap, ApiError } = await import("./api");
    const error = await unwrap(api.GET("/api/v1/users/me")).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: "VALIDATION_FAILED", params: { field: "email" } });
  });
});
