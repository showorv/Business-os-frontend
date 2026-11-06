import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("groups in lakh and crore by default", () => {
    expect(formatMoney("12500050", "BDT")).toBe("৳1,25,000.50");
    expect(formatMoney("1234567890", "BDT")).toBe("৳1,23,45,678.90");
  });

  it("groups in thousands when asked", () => {
    expect(formatMoney("12500050", "BDT", { grouping: "western" })).toBe("৳125,000.50");
  });

  it("writes Bangla digits", () => {
    expect(formatMoney("3271125", "BDT", { digitStyle: "bangla" })).toBe("৳৩২,৭১১.২৫");
  });

  it("handles small, negative and huge amounts without losing a paisa", () => {
    expect(formatMoney("5", "BDT")).toBe("৳0.05");
    expect(formatMoney("-150000", "BDT")).toBe("-৳1,500.00");
    expect(formatMoney("900719925474099317", "BDT")).toBe("৳9,00,71,99,25,47,40,993.17");
  });

  it("knows other currencies", () => {
    expect(formatMoney("1999", "USD", { grouping: "western" })).toBe("$19.99");
    expect(formatMoney("1500", "JPY")).toBe("JPY 1,500");
  });
});
