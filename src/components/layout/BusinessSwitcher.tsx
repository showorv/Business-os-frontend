import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useAppSelector } from "@/app/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { rememberBusiness } from "@/lib/preferences";

export const BusinessSwitcher = () => {
  const { t } = useTranslation("shell");
  const navigate = useNavigate();
  const userId = useAppSelector((state) => state.auth.user?.id);
  const { business, businesses } = useCurrentBusiness();

  const open = (id: string) => {
    if (userId) rememberBusiness(userId, id);
    void navigate(`/b/${id}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-0 max-w-64 justify-between" aria-label={t("switchBusiness")}>
          <span className="truncate">{business?.name ?? t("yourBusinesses")}</span>
          <ChevronsUpDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{t("yourBusinesses")}</DropdownMenuLabel>
        {businesses.map((item) => (
          <DropdownMenuItem key={item.id} onSelect={() => open(item.id)}>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{item.name}</span>
              <span className="block text-xs text-muted-foreground">
                {t(`role${item.roleKey}`, { defaultValue: item.roleKey })}
                {item.status !== "ACTIVE" ? ` · ${t(`status${item.status}`)}` : ""}
              </span>
            </span>
            {item.id === business?.id ? <Check className="size-4 text-brand" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate("/onboarding")}>
          <Plus className="size-4" />
          {t("newBusiness")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
