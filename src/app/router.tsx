import { createBrowserRouter, Navigate } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { MfaPage } from "@/features/auth/MfaPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { BudgetDetailPage, BudgetsPage } from "@/features/budgets/BudgetsPage";
import { AllBusinessesPage } from "@/features/consolidated/AllBusinessesPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { JournalDetailPage } from "@/features/ledger/JournalDetailPage";
import { LedgerPage } from "@/features/ledger/LedgerPage";
import { NewJournalPage } from "@/features/ledger/NewJournalPage";
import { ReconciliationPage } from "@/features/ledger/ReconciliationPage";
import { ImportPage } from "@/features/statements/ImportPage";
import { StatementsPage } from "@/features/statements/StatementsPage";
import { GoalsPage } from "@/features/goals/GoalsPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { CreateBusinessPage } from "@/features/businesses/CreateBusinessPage";
import { BusinessSettingsPage } from "@/features/businesses/settings/BusinessSettingsPage";
import { AccountsPage } from "@/features/finance/accounts/AccountsPage";
import { ContactDetailPage } from "@/features/contacts/ContactDetailPage";
import { ContactsPage } from "@/features/contacts/ContactsPage";
import { TransactionDetailPage } from "@/features/finance/transactions/TransactionDetailPage";
import { EditTransactionPage, NewTransactionPage } from "@/features/finance/transactions/TransactionFormPages";
import { TransactionsPage } from "@/features/finance/transactions/TransactionsPage";
import { ProfilePage } from "@/features/settings/ProfilePage";
import { SecurityPage } from "@/features/settings/SecurityPage";
import { SettingsLayout } from "@/features/settings/SettingsLayout";
import { AcceptInvitationPage } from "@/features/team/AcceptInvitationPage";
import { TeamPage } from "@/features/team/TeamPage";
import { NotificationSettingsPage } from "@/features/notifications/NotificationSettingsPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { RecurringPage } from "@/features/recurring/RecurringPage";
import { TasksPage } from "@/features/tasks/TasksPage";
import { PlanPage } from "@/features/billing/PlanPage";
import { DocumentsPage } from "@/features/documents/DocumentsPage";
import { AssistantPage } from "@/features/assistant/AssistantPage";
import { DemoPayPage } from "@/features/billing/DemoPayPage";
import { ReceiptPage } from "@/features/billing/ReceiptPage";
import { AuditPage, MyActivityPage } from "@/features/audit/AuditPage";
import { AdminLayout } from "@/features/admin/AdminLayout";
import { ActivityPage } from "@/features/admin/ActivityPage";
import { CouponsPage } from "@/features/admin/CouponsPage";
import { OverviewPage } from "@/features/admin/OverviewPage";
import { PaymentsPage } from "@/features/admin/PaymentsPage";
import { PlansPage } from "@/features/admin/PlansPage";
import { SettingsPage as AdminSettingsPage } from "@/features/admin/SettingsPage";
import { UsersPage } from "@/features/admin/UsersPage";
import { WorkspaceDetailPage } from "@/features/admin/WorkspaceDetailPage";
import { WorkspacesPage } from "@/features/admin/WorkspacesPage";
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
          // The stand-in payment page until a real gateway is connected, and a printable receipt.
          { path: "/pay/demo/:paymentId", element: <DemoPayPage /> },
          { path: "/settings/plan/receipts/:paymentId", element: <ReceiptPage /> },
        ],
      },
      // The platform admin panel: plans, accounts, payments and settings for the whole product.
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <OverviewPage /> },
          { path: "workspaces", element: <WorkspacesPage /> },
          { path: "workspaces/:workspaceId", element: <WorkspaceDetailPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "plans", element: <PlansPage /> },
          { path: "coupons", element: <CouponsPage /> },
          { path: "payments", element: <PaymentsPage /> },
          { path: "settings", element: <AdminSettingsPage /> },
          { path: "activity", element: <ActivityPage /> },
        ],
      },
      {
        element: <AppShell />,
        children: [
          { path: "/b/:businessId", element: <DashboardPage /> },
          { path: "/b/:businessId/reports", element: <ReportsPage /> },
          { path: "/b/:businessId/budgets", element: <BudgetsPage /> },
          { path: "/b/:businessId/budgets/:budgetId", element: <BudgetDetailPage /> },
          { path: "/b/:businessId/goals", element: <GoalsPage /> },
          { path: "/all", element: <AllBusinessesPage /> },
          { path: "/b/:businessId/ledger", element: <LedgerPage /> },
          { path: "/b/:businessId/ledger/journals/new", element: <NewJournalPage /> },
          { path: "/b/:businessId/ledger/journals/:journalId", element: <JournalDetailPage /> },
          { path: "/b/:businessId/ledger/reconcile/:reconciliationId", element: <ReconciliationPage /> },
          { path: "/b/:businessId/statements", element: <StatementsPage /> },
          { path: "/b/:businessId/statements/import", element: <ImportPage /> },
          { path: "/b/:businessId/recurring", element: <RecurringPage /> },
          { path: "/b/:businessId/tasks", element: <TasksPage /> },
          { path: "/b/:businessId/documents", element: <DocumentsPage /> },
          { path: "/b/:businessId/assistant", element: <AssistantPage /> },
          { path: "/b/:businessId/audit", element: <AuditPage /> },
          { path: "/notifications", element: <NotificationsPage /> },
          { path: "/b/:businessId/accounts", element: <AccountsPage /> },
          { path: "/b/:businessId/contacts", element: <ContactsPage /> },
          { path: "/b/:businessId/contacts/:contactId", element: <ContactDetailPage /> },
          { path: "/b/:businessId/transactions", element: <TransactionsPage /> },
          { path: "/b/:businessId/transactions/new", element: <NewTransactionPage /> },
          { path: "/b/:businessId/transactions/:transactionId", element: <TransactionDetailPage /> },
          { path: "/b/:businessId/transactions/:transactionId/edit", element: <EditTransactionPage /> },
          { path: "/b/:businessId/team", element: <TeamPage /> },
          { path: "/b/:businessId/settings", element: <BusinessSettingsPage /> },
          {
            path: "/settings",
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="profile" replace /> },
              { path: "profile", element: <ProfilePage /> },
              { path: "security", element: <SecurityPage /> },
              { path: "notifications", element: <NotificationSettingsPage /> },
              { path: "plan", element: <PlanPage /> },
              { path: "activity", element: <MyActivityPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
