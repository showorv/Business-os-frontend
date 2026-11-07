import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { brand } from "@/config/brand";
import { useAccess } from "@/features/businesses/api";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "./nav";

// The list of screens. On a laptop it sits on the left; on a phone it opens from the menu button.
export const SidebarNav = ({ businessId, onNavigate }: { businessId?: string; onNavigate?: () => void }) => {
  const { t } = useTranslation(["shell", "common"]);
  const access = useAccess(businessId);
  const items = NAV_ITEMS.filter((item) => !item.permission || access.can(item.permission));
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5 font-semibold">
        <img src={brand.logo} alt="" className={cn("size-8", brand.invertLogoInDark && "dark:invert")} />
        {brand.name}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label={t("common:menu")}>
        {items.map(({ key, icon: Icon, path, step }) =>
          path !== null && businessId ? (
            <NavLink
              key={key}
              to={`/b/${businessId}${path ? `/${path}` : ""}`}
              // The dashboard is lit only on its own page; the others stay lit on their inner pages too.
              end={path === ""}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-brand-soft text-brand" : "hover:bg-muted")
              }
            >
              <Icon className="size-4" />
              <span className="flex-1">{t(`shell:${key}`)}</span>
              {/* A hint that this part comes with Pro, when the business's plan doesn't include it. */}
              {key === "assistant" && access.plan && !access.plan.aiEnabled ? (
                <span className="rounded border px-1.5 text-[10px] font-semibold tracking-wide uppercase">{t("shell:pro")}</span>
              ) : null}
            </NavLink>
          ) : (
            <span key={key} className="flex cursor-default items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground" title={step ? t("common:soon", { step }) : undefined}>
              <Icon className="size-4" />
              <span className="flex-1">{t(`shell:${key}`)}</span>
              {step ? <span className="text-xs">{step}</span> : null}
            </span>
          ),
        )}
      </nav>
    </div>
  );
};
