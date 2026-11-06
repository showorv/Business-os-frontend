import { Navigate, Outlet, useLocation } from "react-router";
import { Spinner } from "@/components/ui/spinner";
import { useBusinesses } from "@/features/businesses/api";
import { lastBusiness } from "@/lib/preferences";
import { useAppSelector } from "./store";

const FullPageSpinner = () => (
  <div className="flex min-h-dvh items-center justify-center">
    <Spinner />
  </div>
);

// Signed-in screens. Anyone else goes to sign in, and comes back here afterwards.
export const RequireAuth = () => {
  const status = useAppSelector((state) => state.auth.status);
  const location = useLocation();
  if (status === "loading") return <FullPageSpinner />;
  if (status === "signedOut") return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
};

// Sign-in and register. Someone already signed in goes on to where they were heading.
export const GuestOnly = () => {
  const status = useAppSelector((state) => state.auth.status);
  const from = (useLocation().state as { from?: string } | null)?.from;
  if (status === "loading") return <FullPageSpinner />;
  if (status === "signedIn") return <Navigate to={from ?? "/"} replace />;
  return <Outlet />;
};

// "/" opens the business used last, or the first one, or the set-up for a first business.
export const HomeRedirect = () => {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const businesses = useBusinesses();
  if (businesses.isLoading) return <FullPageSpinner />;
  const list = businesses.data ?? [];
  const remembered = userId ? lastBusiness(userId) : null;
  const target = list.find((business) => business.id === remembered) ?? list[0];
  return <Navigate to={target ? `/b/${target.id}` : "/onboarding"} replace />;
};
