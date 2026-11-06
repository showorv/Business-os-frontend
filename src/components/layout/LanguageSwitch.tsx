import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/store";
import { Button } from "@/components/ui/button";
import { useUpdateMe } from "@/features/auth/api";
import { currentLocale, setLanguage } from "@/i18n";

// Switches between English and Bangla. When signed in, it's saved to the account, so it follows the
// person to other devices and to the emails they get.
export const LanguageSwitch = () => {
  const { t } = useTranslation();
  const signedIn = useAppSelector((state) => state.auth.status === "signedIn");
  const updateMe = useUpdateMe();
  const next = currentLocale() === "en" ? "bn-BD" : "en";

  const change = () => {
    void setLanguage(next);
    if (signedIn) updateMe.mutate({ locale: next });
  };

  return (
    <Button variant="ghost" size="sm" onClick={change} aria-label={t("common:language")}>
      <Languages />
      {next === "en" ? t("common:english") : t("common:bangla")}
    </Button>
  );
};
