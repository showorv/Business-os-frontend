import type { DigitStyle } from "./money";

const intlLocale = (locale: string, digitStyle: DigitStyle) => `${locale === "bn-BD" ? "bn-BD" : "en-GB"}-u-nu-${digitStyle === "bangla" ? "beng" : "latn"}`;

// "12.4%" or "১২.৪%". Whole numbers past 100 lose the decimal: "250%".
export const formatPercent = (value: number, locale: string, digitStyle: DigitStyle, signed = false) =>
  new Intl.NumberFormat(intlLocale(locale, digitStyle), {
    style: "percent",
    maximumFractionDigits: Math.abs(value) >= 1 ? 0 : 1,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(value);

export const formatCount = (value: number, locale: string, digitStyle: DigitStyle) => new Intl.NumberFormat(intlLocale(locale, digitStyle)).format(value);

// How much `current` moved from `previous`, as a fraction (0.124 = up 12.4%). Null when there's
// nothing to compare with. Against the size of the old figure, so a smaller loss reads as a rise.
export const change = (current: string | bigint, previous: string | bigint) => {
  const now = BigInt(current);
  const before = BigInt(previous);
  if (before === 0n) return null;
  const size = before < 0n ? -before : before;
  return Number(((now - before) * 10_000n) / size) / 10_000;
};
