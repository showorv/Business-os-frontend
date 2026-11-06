import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Input } from "./input";

const SYMBOLS: Record<string, string> = { BDT: "৳", USD: "$", EUR: "€", GBP: "£", INR: "₹" };

// A box for an amount, with the currency in front. Accepts "1,500.50" or Bangla digits;
// parseMoney (src/lib/money.ts) turns the text into paisa.
export const MoneyInput = ({ currency, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { currency: string }) => (
  <div className="relative">
    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">{SYMBOLS[currency] ?? currency}</span>
    <Input inputMode="decimal" autoComplete="off" className={cn("pl-9 tabular-nums", className)} {...props} />
  </div>
);
