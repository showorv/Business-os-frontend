import { useSearchParams } from "react-router";
import { todayIn } from "@/lib/dates";
import { addMonths, fiscalYearStart, monthsBetween, toMonth } from "@/lib/months";
import type { MonthRange } from "./api";

export const PRESETS = ["month", "quarter", "year", "last12", "custom"] as const;
export type Preset = (typeof PRESETS)[number];

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
// The backend accepts up to five years at once.
const MAX_MONTHS = 60;

// The months a preset covers, counted back from this month in the business's own time zone.
export const presetRange = (preset: Exclude<Preset, "custom">, today: string, fiscalStartMonth: number): MonthRange => {
  const now = toMonth(today);
  switch (preset) {
    case "month":
      return { fromMonth: now, toMonth: now };
    case "quarter":
      return { fromMonth: addMonths(now, -2), toMonth: now };
    case "last12":
      return { fromMonth: addMonths(now, -11), toMonth: now };
    case "year":
      return { fromMonth: fiscalYearStart(now, fiscalStartMonth), toMonth: now };
  }
};

// The same number of months just before, for "compared with the previous period".
export const previousRange = ({ fromMonth, toMonth: to }: MonthRange): MonthRange => {
  const length = monthsBetween(fromMonth, to).length;
  return { fromMonth: addMonths(fromMonth, -length), toMonth: addMonths(fromMonth, -1) };
};

// The chosen period lives in the address (?period=last12, or ?period=custom&from=2026-01&to=2026-06),
// so a view can be bookmarked or shared, and every chart on the page uses the same months.
export const usePeriod = (business: { timezone: string; fiscalYearStartMonth: number } | undefined, fallback: Exclude<Preset, "custom"> = "year") => {
  const [params, setParams] = useSearchParams();
  const today = todayIn(business?.timezone ?? "Asia/Dhaka");
  const fiscalStart = business?.fiscalYearStartMonth ?? 1;
  const asked = params.get("period") as Preset | null;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const customOk = MONTH.test(from) && MONTH.test(to) && from <= to && monthsBetween(from, to).length <= MAX_MONTHS;

  const preset: Preset = asked === "custom" && customOk ? "custom" : asked && asked !== "custom" && PRESETS.includes(asked) ? asked : fallback;
  const range = preset === "custom" ? { fromMonth: from, toMonth: to } : presetRange(preset, today, fiscalStart);

  const choose = (next: Preset, custom?: MonthRange) =>
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        updated.set("period", next);
        if (next === "custom" && custom) {
          updated.set("from", custom.fromMonth);
          updated.set("to", custom.toMonth);
        } else {
          updated.delete("from");
          updated.delete("to");
        }
        return updated;
      },
      { replace: true },
    );

  return { preset, range, previous: previousRange(range), today, months: monthsBetween(range.fromMonth, range.toMonth), choose };
};
