import { createBrowserRouter, Navigate } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { MfaPage } from "@/features/auth/MfaPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { CreateBusinessPage } from "@/features/businesses/CreateBusinessPage";
import { BusinessSettingsPage } from "@/features/businesses/settings/BusinessSettingsPage";
import { BusinessHomePage } from "@/features/home/BusinessHomePage";
import { ProfilePage } from "@/features/settings/ProfilePage";
import { SecurityPage } from "@/features/settings/SecurityPage";
import { SettingsLayout } from "@/features/settings/SettingsLayout";
import { AcceptInvitationPage } from "@/features/team/AcceptInvitationPage";
import { TeamPage } from "@/features/team/TeamPage";
import { GuestOnly, HomeRedirect, RequireAuth } from "./guards";

// Every address in the app. Business screens live under /b/:businessId, so a link opens the right one.
export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/login/mfa", element: <MfaPage /> },
          { path: "/register", element: <RegisterPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
        ],
      },
      // Opened from an email, whether or not someone is signed in here.
      { path: "/reset-password", element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: "/", element: <HomeRedirect /> },
      {
        element: <AuthLayout wide />,
        children: [
          { path: "/onboarding", element: <CreateBusinessPage /> },
          // Opened from an invitation email. Someone signed out signs in or registers first, then comes back.
          { path: "/invitations/accept", element: <AcceptInvitationPage /> },
        ],
      },
      {
        element: <AppShell />,
        children: [
          { path: "/b/:businessId", element: <BusinessHomePage /> },
          { path: "/b/:businessId/team", element: <TeamPage /> },
          { path: "/b/:businessId/settings", element: <BusinessSettingsPage /> },
          {
            path: "/settings",
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="profile" replace /> },
              { path: "profile", element: <ProfilePage /> },
              { path: "security", element: <SecurityPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
