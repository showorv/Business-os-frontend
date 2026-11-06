import { describe, expect, it } from "vitest";
import { formatDate, todayIn } from "./dates";

describe("formatDate", () => {
  it("never moves a calendar date", () => {
    expect(formatDate("2026-11-06", "en", "latin")).toBe("6 Nov 2026");
    expect(formatDate("2026-01-01", "en", "latin")).toBe("1 Jan 2026");
  });

  it("writes Bangla digits when asked", () => {
    expect(formatDate("2026-11-06", "bn-BD", "bangla")).toMatch(/৬/);
  });
});

describe("todayIn", () => {
  it("gives a plain date", () => {
    expect(todayIn("Asia/Dhaka")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
