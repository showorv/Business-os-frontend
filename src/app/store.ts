import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { SessionUser } from "@/lib/session";

// Redux holds only what the browser itself decides: who is signed in and how the layout looks.
// Everything from the server (businesses, figures) lives in TanStack Query instead.
interface AuthState {
  status: "loading" | "signedIn" | "signedOut";
  user: SessionUser | null;
  // Why the person was signed out, to say so on the sign-in page.
  notice: "sessionEnded" | "passwordChanged" | "resetDone" | null;
}

const authSlice = createSlice({
  name: "auth",
  initialState: { status: "loading", user: null, notice: null } as AuthState,
  reducers: {
    signedIn: (state, action: PayloadAction<SessionUser>) => {
      state.status = "signedIn";
      state.user = action.payload;
      state.notice = null;
    },
    // With a reason, it's said on the sign-in page. Without one, a session that was open "ended"
    // (another tab signed out, or the server refused the token).
    signedOut: (state, action: PayloadAction<AuthState["notice"] | undefined>) => {
      const wasSignedIn = state.status === "signedIn";
      state.status = "signedOut";
      state.user = null;
      if (action.payload !== undefined) state.notice = action.payload;
      else if (wasSignedIn) state.notice = "sessionEnded";
    },
    userUpdated: (state, action: PayloadAction<Partial<SessionUser>>) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    noticeShown: (state) => {
      state.notice = null;
    },
  },
});

export const { signedIn, signedOut, userUpdated, noticeShown } = authSlice.actions;

export const store = configureStore({ reducer: { auth: authSlice.reducer } });

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
