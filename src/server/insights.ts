import { prisma } from "./db";

// ─── NPS Helpers ─────────────────────────────────────────────────────────────

export type NpsAggregation = {
  score: number; // -100 to +100
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
};

export function computeNps(scores: number[]): NpsAggregation {
  if (scores.length === 0) {
    return { score: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };
  }
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  const passives = scores.length - promoters - detractors;
  const score = Math.round(
    ((promoters - detractors) / scores.length) * 100
  );
  return { score, promoters, passives, detractors, total: scores.length };
}

// ─── Firm Insights ───────────────────────────────────────────────────────────

export async function getFirmNps(firmId: string): Promise<NpsAggregation> {
  const recs = await prisma.recommendation.findMany({
    where: { firmId, targetType: "FIRM" },
    select: { npsScore: true },
  });
  return computeNps(recs.map((r) => r.npsScore));
}

export async function getFirmInternalRatings(firmId: string) {
  return prisma.internalRating.findMany({
    where: { firmId, targetType: "FIRM" },
    include: { ratedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFirmRecommendations(firmId: string) {
  return prisma.recommendation.findMany({
    where: { firmId, targetType: "FIRM" },
    include: {
      recommender: { select: { name: true } },
      practiceArea: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFirmEngagements(firmId: string) {
  return prisma.engagement.findMany({
    where: { firmId, deletedAt: null },
    include: {
      lawyer: { select: { id: true, name: true } },
      jurisdiction: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export async function getFirmNotes(firmId: string) {
  return prisma.relationshipNote.findMany({
    where: { firmId, targetType: "FIRM", deletedAt: null },
    include: { author: { select: { name: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
}

// ─── Lawyer Insights ─────────────────────────────────────────────────────────

export async function getLawyerNps(lawyerId: string): Promise<NpsAggregation> {
  const recs = await prisma.recommendation.findMany({
    where: { lawyerId, targetType: "LAWYER" },
    select: { npsScore: true },
  });
  return computeNps(recs.map((r) => r.npsScore));
}

export async function getLawyerInternalRatings(lawyerId: string) {
  return prisma.internalRating.findMany({
    where: { lawyerId, targetType: "LAWYER" },
    include: { ratedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLawyerRecommendations(lawyerId: string) {
  return prisma.recommendation.findMany({
    where: { lawyerId, targetType: "LAWYER" },
    include: {
      recommender: { select: { name: true } },
      practiceArea: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLawyerEngagements(lawyerId: string) {
  return prisma.engagement.findMany({
    where: { lawyerId, deletedAt: null },
    include: {
      firm: { select: { id: true, name: true, shortName: true } },
      jurisdiction: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export async function getLawyerNotes(lawyerId: string) {
  return prisma.relationshipNote.findMany({
    where: { lawyerId, targetType: "LAWYER", deletedAt: null },
    include: { author: { select: { name: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
}

// ─── Engagements list (for /engagements page) ────────────────────────────────

export async function listEngagements() {
  return prisma.engagement.findMany({
    where: { deletedAt: null },
    include: {
      firm: { select: { id: true, name: true, shortName: true } },
      lawyer: { select: { id: true, name: true } },
      jurisdiction: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

// ─── Cost Benchmarks ──────────────────────────────────────────────────────

export async function getFirmCostBenchmarks(firmId: string) {
  return prisma.costBenchmark.findMany({
    where: { firmId },
    include: {
      practiceArea: { select: { id: true, name: true } },
      jurisdiction: { select: { id: true, name: true } },
      lawyer: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: [{ year: "desc" }, { role: "asc" }],
  });
}
