import type { DigitStyle } from "./money";

// Months as the API writes them: "2026-11". Plain string arithmetic, so time zones can't shift them.

export const toMonth = (date: string) => date.slice(0, 7);

export const addMonths = (month: string, count: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year! * 12 + (monthNumber! - 1) + count;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
};

export const monthsBetween = (from: string, to: string) => {
  const months: string[] = [];
  for (let month = from; month <= to && months.length < 120; month = addMonths(month, 1)) months.push(month);
  return months;
};

// The first month of the financial year that `month` falls in. A July start: 2026-03 is in the year
// that began 2025-07.
export const fiscalYearStart = (month: string, startMonth: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const startYear = monthNumber! >= startMonth ? year! : year! - 1;
  return `${startYear}-${String(startMonth).padStart(2, "0")}`;
};

export const lastDayOf = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const day = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
};

const intlLocale = (locale: string, digitStyle: DigitStyle) => `${locale === "bn-BD" ? "bn-BD" : "en-GB"}-u-nu-${digitStyle === "bangla" ? "beng" : "latn"}`;

// "Nov", "Nov 2026" or "November 2026", in the person's language and digits.
export const formatMonth = (month: string, locale: string, digitStyle: DigitStyle, style: "short" | "medium" | "long" = "medium") =>
  new Intl.DateTimeFormat(intlLocale(locale, digitStyle), {
    month: style === "long" ? "long" : "short",
    ...(style === "short" ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));

// "Jul 2026 – Nov 2026", or one month alone.
export const formatMonthRange = (from: string, to: string, locale: string, digitStyle: DigitStyle) =>
  from === to ? formatMonth(from, locale, digitStyle, "long") : `${formatMonth(from, locale, digitStyle)} – ${formatMonth(to, locale, digitStyle)}`;
