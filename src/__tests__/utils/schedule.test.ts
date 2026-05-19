import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isStoreOpen } from "@/lib/schedule";

describe("isStoreOpen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns true when no openTime or closeTime", () => {
    expect(isStoreOpen({ openTime: null, closeTime: null, scheduleDays: ["MONDAY"] })).toBe(true);
    expect(isStoreOpen({ openTime: "09:00", closeTime: null, scheduleDays: ["MONDAY"] })).toBe(true);
    expect(isStoreOpen({ openTime: null, closeTime: "18:00", scheduleDays: ["MONDAY"] })).toBe(true);
  });

  it("returns false when scheduleDays is empty", () => {
    expect(isStoreOpen({ openTime: "09:00", closeTime: "18:00", scheduleDays: [] })).toBe(false);
  });

  it("returns false when current day is not in scheduleDays", () => {
    const monday = new Date("2026-05-18T15:00:00Z");
    vi.setSystemTime(monday);
    expect(isStoreOpen({ openTime: "09:00", closeTime: "18:00", scheduleDays: ["TUESDAY"] })).toBe(false);
  });

  it("returns true when within opening hours", () => {
    const wed = new Date("2026-05-20T16:00:00Z");
    vi.setSystemTime(wed);
    expect(isStoreOpen({ openTime: "09:00", closeTime: "18:00", scheduleDays: ["WEDNESDAY"] })).toBe(true);
  });

  it("returns false when before opening hours", () => {
    const wed = new Date("2026-05-20T14:00:00Z");
    vi.setSystemTime(wed);
    expect(isStoreOpen({ openTime: "09:00", closeTime: "18:00", scheduleDays: ["WEDNESDAY"] })).toBe(false);
  });

  it("returns false when after closing hours", () => {
    const wed = new Date("2026-05-21T01:00:00Z");
    vi.setSystemTime(wed);
    expect(isStoreOpen({ openTime: "09:00", closeTime: "18:00", scheduleDays: ["WEDNESDAY"] })).toBe(false);
  });

  it("handles overnight hours (close < open)", () => {
    const lateNight = new Date("2026-05-20T06:00:00Z");
    vi.setSystemTime(lateNight);
    expect(isStoreOpen({ openTime: "22:00", closeTime: "02:00", scheduleDays: ["WEDNESDAY"] })).toBe(true);
  });

  it("handles overnight hours - after close next day", () => {
    const afterClose = new Date("2026-05-20T10:00:00Z");
    vi.setSystemTime(afterClose);
    expect(isStoreOpen({ openTime: "22:00", closeTime: "02:00", scheduleDays: ["WEDNESDAY"] })).toBe(false);
  });

  it("handles multiple schedule days", () => {
    const sat = new Date("2026-05-23T16:00:00Z");
    vi.setSystemTime(sat);
    expect(isStoreOpen({ openTime: "09:00", closeTime: "14:00", scheduleDays: ["MONDAY", "WEDNESDAY", "FRIDAY"] })).toBe(false);

    const mon = new Date("2026-05-18T15:00:00Z");
    vi.setSystemTime(mon);
    expect(isStoreOpen({ openTime: "09:00", closeTime: "14:00", scheduleDays: ["MONDAY", "WEDNESDAY", "FRIDAY"] })).toBe(true);
  });

  it("works at exact opening time boundary", () => {
    const opening = new Date("2026-05-20T15:00:00Z");
    vi.setSystemTime(opening);
    expect(isStoreOpen({ openTime: "09:00", closeTime: "18:00", scheduleDays: ["WEDNESDAY"] })).toBe(true);
  });

  it("works at exact closing time boundary (should be closed)", () => {
    const closing = new Date("2026-05-21T00:00:00Z");
    vi.setSystemTime(closing);
    expect(isStoreOpen({ openTime: "09:00", closeTime: "18:00", scheduleDays: ["WEDNESDAY"] })).toBe(false);
  });
});
