import { ArrowLeft, BadgePercent, CreditCard, History, LayoutDashboard, Layers, Menu, Settings2, ShieldAlert, Users, Building2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, NavLink, Outlet } from "react-router";
import { useAppSelector } from "@/app/store";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

const ITEMS = [
  { key: "overview", path: "", icon: LayoutDashboard },
  { key: "workspaces", path: "workspaces", icon: Building2 },
  { key: "users", path: "users", icon: Users },
  { key: "plans", path: "plans", icon: Layers },
  { key: "coupons", path: "coupons", icon: BadgePercent },
  { key: "payments", path: "payments", icon: CreditCard },
  { key: "settings", path: "settings", icon: Settings2 },
  { key: "activity", path: "activity", icon: History },
] as const;

const Nav = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { t } = useTranslation("admin");
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5 font-semibold">
        <img src={brand.logo} alt="" className={cn("size-8", brand.invertLogoInDark && "dark:invert")} />
        <span>
          {brand.name}
          <span className="block text-xs font-normal text-muted-foreground">{t("panel")}</span>
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label={t("panel")}>
        {ITEMS.map(({ key, path, icon: Icon }) => (
          <NavLink
            key={key}
            to={`/admin${path ? `/${path}` : ""}`}
            end={path === ""}
            onClick={onNavigate}
            className={({ isActive }) => cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-brand-soft text-brand" : "hover:bg-muted")}
          >
            <Icon className="size-4" />
            {t(`nav_${key}`)}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
          <ArrowLeft className="size-4" />
          {t("backToApp")}
        </Link>
      </div>
    </div>
  );
};

// The platform admin panel's frame. The server checks every request too; this only keeps others out
// of screens that would fail.
export const AdminLayout = () => {
  const { t } = useTranslation("admin");
  const user = useAppSelector((state) => state.auth.user);
  const [menuOpen, setMenuOpen] = useState(false);
  if (!user?.isPlatformAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r bg-surface lg:block">
        <Nav />
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
              <Nav onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="rounded-md border px-2 py-1 text-xs font-semibold tracking-wide uppercase">{t("badge")}</span>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <LanguageSwitch />
            <ThemeSwitch />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {user.mfaEnabled ? (
            <Outlet />
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title={t("mfaTitle")}
              body={t("mfaBody")}
              action={
                <Button asChild>
                  <Link to="/settings/security">{t("mfaAction")}</Link>
                </Button>
              }
            />
          )}
        </main>
      </div>
    </div>
  );
};
