import { useCallback } from "react";
import { formatMoney, type Grouping } from "@/lib/money";
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
