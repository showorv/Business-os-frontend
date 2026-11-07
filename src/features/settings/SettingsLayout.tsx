import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router";
import { cn } from "@/lib/cn";

export const SettingsLayout = () => {
  const { t } = useTranslation("shell");
  const tab = ({ isActive }: { isActive: boolean }) =>
    cn("rounded-md px-3 py-2 text-sm font-medium", isActive ? "bg-brand-soft text-brand" : "text-muted-foreground hover:bg-muted");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav className="flex gap-1 overflow-x-auto border-b pb-3">
        <NavLink to="/settings/profile" className={tab}>
          {t("profile")}
        </NavLink>
        <NavLink to="/settings/security" className={tab}>
          {t("security")}
        </NavLink>
        <NavLink to="/settings/notifications" className={tab}>
          {t("notifications")}
        </NavLink>
        <NavLink to="/settings/plan" className={tab}>
          {t("plan")}
        </NavLink>
        <NavLink to="/settings/activity" className={tab}>
          {t("activity")}
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
};
