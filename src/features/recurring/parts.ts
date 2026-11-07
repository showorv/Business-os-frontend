import type { TFunction } from "i18next";
import type { DigitStyle } from "@/lib/money";
import { formatDate } from "@/lib/dates";

// A schedule repeats at most daily, so "no repeat" isn't one of its choices.
export const SCHEDULE_REPEATS = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
export type ScheduleRepeat = (typeof SCHEDULE_REPEATS)[number];

// "Every month on day 5, from 5 Dec 2026" in the reader's language.
export const describeRepeat = (t: TFunction, repeat: string, startDate: string, locale: string, digitStyle: DigitStyle) => {
  const day = new Date(`${startDate}T00:00:00Z`);
  const lang = `${locale === "bn-BD" ? "bn-BD" : "en-GB"}-u-nu-${digitStyle === "bangla" ? "beng" : "latn"}`;
  const weekday = new Intl.DateTimeFormat(lang, { weekday: "long", timeZone: "UTC" }).format(day);
  const dayMonth = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", timeZone: "UTC" }).format(day);
  const dayOfMonth = day.getUTCDate().toLocaleString(lang);
  return t(`recurring:every_${repeat}`, { weekday, dayMonth, day: dayOfMonth, from: formatDate(startDate, locale, digitStyle), defaultValue: t("recurring:every_CUSTOM") });
};
