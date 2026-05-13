import { prisma } from "./db";
import type {
  CreateRankingSourceInput,
  CreateFirmRankingInput,
  CreateLawyerRankingInput,
  RankingFilterInput,
} from "@/lib/schemas";

// ─── Ranking Sources ─────────────────────────────────────────────────────────

export async function listRankingSources() {
  return prisma.rankingSource.findMany({
    orderBy: [{ editionYear: "desc" }, { publisher: "asc" }],
    include: {
      _count: {
        select: { firmRankings: true, lawyerRankings: true },
      },
    },
  });
}

export async function getRankingSourceById(id: string) {
  return prisma.rankingSource.findUnique({
    where: { id },
    include: {
      firmRankings: {
        include: {
          firm: { select: { id: true, name: true, shortName: true } },
          practiceArea: true,
          jurisdiction: true,
        },
        orderBy: [{ band: "asc" }, { tier: "asc" }],
      },
      lawyerRankings: {
        include: {
          lawyer: { select: { id: true, name: true, title: true } },
          practiceArea: true,
          jurisdiction: true,
        },
        orderBy: { category: "asc" },
      },
    },
  });
}

export async function createRankingSource(data: CreateRankingSourceInput) {
  const slug = `${data.publisher.toLowerCase()}-${data.editionYear}`;
  return prisma.rankingSource.create({
    data: {
      name: data.name,
      slug,
      publisher: data.publisher,
      editionYear: data.editionYear,
      url: data.url || null,
    },
  });
}

// ─── Firm Rankings ───────────────────────────────────────────────────────────

export async function createFirmRanking(data: CreateFirmRankingInput) {
  return prisma.firmRanking.create({
    data: {
      firmId: data.firmId,
      rankingSourceId: data.rankingSourceId,
      practiceAreaId: data.practiceAreaId,
      jurisdictionId: data.jurisdictionId,
      band: data.band ?? null,
      tier: data.tier ?? null,
      starRating: data.starRating ?? null,
      editorialExcerpt: data.editorialExcerpt || null,
      url: data.url || null,
    },
  });
}

export async function getFirmRankings(firmId: string) {
  return prisma.firmRanking.findMany({
    where: { firmId },
    include: {
      rankingSource: true,
      practiceArea: true,
      jurisdiction: true,
    },
    orderBy: [
      { rankingSource: { editionYear: "desc" } },
      { rankingSource: { publisher: "asc" } },
    ],
  });
}

export async function deleteFirmRanking(id: string) {
  return prisma.firmRanking.delete({ where: { id } });
}

// ─── Lawyer Rankings ─────────────────────────────────────────────────────────

export async function createLawyerRanking(data: CreateLawyerRankingInput) {
  return prisma.lawyerRanking.create({
    data: {
      lawyerId: data.lawyerId,
      rankingSourceId: data.rankingSourceId,
      practiceAreaId: data.practiceAreaId,
      jurisdictionId: data.jurisdictionId,
      category: data.category,
      editorialExcerpt: data.editorialExcerpt || null,
      url: data.url || null,
    },
  });
}

export async function getLawyerRankings(lawyerId: string) {
  return prisma.lawyerRanking.findMany({
    where: { lawyerId },
    include: {
      rankingSource: true,
      practiceArea: true,
      jurisdiction: true,
    },
    orderBy: [
      { rankingSource: { editionYear: "desc" } },
      { rankingSource: { publisher: "asc" } },
    ],
  });
}

export async function deleteLawyerRanking(id: string) {
  return prisma.lawyerRanking.delete({ where: { id } });
}

// ─── Leaderboard / Aggregated Rankings ───────────────────────────────────────

export async function getRankedFirms(filters: RankingFilterInput) {
  const where: Record<string, unknown> = {};

  if (filters.practiceAreaId) {
    where.practiceAreaId = filters.practiceAreaId;
  }
  if (filters.jurisdictionId) {
    where.jurisdictionId = filters.jurisdictionId;
  }
  if (filters.publisher) {
    where.rankingSource = { publisher: filters.publisher };
  }
  if (filters.editionYear) {
    where.rankingSource = {
      ...((where.rankingSource as Record<string, unknown>) ?? {}),
      editionYear: filters.editionYear,
    };
  }

  return prisma.firmRanking.findMany({
    where,
    include: {
      firm: { select: { id: true, name: true, shortName: true, firmType: true, country: true, city: true } },
      rankingSource: true,
      practiceArea: true,
      jurisdiction: true,
    },
    orderBy: [
      { band: "asc" },
      { tier: "asc" },
      { starRating: "desc" },
    ],
  });
}

export async function getRankedLawyers(filters: RankingFilterInput) {
  const where: Record<string, unknown> = {};

  if (filters.practiceAreaId) {
    where.practiceAreaId = filters.practiceAreaId;
  }
  if (filters.jurisdictionId) {
    where.jurisdictionId = filters.jurisdictionId;
  }
  if (filters.publisher) {
    where.rankingSource = { publisher: filters.publisher };
  }
  if (filters.editionYear) {
    where.rankingSource = {
      ...((where.rankingSource as Record<string, unknown>) ?? {}),
      editionYear: filters.editionYear,
    };
  }

  return prisma.lawyerRanking.findMany({
    where,
    include: {
      lawyer: {
        select: {
          id: true,
          name: true,
          title: true,
          firmLawyers: {
            where: { isCurrent: true },
            include: { firm: { select: { id: true, name: true, shortName: true } } },
            take: 1,
          },
        },
      },
      rankingSource: true,
      practiceArea: true,
      jurisdiction: true,
    },
    orderBy: { category: "asc" },
  });
}

export async function getAvailableEditionYears() {
  const sources = await prisma.rankingSource.findMany({
    select: { editionYear: true },
    distinct: ["editionYear"],
    orderBy: { editionYear: "desc" },
  });
  return sources.map((s) => s.editionYear);
}
