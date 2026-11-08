import { useNavigate } from "react-router";
import { forgetPrivateData } from "@/app/queryClient";
import { signedOut, userUpdated, useAppDispatch, type AppDispatch } from "@/app/store";
import { setLanguage } from "@/i18n";
import { api, unwrap } from "@/lib/api";
import { queryKeys, useAction, useApiMutation, useApiQuery } from "@/lib/query";
import { endSession, readCsrfToken, replaceAccessToken, startSession, type IssuedSession, type SessionUser } from "@/lib/session";

// The server always sends mfaRequired: false with the tokens, or true with a challenge instead.
type LoginResult = (IssuedSession & { mfaRequired: false }) | { mfaRequired: true; challengeToken: string };
type Locale = "en" | "bn-BD";

// The account's language is applied by SessionBridge, for this and every later session.
const begin = (data: unknown) => {
  const session = data as IssuedSession;
  startSession(session);
  return session;
};

// Forgets this tab's session and everything it had loaded. The reason picks the sign-in page notice.
const finish = (dispatch: AppDispatch, reason: "passwordChanged" | null) => {
  dispatch(signedOut(reason));
  endSession();
  forgetPrivateData();
};

// ---- Signing in and out ----

export const useLogin = () =>
  useAction(async (body: { email: string; password: string }) => {
    const data = (await unwrap(api.POST("/api/v1/auth/login", { body }))) as unknown as LoginResult;
    return data.mfaRequired ? data : begin(data);
  });

export const useVerifyMfa = () =>
  useAction(async (body: { challengeToken: string; code: string }) => begin(await unwrap(api.POST("/api/v1/auth/mfa/verify", { body }))));

export const useRegister = () =>
  useAction(async (body: { name: string; email: string; password: string; locale: Locale }) =>
    begin(await unwrap(api.POST("/api/v1/auth/register", { body }))),
  );

export const useForgotPassword = () => useApiMutation((body: { email: string }) => api.POST("/api/v1/auth/password/forgot", { body }));

export const useResetPassword = () => useApiMutation((body: { token: string; password: string }) => api.POST("/api/v1/auth/password/reset", { body }));

// Signs out here and on the server. Signs out locally even if the server can't be reached.
export const useLogout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  return useAction(
    async (everywhere: boolean) => {
      if (everywhere) await unwrap(api.POST("/api/v1/auth/logout-all"));
      const csrf = decodeURIComponent(readCsrfToken() ?? "");
      await api.POST("/api/v1/auth/logout", { params: { header: { "x-csrf-token": csrf } } }).catch(() => undefined);
    },
    {
      onSettled: () => {
        finish(dispatch, null);
        void navigate("/login", { replace: true });
      },
    },
  );
};

// ---- Devices ----

export const useSessions = () => useApiQuery(queryKeys.sessions, () => api.GET("/api/v1/auth/sessions"));

export const useRevokeSession = () =>
  useApiMutation((sessionId: string) => api.DELETE("/api/v1/auth/sessions/{sessionId}", { params: { path: { sessionId } } }), {
    invalidates: [queryKeys.sessions],
  });

// ---- Profile and password ----

export const useUpdateMe = () => {
  const dispatch = useAppDispatch();
  return useApiMutation((body: { name?: string; locale?: Locale; digitStyle?: "latin" | "bangla" }) => api.PATCH("/api/v1/users/me", { body }), {
    onSuccess: (user) => {
      dispatch(userUpdated(user as unknown as Partial<SessionUser>));
      void setLanguage(user.locale);
    },
  });
};

export const useChangePassword = () => {
  const dispatch = useAppDispatch();
  return useApiMutation((body: { currentPassword: string; newPassword: string }) => api.POST("/api/v1/auth/change-password", { body }), {
    // The server signed out every session, this one included.
    onSuccess: () => finish(dispatch, "passwordChanged"),
  });
};

// ---- Two-step verification ----

// Proves a fresh code for the next 10 minutes, which sensitive actions such as changing the password need.
export const useStepUp = () =>
  useAction(async (code: string) => replaceAccessToken(await unwrap(api.POST("/api/v1/auth/mfa/step-up", { body: { code } }))));

export const useStartMfa = () => useApiMutation((password: string) => api.POST("/api/v1/auth/mfa/setup", { body: { password } }));

export const useConfirmMfa = () => {
  const dispatch = useAppDispatch();
  return useApiMutation((code: string) => api.POST("/api/v1/auth/mfa/confirm", { body: { code } }), {
    onSuccess: () => dispatch(userUpdated({ mfaEnabled: true })),
  });
};

export const useDisableMfa = () => {
  const dispatch = useAppDispatch();
  return useApiMutation((body: { password: string; code: string }) => api.POST("/api/v1/auth/mfa/disable", { body }), {
    onSuccess: () => dispatch(userUpdated({ mfaEnabled: false })),
  });
};
