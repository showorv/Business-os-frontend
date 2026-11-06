import createClient from "openapi-fetch";
import type { paths } from "@/api/schema";
import { endSession, getAccessToken, refreshSession } from "./session";

// Every API error comes back as a code, never a sentence. The screens translate the code.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly params: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = "ApiError";
  }
}

interface ErrorBody {
  error?: { code?: string; params?: Record<string, unknown> };
}

// Codes meaning this session can't be saved by refreshing.
const SESSION_GONE = new Set(["TOKEN_INVALID", "UNAUTHENTICATED"]);

const withToken = (request: Request) => {
  const token = getAccessToken();
  if (token) request.headers.set("Authorization", `Bearer ${token}`);
  return request;
};

// Adds the access token. If it has expired, refreshes once and sends the request again.
const authFetch = async (input: Request) => {
  const retry = input.clone();
  const response = await fetch(withToken(input));
  if (response.status !== 401 || input.url.includes("/api/v1/auth/")) return response;

  const { error } = (await response.clone().json().catch(() => ({}))) as ErrorBody;
  if (error?.code === "TOKEN_EXPIRED" && (await refreshSession())) return fetch(withToken(retry));
  if (error?.code && SESSION_GONE.has(error.code)) endSession();
  return response;
};

// The page's own address: requests go to /api here, never straight to another site.
export const api = createClient<paths>({ baseUrl: window.location.origin, fetch: authFetch, credentials: "include" });

// What every api.GET / api.POST / ... call gives back.
export type ApiCall<T> = Promise<{ data?: { data: T }; error?: unknown; response: Response }>;

// Turns openapi-fetch's { data, error } into the payload, or a thrown ApiError.
export const unwrap = async <T>(call: ApiCall<T>): Promise<T> => {
  const { data, error, response } = await call;
  if (error !== undefined || !data) {
    const body = (error ?? {}) as ErrorBody;
    throw new ApiError(response.status, body.error?.code ?? "NETWORK_ERROR", body.error?.params);
  }
  return data.data;
};
