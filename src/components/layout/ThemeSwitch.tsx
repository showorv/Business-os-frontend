import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { THEME_CHOICES, setTheme, useTheme, type ThemeChoice } from "@/lib/theme";

const ICONS: Record<ThemeChoice, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

// Picks light, dark, or the device's own setting.
export const ThemeSwitch = () => {
  const { t } = useTranslation("common");
  const { choice, dark } = useTheme();
  const Current = dark ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("theme")}>
          <Current />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {THEME_CHOICES.map((value) => {
          const Icon = ICONS[value];
          return (
            <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
              <Icon />
              {t(`theme_${value}`)}
              {choice === value && <Check className="ml-auto" aria-hidden />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
