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
