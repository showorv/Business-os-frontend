import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import bnAuth from "./bn/auth.json";
import bnBusinesses from "./bn/businesses.json";
import bnCommon from "./bn/common.json";
import bnErrors from "./bn/errors.json";
import bnSettings from "./bn/settings.json";
import bnShell from "./bn/shell.json";
import bnValidation from "./bn/validation.json";
import enAuth from "./en/auth.json";
import enBusinesses from "./en/businesses.json";
import enCommon from "./en/common.json";
import enErrors from "./en/errors.json";
import enSettings from "./en/settings.json";
import enShell from "./en/shell.json";
import enValidation from "./en/validation.json";

// One file per screen area and language. Every key in English must also be in Bangla:
// src/i18n/i18n.test.ts checks that.
export const resources = {
  en: { common: enCommon, auth: enAuth, validation: enValidation, shell: enShell, businesses: enBusinesses, settings: enSettings, errors: enErrors },
  bn: { common: bnCommon, auth: bnAuth, validation: bnValidation, shell: bnShell, businesses: bnBusinesses, settings: bnSettings, errors: bnErrors },
} as const;

export type Locale = "en" | "bn-BD";

const STORAGE_KEY = "business-os-language";

// The backend stores Bangla as "bn-BD". The translation files are just "bn".
const toResource = (locale: string) => (locale.startsWith("bn") ? "bn" : "en");
export const currentLocale = (): Locale => (i18n.language === "bn" ? "bn-BD" : "en");

const saved = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
})();

void i18n.use(initReactI18next).init({
  resources,
  // English unless this browser chose Bangla before. A signed-in user's own setting wins after sign-in.
  lng: toResource(saved ?? "en"),
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

const applyToPage = () => {
  document.documentElement.lang = currentLocale();
};
applyToPage();

export const setLanguage = async (locale: string) => {
  await i18n.changeLanguage(toResource(locale));
  try {
    localStorage.setItem(STORAGE_KEY, currentLocale());
  } catch {
    // Private browsing can refuse storage. The language still changes for this visit.
  }
  applyToPage();
};

export default i18n;
