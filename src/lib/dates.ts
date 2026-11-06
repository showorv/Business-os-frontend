import type { DigitStyle } from "./money";

const intlLocale = (locale: string, digitStyle: DigitStyle) => `${locale === "bn-BD" ? "bn-BD" : "en-GB"}-u-nu-${digitStyle === "bangla" ? "beng" : "latn"}`;

export const formatDateTime = (value: string | Date, locale: string, digitStyle: DigitStyle) =>
  new Intl.DateTimeFormat(intlLocale(locale, digitStyle), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

// "3 hours ago", or "৩ ঘণ্টা আগে".
export const formatRelative = (value: string | Date, locale: string, digitStyle: DigitStyle, now = Date.now()) => {
  const difference = new Date(value).getTime() - now;
  const format = new Intl.RelativeTimeFormat(intlLocale(locale, digitStyle), { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(difference) >= size) return format.format(Math.round(difference / size), unit);
  }
  return format.format(0, "minute");
};
