import { describe, it, expect } from "vitest";
import {
  createRecommendationSchema,
  createInternalRatingSchema,
  createNoteSchema,
  createEngagementSchema,
  createCostBenchmarkSchema,
  MATTER_TYPE_LABELS,
  OUTCOME_LABELS,
  BENCHMARK_ROLE_LABELS,
  BENCHMARK_SOURCE_LABELS,
} from "@/lib/schemas";

// ─── NPS Recommendation Schema ──────────────────────────────────────────────

describe("createRecommendationSchema", () => {
  it("validates a minimal recommendation", () => {
    const result = createRecommendationSchema.safeParse({
      targetType: "FIRM",
      firmId: "clx123",
      npsScore: "9",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.npsScore).toBe(9);
      expect(result.data.targetType).toBe("FIRM");
    }
  });

  it("validates a full recommendation with optional fields", () => {
    const result = createRecommendationSchema.safeParse({
      targetType: "LAWYER",
      lawyerId: "clx456",
      npsScore: "10",
      practiceAreaId: "pa1",
      reason: "Exceptional responsiveness on cross-border deals",
    });
    expect(result.success).toBe(true);
  });

  it("rejects NPS score below 0", () => {
    const result = createRecommendationSchema.safeParse({
      targetType: "FIRM",
      firmId: "clx123",
      npsScore: "-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects NPS score above 10", () => {
    const result = createRecommendationSchema.safeParse({
      targetType: "FIRM",
      firmId: "clx123",
      npsScore: "11",
    });
    expect(result.success).toBe(false);
  });

  it("coerces string NPS score to number", () => {
    const result = createRecommendationSchema.safeParse({
      targetType: "FIRM",
      firmId: "clx123",
      npsScore: "7",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.npsScore).toBe(7);
  });

  it("rejects invalid target type", () => {
    const result = createRecommendationSchema.safeParse({
      targetType: "DEPARTMENT",
      firmId: "clx123",
      npsScore: "5",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Internal Rating Schema ────────────────────────────────────────────────

describe("createInternalRatingSchema", () => {
  it("validates a complete rating", () => {
    const result = createInternalRatingSchema.safeParse({
      targetType: "FIRM",
      firmId: "clx123",
      responsiveness: "4",
      quality: "5",
      commercialAwareness: "3",
      value: "4",
      subjectMatterExpertise: "5",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responsiveness).toBe(4);
      expect(result.data.quality).toBe(5);
    }
  });

  it("validates with optional comment", () => {
    const result = createInternalRatingSchema.safeParse({
      targetType: "LAWYER",
      lawyerId: "clx456",
      responsiveness: "3",
      quality: "3",
      commercialAwareness: "3",
      value: "3",
      subjectMatterExpertise: "3",
      comment: "Solid all-round performer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects rating below 1", () => {
    const result = createInternalRatingSchema.safeParse({
      targetType: "FIRM",
      firmId: "clx123",
      responsiveness: "0",
      quality: "3",
      commercialAwareness: "3",
      value: "3",
      subjectMatterExpertise: "3",
    });
    expect(result.success).toBe(false);
  });

  it("rejects rating above 5", () => {
    const result = createInternalRatingSchema.safeParse({
      targetType: "FIRM",
      firmId: "clx123",
      responsiveness: "6",
      quality: "3",
      commercialAwareness: "3",
      value: "3",
      subjectMatterExpertise: "3",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Note Schema ────────────────────────────────────────────────────────────

describe("createNoteSchema", () => {
  it("validates a minimal note", () => {
    const result = createNoteSchema.safeParse({
      targetType: "FIRM",
      firmId: "clx123",
      content: "Met with partner team last week. Good chemistry.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPinned).toBe(false);
    }
  });

  it("validates a pinned note", () => {
    const result = createNoteSchema.safeParse({
      targetType: "LAWYER",
      lawyerId: "clx456",
      content: "Key contact for IP matters",
      isPinned: "true",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isPinned).toBe(true);
  });

  it("rejects empty content", () => {
    const result = createNoteSchema.safeParse({
      targetType: "FIRM",
      firmId: "clx123",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects content over 5000 chars", () => {
    const result = createNoteSchema.safeParse({
      targetType: "FIRM",
      firmId: "clx123",
      content: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

// ─── Engagement Schema ──────────────────────────────────────────────────────

describe("createEngagementSchema", () => {
  it("validates a minimal engagement", () => {
    const result = createEngagementSchema.safeParse({
      firmId: "clx123",
      matterName: "SCG Chemicals JV Dispute",
      matterType: "LITIGATION",
      startDate: "2024-01-15",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.outcome).toBe("ONGOING");
      expect(result.data.matterType).toBe("LITIGATION");
    }
  });

  it("validates a full engagement", () => {
    const result = createEngagementSchema.safeParse({
      firmId: "clx123",
      lawyerId: "clx456",
      matterName: "Cross-border M&A Advisory",
      matterType: "TRANSACTIONAL",
      jurisdictionId: "jur1",
      entityName: "SCG Packaging",
      startDate: "2023-06-01",
      endDate: "2024-03-15",
      outcome: "COMPLETED",
      totalFeesUsd: "5000000",
      notes: "Smooth execution, under budget",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalFeesUsd).toBe(5000000);
      expect(result.data.outcome).toBe("COMPLETED");
    }
  });

  it("rejects empty matter name", () => {
    const result = createEngagementSchema.safeParse({
      firmId: "clx123",
      matterName: "",
      matterType: "LITIGATION",
      startDate: "2024-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid matter type", () => {
    const result = createEngagementSchema.safeParse({
      firmId: "clx123",
      matterName: "Test",
      matterType: "CRIMINAL",
      startDate: "2024-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid outcome", () => {
    const result = createEngagementSchema.safeParse({
      firmId: "clx123",
      matterName: "Test",
      matterType: "LITIGATION",
      startDate: "2024-01-15",
      outcome: "ABANDONED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty firmId", () => {
    const result = createEngagementSchema.safeParse({
      firmId: "",
      matterName: "Test",
      matterType: "LITIGATION",
      startDate: "2024-01-15",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Cost Benchmark Schema ──────────────────────────────────────────────────

describe("createCostBenchmarkSchema", () => {
  it("validates a minimal cost benchmark", () => {
    const result = createCostBenchmarkSchema.safeParse({
      firmId: "clx123",
      role: "PARTNER",
      practiceAreaId: "pa1",
      jurisdictionId: "jur1",
      hourlyRateUsd: "85000",
      year: "2024",
      source: "ACTUAL",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hourlyRateUsd).toBe(85000);
      expect(result.data.role).toBe("PARTNER");
      expect(result.data.source).toBe("ACTUAL");
    }
  });

  it("validates with optional blended and fixed fees", () => {
    const result = createCostBenchmarkSchema.safeParse({
      firmId: "clx123",
      role: "ASSOCIATE",
      practiceAreaId: "pa1",
      jurisdictionId: "jur1",
      hourlyRateUsd: "35000",
      blendedRateUsd: "45000",
      fixedFeeUsd: "500000",
      year: "2024",
      source: "PROPOSED",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blendedRateUsd).toBe(45000);
      expect(result.data.fixedFeeUsd).toBe(500000);
    }
  });

  it("rejects invalid role", () => {
    const result = createCostBenchmarkSchema.safeParse({
      firmId: "clx123",
      role: "INTERN",
      practiceAreaId: "pa1",
      jurisdictionId: "jur1",
      hourlyRateUsd: "10000",
      year: "2024",
      source: "ACTUAL",
    });
    expect(result.success).toBe(false);
  });

  it("rejects year before 2000", () => {
    const result = createCostBenchmarkSchema.safeParse({
      firmId: "clx123",
      role: "PARTNER",
      practiceAreaId: "pa1",
      jurisdictionId: "jur1",
      hourlyRateUsd: "85000",
      year: "1999",
      source: "ACTUAL",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative hourly rate", () => {
    const result = createCostBenchmarkSchema.safeParse({
      firmId: "clx123",
      role: "PARTNER",
      practiceAreaId: "pa1",
      jurisdictionId: "jur1",
      hourlyRateUsd: "-100",
      year: "2024",
      source: "ACTUAL",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid source", () => {
    const result = createCostBenchmarkSchema.safeParse({
      firmId: "clx123",
      role: "PARTNER",
      practiceAreaId: "pa1",
      jurisdictionId: "jur1",
      hourlyRateUsd: "85000",
      year: "2024",
      source: "ESTIMATE",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Display Labels ─────────────────────────────────────────────────────────

describe("insight display labels", () => {
  it("has labels for all matter types", () => {
    expect(Object.keys(MATTER_TYPE_LABELS)).toHaveLength(8);
    expect(MATTER_TYPE_LABELS.LITIGATION).toBe("Litigation");
    expect(MATTER_TYPE_LABELS.IP).toBe("Intellectual Property");
  });

  it("has labels for all outcomes", () => {
    expect(Object.keys(OUTCOME_LABELS)).toHaveLength(6);
    expect(OUTCOME_LABELS.WON).toBe("Won");
    expect(OUTCOME_LABELS.ONGOING).toBe("Ongoing");
  });

  it("has labels for all benchmark roles", () => {
    expect(Object.keys(BENCHMARK_ROLE_LABELS)).toHaveLength(4);
    expect(BENCHMARK_ROLE_LABELS.PARTNER).toBe("Partner");
    expect(BENCHMARK_ROLE_LABELS.PARALEGAL).toBe("Paralegal");
  });

  it("has labels for all benchmark sources", () => {
    expect(Object.keys(BENCHMARK_SOURCE_LABELS)).toHaveLength(3);
    expect(BENCHMARK_SOURCE_LABELS.ACTUAL).toBe("Actual");
    expect(BENCHMARK_SOURCE_LABELS.MARKET).toBe("Market");
  });
});
