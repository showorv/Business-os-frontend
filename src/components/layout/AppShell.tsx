import { Menu } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { BusinessSwitcher } from "./BusinessSwitcher";
import { LanguageSwitch } from "./LanguageSwitch";
import { ThemeSwitch } from "./ThemeSwitch";
import { SidebarNav } from "./Sidebar";
import { UserMenu } from "./UserMenu";

// The frame for every signed-in screen: the menu on the left (a drawer on phones) and the top bar.
export const AppShell = () => {
  const { t } = useTranslation("shell");
  const [menuOpen, setMenuOpen] = useState(false);
  const { business, businesses, isLoading, notFound } = useCurrentBusiness();

  if (isLoading) return <Spinner className="mt-32" />;
  // Someone with no business yet sets one up first.
  if (businesses.length === 0) return <Navigate to="/onboarding" replace />;
  if (notFound) return <Navigate to="/" replace />;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r bg-surface lg:block">
        <SidebarNav businessId={business?.id} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-surface/95 px-4 backdrop-blur sm:px-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("openMenu")}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent title={t("openMenu")}>
              <SidebarNav businessId={business?.id} onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <BusinessSwitcher />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <LanguageSwitch />
            <ThemeSwitch />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {business && business.status !== "ACTIVE" ? (
            <Alert tone="warning" className="mb-6">
              {t(`readOnly${business.status}`)}
            </Alert>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
};
