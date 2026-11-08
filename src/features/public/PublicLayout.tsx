import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet } from "react-router";
import { useAppSelector } from "@/app/store";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

// The frame around the pages anyone can open: home, pricing, terms and privacy.
export const PublicLayout = () => {
  const { t } = useTranslation("public");
  const signedIn = useAppSelector((state) => state.auth.status === "signedIn");
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="mr-auto flex items-center gap-2 font-semibold">
            <img src={brand.logo} alt="" className={cn("size-8", brand.invertLogoInDark && "dark:invert")} />
            <span className="hidden sm:inline">{brand.name}</span>
          </Link>
          <NavLink to="/pricing" className={({ isActive }) => cn("hidden text-sm text-muted-foreground hover:text-foreground sm:inline", isActive && "font-medium text-foreground")}>
            {t("nav_pricing")}
          </NavLink>
          <LanguageSwitch />
          <ThemeSwitch />
          {signedIn ? (
            <Button asChild size="sm">
              <Link to="/app">{t("nav_openApp")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link to="/login">{t("nav_signIn")}</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/register">{t("nav_startFree")}</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-medium text-foreground">{brand.name}</p>
            <p>{t("footer_line")}</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label={brand.name}>
            <Link to="/pricing" className="hover:text-foreground">
              {t("footer_pricing")}
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              {t("footer_terms")}
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              {t("footer_privacy")}
            </Link>
            <span>{t("footer_rights", { year, name: brand.name })}</span>
          </nav>
        </div>
      </footer>
    </div>
  );
};
