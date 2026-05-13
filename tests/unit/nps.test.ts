import { describe, it, expect } from "vitest";
import { computeNps } from "@/server/insights";

describe("computeNps", () => {
  it("returns zero aggregation for empty scores", () => {
    const result = computeNps([]);
    expect(result).toEqual({
      score: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      total: 0,
    });
  });

  it("computes NPS correctly for all promoters", () => {
    const result = computeNps([9, 10, 9, 10]);
    expect(result.score).toBe(100);
    expect(result.promoters).toBe(4);
    expect(result.passives).toBe(0);
    expect(result.detractors).toBe(0);
  });

  it("computes NPS correctly for all detractors", () => {
    const result = computeNps([0, 3, 5, 6]);
    expect(result.score).toBe(-100);
    expect(result.promoters).toBe(0);
    expect(result.detractors).toBe(4);
  });

  it("computes NPS correctly for mixed scores", () => {
    // 2 promoters (9,10), 1 passive (7), 1 detractor (4)
    const result = computeNps([9, 10, 7, 4]);
    expect(result.promoters).toBe(2);
    expect(result.passives).toBe(1);
    expect(result.detractors).toBe(1);
    // NPS = (2/4 - 1/4) * 100 = 25
    expect(result.score).toBe(25);
    expect(result.total).toBe(4);
  });

  it("classifies boundary scores correctly", () => {
    // 6 = detractor, 7 = passive, 8 = passive, 9 = promoter
    const result = computeNps([6, 7, 8, 9]);
    expect(result.detractors).toBe(1);
    expect(result.passives).toBe(2);
    expect(result.promoters).toBe(1);
    expect(result.score).toBe(0);
  });

  it("rounds the score to nearest integer", () => {
    // 1 promoter, 0 passive, 2 detractors
    const result = computeNps([10, 3, 5]);
    // NPS = (1/3 - 2/3) * 100 = -33.33 → -33
    expect(result.score).toBe(-33);
  });
});
