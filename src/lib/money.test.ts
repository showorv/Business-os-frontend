import { describe, expect, it } from "vitest";
import { formatMoney, minorToInput, parseMoney } from "./money";

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

describe("parseMoney", () => {
  it("reads plain, grouped and Bangla amounts", () => {
    expect(parseMoney("1500", "BDT")).toBe("150000");
    expect(parseMoney("1,500.5", "BDT")).toBe("150050");
    expect(parseMoney("৳ 2,50,000", "BDT")).toBe("25000000");
    expect(parseMoney("১৫০০.২৫", "BDT")).toBe("150025");
    expect(parseMoney(".5", "BDT")).toBe("50");
  });

  it("refuses what isn't an amount", () => {
    for (const text of ["", ".", "abc", "1.234", "-5", "1.2.3", "12a"]) expect(parseMoney(text, "BDT")).toBeNull();
  });

  it("keeps huge amounts exact", () => {
    expect(parseMoney("9007199254740993.17", "BDT")).toBe("900719925474099317");
  });

  it("goes back to input text", () => {
    expect(minorToInput("150050", "BDT")).toBe("1500.50");
    expect(minorToInput("5", "BDT")).toBe("0.05");
    expect(minorToInput("1500", "JPY")).toBe("1500");
  });
});
