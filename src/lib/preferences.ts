import { useAppSelector } from "@/app/store";
import { currentLocale } from "@/i18n";
import type { DigitStyle } from "./money";
import { useTranslation } from "react-i18next";

// How this person wants dates and numbers written.
export const useFormatting = () => {
  useTranslation();
  const digitStyle = (useAppSelector((state) => state.auth.user?.digitStyle) ?? "latin") as DigitStyle;
  return { locale: currentLocale(), digitStyle };
};

const LAST_BUSINESS = "business-os-last-business";

export const rememberBusiness = (userId: string, businessId: string) => {
  try {
    localStorage.setItem(`${LAST_BUSINESS}:${userId}`, businessId);
  } catch {
    // Not essential: the first business is used instead.
  }
};

export const lastBusiness = (userId: string) => {
  try {
    return localStorage.getItem(`${LAST_BUSINESS}:${userId}`);
  } catch {
    return null;
  }
};
