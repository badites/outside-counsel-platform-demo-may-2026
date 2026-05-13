#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { prisma } from "./db.js";

// ─── NPS helper ─────────────────────────────────────────────────────────────

function computeNps(scores: number[]) {
  if (scores.length === 0)
    return { score: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  const passives = scores.length - promoters - detractors;
  const score = Math.round(((promoters - detractors) / scores.length) * 100);
  return { score, promoters, passives, detractors, total: scores.length };
}

// ─── Server setup ───────────────────────────────────────────────────────────

const server = new McpServer({
  name: "counsel-directory",
  version: "1.0.0",
});

// ─── Resources ──────────────────────────────────────────────────────────────

server.resource("practice-areas", "directory://practice-areas", async () => {
  const areas = await prisma.practiceArea.findMany({ orderBy: { name: "asc" } });
  return {
    contents: [
      {
        uri: "directory://practice-areas",
        mimeType: "application/json",
        text: JSON.stringify(
          areas.map((a) => ({ id: a.id, name: a.name, slug: a.slug })),
          null,
          2
        ),
      },
    ],
  };
});

server.resource("jurisdictions", "directory://jurisdictions", async () => {
  const jurisdictions = await prisma.jurisdiction.findMany({
    orderBy: { name: "asc" },
  });
  return {
    contents: [
      {
        uri: "directory://jurisdictions",
        mimeType: "application/json",
        text: JSON.stringify(
          jurisdictions.map((j) => ({
            id: j.id,
            name: j.name,
            country: j.country,
            region: j.region,
          })),
          null,
          2
        ),
      },
    ],
  };
});

server.resource("firms", "directory://firms", async () => {
  const firms = await prisma.firm.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, shortName: true, firmType: true, country: true, city: true },
  });
  return {
    contents: [
      {
        uri: "directory://firms",
        mimeType: "application/json",
        text: JSON.stringify(firms, null, 2),
      },
    ],
  };
});

// ─── Tools ──────────────────────────────────────────────────────────────────

server.tool(
  "search_firms",
  "Search for law firms by name, practice area, jurisdiction, type, or minimum NPS score",
  {
    query: z.string().optional().describe("Search by firm name"),
    practiceArea: z.string().optional().describe("Filter by practice area name or slug"),
    jurisdiction: z.string().optional().describe("Filter by jurisdiction name"),
    firmType: z.enum(["FULL_SERVICE", "BOUTIQUE", "MID_SIZE", "REGIONAL"]).optional().describe("Filter by firm type"),
    minNps: z.number().int().min(-100).max(100).optional().describe("Minimum NPS score"),
    limit: z.number().int().min(1).max(50).default(10).describe("Max results"),
  },
  async ({ query, practiceArea, jurisdiction, firmType, minNps, limit }) => {
    const where: Record<string, unknown> = { isActive: true, deletedAt: null };

    if (query) {
      where.OR = [
        { name: { contains: query } },
        { shortName: { contains: query } },
      ];
    }
    if (firmType) where.firmType = firmType;
    if (practiceArea) {
      where.practiceAreas = {
        some: {
          practiceArea: {
            OR: [
              { name: { contains: practiceArea } },
              { slug: { contains: practiceArea } },
            ],
          },
        },
      };
    }
    if (jurisdiction) {
      where.rankings = { some: { jurisdiction: { name: { contains: jurisdiction } } } };
    }

    const firms = await prisma.firm.findMany({
      where,
      include: {
        recommendations: {
          where: { targetType: "FIRM" },
          select: { npsScore: true },
        },
        rankings: { select: { id: true } },
        practiceAreas: {
          include: { practiceArea: { select: { name: true } } },
        },
      },
      take: limit + 10, // fetch extra for NPS filtering
      orderBy: { name: "asc" },
    });

    let results = firms.map((f) => {
      const nps = computeNps(f.recommendations.map((r) => r.npsScore));
      return {
        id: f.id,
        name: f.name,
        shortName: f.shortName,
        firmType: f.firmType,
        country: f.country,
        city: f.city,
        nps: nps.total > 0 ? nps : null,
        rankingCount: f.rankings.length,
        practiceAreas: [...new Set(f.practiceAreas.map((p) => p.practiceArea.name))],
      };
    });

    if (minNps != null) {
      results = results.filter((r) => r.nps && r.nps.score >= minNps);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(results.slice(0, limit), null, 2),
        },
      ],
    };
  }
);

server.tool(
  "search_lawyers",
  "Search for lawyers by name, firm, practice area, jurisdiction, role, or minimum NPS score",
  {
    query: z.string().optional().describe("Search by lawyer name"),
    firm: z.string().optional().describe("Filter by firm name"),
    practiceArea: z.string().optional().describe("Filter by practice area name or slug"),
    jurisdiction: z.string().optional().describe("Filter by jurisdiction name"),
    role: z.enum(["PARTNER", "OF_COUNSEL", "ASSOCIATE", "COUNSEL", "OTHER"]).optional().describe("Filter by role"),
    minNps: z.number().int().min(-100).max(100).optional().describe("Minimum NPS score"),
    limit: z.number().int().min(1).max(50).default(10).describe("Max results"),
  },
  async ({ query, firm, practiceArea, jurisdiction, role, minNps, limit }) => {
    const where: Record<string, unknown> = { isActive: true, deletedAt: null };

    if (query) where.name = { contains: query };
    if (firm) {
      where.firmLawyers = {
        some: {
          isCurrent: true,
          firm: {
            OR: [
              { name: { contains: firm } },
              { shortName: { contains: firm } },
            ],
          },
        },
      };
    }
    if (role) {
      where.firmLawyers = {
        ...((where.firmLawyers as object) ?? {}),
        some: { ...((where.firmLawyers as { some?: object })?.some ?? {}), role },
      };
    }
    if (practiceArea) {
      where.practiceAreas = {
        some: {
          practiceArea: {
            OR: [
              { name: { contains: practiceArea } },
              { slug: { contains: practiceArea } },
            ],
          },
        },
      };
    }

    const lawyers = await prisma.lawyer.findMany({
      where,
      include: {
        firmLawyers: {
          where: { isCurrent: true },
          include: { firm: { select: { id: true, name: true, shortName: true } } },
          take: 1,
        },
        recommendations: {
          where: { targetType: "LAWYER" },
          select: { npsScore: true },
        },
        rankings: { select: { category: true } },
        practiceAreas: {
          include: { practiceArea: { select: { name: true } } },
        },
      },
      take: limit + 10,
      orderBy: { name: "asc" },
    });

    let results = lawyers.map((l) => {
      const nps = computeNps(l.recommendations.map((r) => r.npsScore));
      return {
        id: l.id,
        name: l.name,
        title: l.title,
        currentFirm: l.firmLawyers[0]?.firm ?? null,
        nps: nps.total > 0 ? nps : null,
        rankingCategories: l.rankings.map((r) => r.category),
        practiceAreas: [...new Set(l.practiceAreas.map((p) => p.practiceArea.name))],
      };
    });

    if (minNps != null) {
      results = results.filter((r) => r.nps && r.nps.score >= minNps);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(results.slice(0, limit), null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_firm_profile",
  "Get a comprehensive firm profile including rankings, NPS, ratings, engagements, and cost benchmarks",
  {
    firmId: z.string().describe("The firm ID"),
  },
  async ({ firmId }) => {
    const firm = await prisma.firm.findUnique({
      where: { id: firmId },
      include: {
        parentFirm: { select: { id: true, name: true } },
        spinOffs: { select: { id: true, name: true, firmType: true } },
        firmLawyers: {
          where: { isCurrent: true },
          include: { lawyer: { select: { id: true, name: true, title: true } } },
          orderBy: { role: "asc" },
        },
        practiceAreas: {
          include: {
            practiceArea: { select: { name: true } },
            jurisdiction: { select: { name: true } },
          },
        },
        rankings: {
          include: {
            rankingSource: true,
            practiceArea: { select: { name: true } },
            jurisdiction: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        recommendations: {
          where: { targetType: "FIRM" },
          include: {
            recommender: { select: { name: true } },
            practiceArea: { select: { name: true } },
          },
        },
        internalRatings: {
          where: { targetType: "FIRM" },
          include: { ratedBy: { select: { name: true } } },
        },
        engagements: {
          where: { deletedAt: null },
          include: {
            lawyer: { select: { name: true } },
            jurisdiction: { select: { name: true } },
          },
          orderBy: { startDate: "desc" },
        },
        costBenchmarks: {
          include: {
            practiceArea: { select: { name: true } },
            jurisdiction: { select: { name: true } },
          },
        },
        relationshipNotes: {
          where: { targetType: "FIRM", deletedAt: null },
          include: { author: { select: { name: true } } },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!firm || firm.deletedAt) {
      return { content: [{ type: "text" as const, text: "Firm not found" }] };
    }

    const nps = computeNps(firm.recommendations.map((r) => r.npsScore));

    const profile = {
      id: firm.id,
      name: firm.name,
      shortName: firm.shortName,
      firmType: firm.firmType,
      country: firm.country,
      city: firm.city,
      website: firm.website,
      headcount: firm.headcount,
      foundedYear: firm.foundedYear,
      parentFirm: firm.parentFirm,
      spinOffs: firm.spinOffs,
      nps,
      currentLawyers: firm.firmLawyers.map((fl) => ({
        ...fl.lawyer,
        role: fl.role,
      })),
      practiceAreas: firm.practiceAreas.map((fpa) => ({
        name: fpa.practiceArea.name,
        jurisdiction: fpa.jurisdiction?.name,
      })),
      rankings: firm.rankings.map((r) => ({
        source: `${r.rankingSource.publisher} ${r.rankingSource.editionYear}`,
        practiceArea: r.practiceArea.name,
        jurisdiction: r.jurisdiction.name,
        band: r.band,
        tier: r.tier,
        starRating: r.starRating,
      })),
      internalRatings: firm.internalRatings.map((ir) => ({
        ratedBy: ir.ratedBy.name,
        responsiveness: ir.responsiveness,
        quality: ir.quality,
        commercialAwareness: ir.commercialAwareness,
        value: ir.value,
        subjectMatterExpertise: ir.subjectMatterExpertise,
        overallScore: ir.overallScore,
        comment: ir.comment,
      })),
      engagements: firm.engagements.map((e) => ({
        matterName: e.matterName,
        matterType: e.matterType,
        lawyer: e.lawyer?.name,
        jurisdiction: e.jurisdiction?.name,
        startDate: e.startDate,
        endDate: e.endDate,
        outcome: e.outcome,
        totalFeesUsd: e.totalFeesUsd ? e.totalFeesUsd / 100 : null,
      })),
      costBenchmarks: firm.costBenchmarks.map((cb) => ({
        role: cb.role,
        practiceArea: cb.practiceArea.name,
        jurisdiction: cb.jurisdiction.name,
        hourlyRateUsd: cb.hourlyRateUsd / 100,
        blendedRateUsd: cb.blendedRateUsd ? cb.blendedRateUsd / 100 : null,
        year: cb.year,
        source: cb.source,
      })),
      notes: firm.relationshipNotes.map((n) => ({
        content: n.content,
        author: n.author.name,
        isPinned: n.isPinned,
        date: n.createdAt,
      })),
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(profile, null, 2) }],
    };
  }
);

server.tool(
  "get_lawyer_profile",
  "Get a comprehensive lawyer profile including career history, rankings, NPS, ratings, and engagements",
  {
    lawyerId: z.string().describe("The lawyer ID"),
  },
  async ({ lawyerId }) => {
    const lawyer = await prisma.lawyer.findUnique({
      where: { id: lawyerId },
      include: {
        firmLawyers: {
          include: { firm: { select: { id: true, name: true, shortName: true, firmType: true } } },
          orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
        },
        practiceAreas: {
          include: {
            practiceArea: { select: { name: true } },
            jurisdiction: { select: { name: true } },
          },
        },
        rankings: {
          include: {
            rankingSource: true,
            practiceArea: { select: { name: true } },
            jurisdiction: { select: { name: true } },
          },
        },
        recommendations: {
          where: { targetType: "LAWYER" },
          include: {
            recommender: { select: { name: true } },
            practiceArea: { select: { name: true } },
          },
        },
        internalRatings: {
          where: { targetType: "LAWYER" },
          include: { ratedBy: { select: { name: true } } },
        },
        engagements: {
          where: { deletedAt: null },
          include: {
            firm: { select: { name: true, shortName: true } },
            jurisdiction: { select: { name: true } },
          },
          orderBy: { startDate: "desc" },
        },
        relationshipNotes: {
          where: { targetType: "LAWYER", deletedAt: null },
          include: { author: { select: { name: true } } },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!lawyer || lawyer.deletedAt) {
      return { content: [{ type: "text" as const, text: "Lawyer not found" }] };
    }

    const nps = computeNps(lawyer.recommendations.map((r) => r.npsScore));

    const profile = {
      id: lawyer.id,
      name: lawyer.name,
      title: lawyer.title,
      email: lawyer.email,
      qualificationYear: lawyer.qualificationYear,
      barAdmissions: lawyer.barAdmissions,
      bio: lawyer.bio,
      nps,
      careerHistory: lawyer.firmLawyers.map((fl) => ({
        firm: fl.firm,
        role: fl.role,
        isCurrent: fl.isCurrent,
        startDate: fl.startDate,
        endDate: fl.endDate,
      })),
      practiceAreas: lawyer.practiceAreas.map((lpa) => ({
        name: lpa.practiceArea.name,
        jurisdiction: lpa.jurisdiction?.name,
      })),
      rankings: lawyer.rankings.map((r) => ({
        source: `${r.rankingSource.publisher} ${r.rankingSource.editionYear}`,
        practiceArea: r.practiceArea.name,
        jurisdiction: r.jurisdiction.name,
        category: r.category,
      })),
      internalRatings: lawyer.internalRatings.map((ir) => ({
        ratedBy: ir.ratedBy.name,
        responsiveness: ir.responsiveness,
        quality: ir.quality,
        commercialAwareness: ir.commercialAwareness,
        value: ir.value,
        subjectMatterExpertise: ir.subjectMatterExpertise,
        overallScore: ir.overallScore,
        comment: ir.comment,
      })),
      engagements: lawyer.engagements.map((e) => ({
        matterName: e.matterName,
        matterType: e.matterType,
        firm: e.firm.shortName ?? e.firm.name,
        jurisdiction: e.jurisdiction?.name,
        startDate: e.startDate,
        endDate: e.endDate,
        outcome: e.outcome,
        totalFeesUsd: e.totalFeesUsd ? e.totalFeesUsd / 100 : null,
      })),
      notes: lawyer.relationshipNotes.map((n) => ({
        content: n.content,
        author: n.author.name,
        isPinned: n.isPinned,
        date: n.createdAt,
      })),
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(profile, null, 2) }],
    };
  }
);

server.tool(
  "compare_firms",
  "Side-by-side comparison of 2-5 firms on rankings, NPS, internal ratings, and cost",
  {
    firmIds: z.array(z.string()).min(2).max(5).describe("Array of 2-5 firm IDs to compare"),
  },
  async ({ firmIds }) => {
    const firms = await prisma.firm.findMany({
      where: { id: { in: firmIds } },
      include: {
        rankings: { select: { band: true, tier: true, starRating: true } },
        recommendations: {
          where: { targetType: "FIRM" },
          select: { npsScore: true },
        },
        internalRatings: {
          where: { targetType: "FIRM" },
          select: {
            responsiveness: true,
            quality: true,
            commercialAwareness: true,
            value: true,
            subjectMatterExpertise: true,
          },
        },
        engagements: {
          where: { deletedAt: null },
          select: { totalFeesUsd: true },
        },
        costBenchmarks: {
          select: { hourlyRateUsd: true, role: true },
        },
      },
    });

    const comparison = firms.map((f) => {
      const nps = computeNps(f.recommendations.map((r) => r.npsScore));

      const avgRating = (key: "responsiveness" | "quality" | "commercialAwareness" | "value" | "subjectMatterExpertise") =>
        f.internalRatings.length > 0
          ? Math.round(
              (f.internalRatings.reduce((s, r) => s + r[key], 0) /
                f.internalRatings.length) *
                10
            ) / 10
          : null;

      const bands = f.rankings.filter((r) => r.band != null).map((r) => r.band!);
      const tiers = f.rankings.filter((r) => r.tier != null).map((r) => r.tier!);

      const totalFees = f.engagements.reduce((s, e) => s + (e.totalFeesUsd ?? 0), 0);

      const partnerRates = f.costBenchmarks
        .filter((cb) => cb.role === "PARTNER")
        .map((cb) => cb.hourlyRateUsd / 100);

      return {
        id: f.id,
        name: f.name,
        firmType: f.firmType,
        nps: nps.total > 0 ? nps : null,
        bestBand: bands.length > 0 ? Math.min(...bands) : null,
        bestTier: tiers.length > 0 ? Math.min(...tiers) : null,
        rankingCount: f.rankings.length,
        avgResponsiveness: avgRating("responsiveness"),
        avgQuality: avgRating("quality"),
        avgCommercialAwareness: avgRating("commercialAwareness"),
        avgValue: avgRating("value"),
        avgSubjectExpertise: avgRating("subjectMatterExpertise"),
        engagementCount: f.engagements.length,
        totalFeesUsd: totalFees > 0 ? totalFees / 100 : null,
        avgPartnerHourlyRate:
          partnerRates.length > 0
            ? Math.round(partnerRates.reduce((a, b) => a + b, 0) / partnerRates.length)
            : null,
      };
    });

    return {
      content: [{ type: "text" as const, text: JSON.stringify(comparison, null, 2) }],
    };
  }
);

server.tool(
  "find_alumni",
  "Find lawyers who left a specific firm and where they went",
  {
    firmId: z.string().describe("The firm ID to search alumni from"),
  },
  async ({ firmId }) => {
    const pastLawyers = await prisma.firmLawyer.findMany({
      where: { firmId, isCurrent: false },
      include: {
        lawyer: {
          include: {
            firmLawyers: {
              where: { isCurrent: true },
              include: {
                firm: { select: { id: true, name: true, shortName: true, firmType: true } },
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { endDate: "desc" },
    });

    const firm = await prisma.firm.findUnique({
      where: { id: firmId },
      select: { name: true },
    });

    const alumni = pastLawyers.map((fl) => ({
      id: fl.lawyer.id,
      name: fl.lawyer.name,
      title: fl.lawyer.title,
      formerRole: fl.role,
      startDate: fl.startDate,
      endDate: fl.endDate,
      currentFirm: fl.lawyer.firmLawyers[0]?.firm ?? null,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              firm: firm?.name ?? "Unknown",
              alumniCount: alumni.length,
              alumni,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "get_recommendations",
  "Get personalized firm or lawyer recommendations based on practice area and jurisdiction",
  {
    type: z.enum(["firms", "lawyers"]).describe("Search firms or lawyers"),
    practiceArea: z.string().optional().describe("Practice area to focus on"),
    jurisdiction: z.string().optional().describe("Jurisdiction to focus on"),
    limit: z.number().int().min(1).max(20).default(5).describe("Max results"),
  },
  async ({ type, practiceArea, jurisdiction, limit }) => {
    if (type === "firms") {
      const where: Record<string, unknown> = { isActive: true, deletedAt: null };

      if (practiceArea) {
        where.practiceAreas = {
          some: {
            practiceArea: {
              OR: [
                { name: { contains: practiceArea } },
                { slug: { contains: practiceArea } },
              ],
            },
          },
        };
      }

      const firms = await prisma.firm.findMany({
        where,
        include: {
          recommendations: {
            where: { targetType: "FIRM" },
            select: { npsScore: true },
          },
          internalRatings: {
            where: { targetType: "FIRM" },
            select: { overallScore: true },
          },
          rankings: { select: { band: true, tier: true, starRating: true } },
          practiceAreas: {
            include: { practiceArea: { select: { name: true } } },
          },
        },
      });

      // Score and rank
      const scored = firms
        .map((f) => {
          const nps = computeNps(f.recommendations.map((r) => r.npsScore));
          const avgInternal =
            f.internalRatings.length > 0
              ? f.internalRatings.reduce((s, r) => s + r.overallScore, 0) /
                f.internalRatings.length
              : 0;
          const rankScore =
            f.rankings.length > 0
              ? f.rankings.reduce((s, r) => {
                  if (r.band) return s + (7 - r.band) * 15;
                  if (r.tier) return s + (6 - r.tier) * 15;
                  if (r.starRating) return s + r.starRating * 15;
                  return s;
                }, 0) / f.rankings.length
              : 0;

          const compositeScore = avgInternal * 20 + (nps.total > 0 ? (nps.score + 100) / 4 : 0) + rankScore;

          return {
            id: f.id,
            name: f.name,
            shortName: f.shortName,
            firmType: f.firmType,
            nps: nps.total > 0 ? nps : null,
            compositeScore: Math.round(compositeScore),
            practiceAreas: [...new Set(f.practiceAreas.map((p) => p.practiceArea.name))],
            reason: buildReason(f.name, nps, avgInternal, f.rankings.length),
          };
        })
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, limit);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(scored, null, 2) }],
      };
    } else {
      // Lawyers
      const where: Record<string, unknown> = { isActive: true, deletedAt: null };

      if (practiceArea) {
        where.practiceAreas = {
          some: {
            practiceArea: {
              OR: [
                { name: { contains: practiceArea } },
                { slug: { contains: practiceArea } },
              ],
            },
          },
        };
      }

      const lawyers = await prisma.lawyer.findMany({
        where,
        include: {
          firmLawyers: {
            where: { isCurrent: true },
            include: { firm: { select: { name: true, shortName: true } } },
            take: 1,
          },
          recommendations: {
            where: { targetType: "LAWYER" },
            select: { npsScore: true },
          },
          internalRatings: {
            where: { targetType: "LAWYER" },
            select: { overallScore: true },
          },
          rankings: { select: { category: true } },
          practiceAreas: {
            include: { practiceArea: { select: { name: true } } },
          },
        },
      });

      const catScore: Record<string, number> = {
        STAR: 100,
        LEADING: 85,
        RECOMMENDED: 65,
        UP_AND_COMING: 50,
        RECOGNISED: 40,
      };

      const scored = lawyers
        .map((l) => {
          const nps = computeNps(l.recommendations.map((r) => r.npsScore));
          const avgInternal =
            l.internalRatings.length > 0
              ? l.internalRatings.reduce((s, r) => s + r.overallScore, 0) /
                l.internalRatings.length
              : 0;
          const rankScore =
            l.rankings.length > 0
              ? l.rankings.reduce((s, r) => s + (catScore[r.category] ?? 30), 0) /
                l.rankings.length
              : 0;

          const compositeScore = avgInternal * 20 + (nps.total > 0 ? (nps.score + 100) / 4 : 0) + rankScore;

          return {
            id: l.id,
            name: l.name,
            title: l.title,
            currentFirm: l.firmLawyers[0]?.firm
              ? l.firmLawyers[0].firm.shortName ?? l.firmLawyers[0].firm.name
              : null,
            nps: nps.total > 0 ? nps : null,
            compositeScore: Math.round(compositeScore),
            practiceAreas: [...new Set(l.practiceAreas.map((p) => p.practiceArea.name))],
          };
        })
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, limit);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(scored, null, 2) }],
      };
    }
  }
);

function buildReason(
  name: string,
  nps: { score: number; total: number },
  avgInternal: number,
  rankingCount: number
): string {
  const parts: string[] = [];
  if (nps.total > 0 && nps.score > 50)
    parts.push(`strong peer sentiment (NPS +${nps.score})`);
  if (avgInternal >= 4) parts.push("highly rated internally");
  if (rankingCount >= 3) parts.push(`well-ranked externally (${rankingCount} rankings)`);
  if (parts.length === 0) return `${name} is in the directory`;
  return `${name}: ${parts.join(", ")}`;
}

// ─── Start ──────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Counsel Directory MCP server running on stdio");
}

main().catch((err) => {
  console.error("Failed to start MCP server:", err);
  process.exit(1);
});
