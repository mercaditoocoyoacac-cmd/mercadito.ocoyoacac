import { describe, it, expect } from "vitest";
import { formatDateInMexico, formatDateTimeInMexico } from "@/lib/dates";

describe("formatDateInMexico", () => {
  it("returns empty string for null", () => {
    expect(formatDateInMexico(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDateInMexico(undefined)).toBe("");
  });

  it("formats a Date object in Mexico City timezone", () => {
    const date = new Date("2026-05-18T15:00:00Z");
    const result = formatDateInMexico(date);
    expect(result).toContain("2026");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formats a date string", () => {
    const result = formatDateInMexico("2026-05-18T15:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("applies custom options over defaults", () => {
    const date = new Date("2026-05-18T15:00:00Z");
    const result = formatDateInMexico(date, { year: "numeric", month: "long", day: "numeric" });
    expect(result).toContain("mayo");
  });
});

describe("formatDateTimeInMexico", () => {
  it("returns empty string for null", () => {
    expect(formatDateTimeInMexico(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDateTimeInMexico(undefined)).toBe("");
  });

  it("formats a Date object with time in Mexico City timezone", () => {
    const date = new Date("2026-05-18T15:00:00Z");
    const result = formatDateTimeInMexico(date);
    expect(result).toContain("2026");
    expect(result).toContain(":");
  });

  it("formats a date string with time", () => {
    const result = formatDateTimeInMexico("2026-05-18T15:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(5);
  });

  it("converts UTC to correct Mexico City hour (UTC-6)", () => {
    const date = new Date("2026-05-18T15:00:00Z");
    const result = formatDateTimeInMexico(date, { hour: "2-digit", minute: "2-digit" });
    expect(result).toMatch(/0?9:00/);
  });
});
