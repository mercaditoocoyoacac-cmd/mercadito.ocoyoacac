import { describe, it, expect } from "vitest";
import { haversineDistance, formatDistance } from "@/lib/geo";

describe("haversineDistance", () => {
  it("returns 0 for the same point", () => {
    const dist = haversineDistance(19.4326, -99.1332, 19.4326, -99.1332);
    expect(dist).toBe(0);
  });

  it("calculates distance between Mexico City and New York (~3360 km)", () => {
    const dist = haversineDistance(19.4326, -99.1332, 40.7128, -74.006);
    expect(dist).toBeGreaterThan(3000);
    expect(dist).toBeLessThan(4000);
  });

  it("is symmetric (A to B equals B to A)", () => {
    const d1 = haversineDistance(19.4326, -99.1332, 40.7128, -74.006);
    const d2 = haversineDistance(40.7128, -74.006, 19.4326, -99.1332);
    expect(d1).toBeCloseTo(d2, 5);
  });

  it("handles small distances", () => {
    const dist = haversineDistance(19.4326, -99.1332, 19.4327, -99.1333);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(0.1);
  });

  it("handles antipodal points (roughly half Earth circumference)", () => {
    const dist = haversineDistance(0, 0, 0, 180);
    expect(dist).toBeGreaterThan(19000);
    expect(dist).toBeLessThan(21000);
  });
});

describe("formatDistance", () => {
  it("formats km as X.Xkm when >= 1", () => {
    expect(formatDistance(3.5)).toBe("3.5km");
  });

  it("formats meters when < 1", () => {
    const result = formatDistance(0.5);
    expect(result).toMatch(/^\d+m$/);
  });

  it("formats 1.0 correctly", () => {
    expect(formatDistance(1.0)).toBe("1.0km");
  });

  it("formats very small distances", () => {
    const result = formatDistance(0.01);
    expect(result).toMatch(/^\d+m$/);
  });
});
