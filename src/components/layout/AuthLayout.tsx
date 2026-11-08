import { Link, Outlet } from "react-router";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import { Announcement } from "./Announcement";
import { LanguageSwitch } from "./LanguageSwitch";
import { ThemeSwitch } from "./ThemeSwitch";
import { UserMenu } from "./UserMenu";

// The frame around the sign-in, register and password screens, and the first business set-up.
export const AuthLayout = ({ wide = false }: { wide?: boolean }) => (
  <div className="flex min-h-dvh flex-col">
    <header className="flex items-center justify-between px-4 py-4 sm:px-8 print:hidden">
      <Link to="/" className="flex items-center gap-2 font-semibold">
        <img src={brand.logo} alt="" className={cn("size-8", brand.invertLogoInDark && "dark:invert")} />
        {brand.name}
      </Link>
      <div className="flex items-center gap-2">
        <LanguageSwitch />
        <ThemeSwitch />
        <UserMenu />
      </div>
    </header>
    <Announcement className="mx-4 sm:mx-8 print:hidden" />
    <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
      <div className={cn("w-full", wide ? "max-w-lg" : "max-w-sm")}>
        <Outlet />
      </div>
    </main>
  </div>
);
