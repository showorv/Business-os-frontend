import { useCallback } from "react";
import { formatCompact, formatMoney, type Grouping } from "@/lib/money";
import { useFormatting } from "@/lib/preferences";
import type { BusinessSettings } from "./api";
import { useCurrentBusiness } from "./useCurrentBusiness";

// Writes an amount the way this business groups numbers (lakh or thousands) and shows currency
// (৳ or BDT), in this person's digits (Latin or Bangla).
//   const money = useMoney();  money("150000", "BDT") → "৳1,500.00"
export const useMoney = () => {
  const { business } = useCurrentBusiness();
  const { digitStyle } = useFormatting();
  const settings = business?.settings as Partial<BusinessSettings> | undefined;
  const grouping: Grouping = settings?.numberGrouping ?? "lakh";
  const asCode = settings?.currencyDisplay === "code";

  return useCallback(
    (minor: string | bigint, currency: string) => {
      const text = formatMoney(minor, currency, { digitStyle, grouping, withSymbol: !asCode });
      if (!asCode) return text;
      return text.startsWith("-") ? `-${currency} ${text.slice(1)}` : `${currency} ${text}`;
    },
    [digitStyle, grouping, asCode],
  );
};

// The short form for chart axes and tight spaces: "৳12.5K", "৳3.4L". Takes whole currency units
// (what a chart scale works in), not paisa.
export const useCompactMoney = () => {
  const { business } = useCurrentBusiness();
  const { digitStyle } = useFormatting();
  const settings = business?.settings as Partial<BusinessSettings> | undefined;
  const grouping: Grouping = settings?.numberGrouping ?? "lakh";
  return useCallback(
    (units: number, currency: string) => formatCompact(BigInt(Math.round(units * 100)), currency, { digitStyle, grouping }),
    [digitStyle, grouping],
  );
};
