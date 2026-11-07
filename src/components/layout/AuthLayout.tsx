import { Outlet } from "react-router";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import { LanguageSwitch } from "./LanguageSwitch";
import { ThemeSwitch } from "./ThemeSwitch";
import { UserMenu } from "./UserMenu";

// The frame around the sign-in, register and password screens, and the first business set-up.
export const AuthLayout = ({ wide = false }: { wide?: boolean }) => (
  <div className="flex min-h-dvh flex-col">
    <header className="flex items-center justify-between px-4 py-4 sm:px-8 print:hidden">
      <span className="flex items-center gap-2 font-semibold">
        <img src={brand.logo} alt="" className={cn("size-8", brand.invertLogoInDark && "dark:invert")} />
        {brand.name}
      </span>
      <div className="flex items-center gap-2">
        <LanguageSwitch />
        <ThemeSwitch />
        <UserMenu />
      </div>
    </header>
    <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
      <div className={cn("w-full", wide ? "max-w-lg" : "max-w-sm")}>
        <Outlet />
      </div>
    </main>
  </div>
);
