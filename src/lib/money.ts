// The same rules as the backend's formatMoney, so figures read the same on screen and in a PDF.
// Money arrives from the API as whole paisa in a string, and never passes through a float here.
export type DigitStyle = "latin" | "bangla";
export type Grouping = "lakh" | "western";

const CURRENCY_SYMBOLS: Record<string, string> = { BDT: "৳", USD: "$", EUR: "€", GBP: "£", INR: "₹" };
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "UGX", "XAF", "XOF"]);
const BANGLA_ZERO = 0x09e6;

export const toBanglaDigits = (text: string) => text.replace(/\d/g, (digit) => String.fromCharCode(BANGLA_ZERO + Number(digit)));

const groupDigits = (digits: string, grouping: Grouping) => {
  if (grouping === "western") return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  // Lakh and crore: the last three digits, then pairs. 1250000 becomes 12,50,000.
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${digits.slice(-3)}`;
};

export interface MoneyFormat {
  digitStyle?: DigitStyle;
  grouping?: Grouping;
  withSymbol?: boolean;
}

export const formatMoney = (minor: string | bigint, currency: string, { digitStyle = "latin", grouping = "lakh", withSymbol = true }: MoneyFormat = {}) => {
  const amount = BigInt(minor);
  const decimals = ZERO_DECIMAL.has(currency) ? 0 : 2;
  const absolute = (amount < 0n ? -amount : amount).toString().padStart(decimals + 1, "0");
  const whole = decimals === 0 ? absolute : absolute.slice(0, -decimals);
  const fraction = decimals === 0 ? "" : `.${absolute.slice(-decimals)}`;
  const symbol = withSymbol ? (CURRENCY_SYMBOLS[currency] ?? `${currency} `) : "";
  const text = `${amount < 0n ? "-" : ""}${symbol}${groupDigits(whole, grouping)}${fraction}`;
  return digitStyle === "bangla" ? toBanglaDigits(text) : text;
};

const LATIN_ZERO = 48;
const fromBanglaDigits = (text: string) => text.replace(/[০-৯]/g, (digit) => String.fromCharCode(LATIN_ZERO + digit.charCodeAt(0) - BANGLA_ZERO));

// What someone typed ("1,500.5", "১৫০০", "৳ 2,50,000") as whole paisa in a string, or null if it isn't
// an amount. Never goes through a float, so 0.1 + 0.2 problems can't happen.
export const parseMoney = (text: string, currency: string): string | null => {
  const decimals = ZERO_DECIMAL.has(currency) ? 0 : 2;
  const cleaned = fromBanglaDigits(text).replace(/[\s,৳$€£₹]/g, "").replace(/^[A-Z]{3}/i, "");
  const pattern = decimals === 0 ? /^(\d{1,18})$/ : /^(\d{0,18})(?:\.(\d{0,2}))?$/;
  const match = pattern.exec(cleaned);
  if (!match || cleaned === "" || cleaned === ".") return null;
  const whole = match[1] || "0";
  const fraction = decimals === 0 ? "" : (match[2] ?? "").padEnd(2, "0");
  return BigInt(whole + fraction).toString();
};

// Whole paisa back to plain text for an input box: "150050" → "1500.50". No grouping, Latin digits.
export const minorToInput = (minor: string | bigint, currency: string) => {
  const decimals = ZERO_DECIMAL.has(currency) ? 0 : 2;
  const digits = BigInt(minor).toString().padStart(decimals + 1, "0");
  return decimals === 0 ? digits : `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
};
