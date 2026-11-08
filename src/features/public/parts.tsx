import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/store";
import type { DigitStyle } from "@/lib/money";

// Signed-in people keep their own choice; a guest reading Bangla gets Bangla digits.
export const useGuestDigits = (): DigitStyle => {
  const { i18n } = useTranslation();
  const chosen = useAppSelector((state) => state.auth.user?.digitStyle) as DigitStyle | undefined;
  return chosen ?? (i18n.language.startsWith("bn") ? "bangla" : "latin");
};
