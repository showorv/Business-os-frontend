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

// A calendar date from the API ("2026-11-06"), written for people: "6 Nov 2026" or "৬ নভে, ২০২৬".
// Read as UTC so the date never shifts a day in a time zone behind or ahead.
export const formatDate = (date: string, locale: string, digitStyle: DigitStyle) =>
  new Intl.DateTimeFormat(intlLocale(locale, digitStyle), { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

// Today's date in a time zone, as the API writes dates: "2026-11-06". A business uses its own zone.
export const todayIn = (timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
