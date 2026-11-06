import { describe, expect, it } from "vitest";
import { addMonths, fiscalYearStart, lastDayOf, monthsBetween } from "./months";
import { formatCompact } from "./money";

describe("months", () => {
  it("adds and subtracts across years", () => {
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-03", -14)).toBe("2025-01");
  });
  it("lists the months in a range", () => {
    expect(monthsBetween("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(monthsBetween("2026-05", "2026-04")).toEqual([]);
  });
  it("finds the start of the financial year", () => {
    expect(fiscalYearStart("2026-03", 7)).toBe("2025-07");
    expect(fiscalYearStart("2026-07", 7)).toBe("2026-07");
    expect(fiscalYearStart("2026-11", 1)).toBe("2026-01");
  });
  it("knows the last day, leap years too", () => {
    expect(lastDayOf("2028-02")).toBe("2028-02-29");
    expect(lastDayOf("2026-11")).toBe("2026-11-30");
  });
});

describe("formatCompact", () => {
  it("uses lakh and crore by default", () => {
    expect(formatCompact("125000000", "BDT")).toBe("৳12.5L");
    expect(formatCompact("1250000", "BDT")).toBe("৳12.5K");
    expect(formatCompact("2000000000", "BDT")).toBe("৳2Cr");
    expect(formatCompact("-99900", "BDT")).toBe("-৳999");
  });
  it("uses K, M and B for western grouping, and Bangla digits on request", () => {
    expect(formatCompact("125000000", "BDT", { grouping: "western" })).toBe("৳1.3M");
    expect(formatCompact("1250000", "BDT", { digitStyle: "bangla" })).toBe("৳১২.৫K");
  });
});
