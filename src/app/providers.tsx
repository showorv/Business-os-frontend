import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { Provider } from "react-redux";
import { Toaster } from "sonner";
import { setLanguage } from "@/i18n";
import { onSessionChange, refreshSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";
import { queryClient } from "./queryClient";
import { signedIn, signedOut, store } from "./store";

// Keeps Redux in step with the session module, which other tabs and expired tokens can also change.
const SessionBridge = () => {
  useEffect(() => {
    const stop = onSessionChange((user) => {
      if (user) {
        store.dispatch(signedIn(user));
        void setLanguage(user.locale);
      } else {
        store.dispatch(signedOut());
        queryClient.clear();
      }
    });
    // After a page reload the access token is gone, but the refresh cookie may still be good.
    void refreshSession().then((ok) => {
      if (!ok) store.dispatch(signedOut());
    });
    return () => void stop();
  }, []);
  return null;
};

// Pop-up messages, in black and white, following light or dark mode.
const Toasts = () => {
  const { dark } = useTheme();
  return <Toaster position="top-center" closeButton theme={dark ? "dark" : "light"} />;
};

export const Providers = ({ children }: { children: ReactNode }) => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <SessionBridge />
      {children}
      <Toasts />
    </QueryClientProvider>
  </Provider>
);
