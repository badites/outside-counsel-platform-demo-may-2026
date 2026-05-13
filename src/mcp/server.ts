#!/usr/bin/env node
/**
 * MCP Server for the Outside Counsel Directory.
 *
 * Exposes directory search and profile tools for Claude Desktop / Claude Code.
 * Run: npx tsx src/mcp/server.ts
 *
 * Or configure in Claude Desktop:
 * {
 *   "mcpServers": {
 *     "counsel-directory": {
 *       "command": "npx",
 *       "args": ["tsx", "src/mcp/server.ts"],
 *       "cwd": "/path/to/counsel-directory"
 *     }
 *   }
 * }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { prisma } from "../server/db";
import { computeNps } from "../server/insights";
import { scoreFirms, scoreLawyers } from "../server/scoring";
import type { UserWeights } from "../server/preferences";

// ─── Default weights (used when no user context) ────────────────────────────

const DEFAULT_WEIGHTS: UserWeights = {
  weightResponsiveness: 1.0,
  weightQuality: 1.0,
  weightCommercialAwareness: 1.0,
  weightValue: 1.0,
  weightSubjectMatterExpertise: 1.0,
  weightNps: 1.0,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function resolvePracticeAreaId(name: string): Promise<string | undefined> {
  if (!name) return undefined;
  const pa = await prisma.practiceArea.findFirst({
    where: { name: { contains: name } },
    select: { id: true },
  });
  return pa?.id;
}

async function resolveJurisdictionId(name: string): Promise<string | undefined> {
  if (!name) return undefined;
  const j = await prisma.jurisdiction.findFirst({
    where: { name: { contains: name } },
    select: { id: true },
  });
  return j?.id;
}

// ─── Server setup ───────────────────────────────────────────────────────────

const server = new McpServer({
  name: "counsel-directory",
  version: "1.0.0",
});

// ─── Tools ──────────────────────────────────────────────────────────────────

server.tool(
  "search_firms",
  "Search for law firms in the directory. Returns firms ranked by composite fit score (internal ratings, NPS sentiment, external rankings).",
  {
    search: z.string().optional().describe("Free-text search by firm name"),
    practiceArea: z.string().optional().describe("Practice area (e.g. 'M&A', 'Litigation', 'Banking & Finance')"),
    jurisdiction: z.string().optional().describe("Jurisdiction (e.g. 'Thailand', 'Singapore', 'Hong Kong')"),
    firmType: z.enum(["FULL_SERVICE", "BOUTIQUE", "MID_SIZE", "REGIONAL"]).optional().describe("Filter by firm type"),
    minNps: z.number().optional().describe("Minimum NPS score (-100 to 100)"),
  },
  async (args) => {
    const practiceAreaId = args.practiceArea
      ? await resolvePracticeAreaId(args.practiceArea)
      : undefined;
    const jurisdictionId = args.jurisdiction
      ? await resolveJurisdictionId(args.jurisdiction)
      : undefined;

    const firms = await scoreFirms(DEFAULT_WEIGHTS, {
      search: args.search,
      practiceAreaId,
      jurisdictionId,
      firmType: args.firmType,
      minNps: args.minNps,
    });

    const results = firms.slice(0, 10).map((f) => ({
      id: f.id,
      name: f.name,
      shortName: f.shortName,
      country: f.country,
      city: f.city,
      firmType: f.firmType,
      compositeScore: f.compositeScore,
      nps: f.nps,
      avgRating: f.avgRating,
      rankingCount: f.rankingCount,
      bestBand: f.bestBand,
      bestTier: f.bestTier,
      engagementCount: f.engagementCount,
      practiceAreas: f.practiceAreas,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "search_lawyers",
  "Search for individual lawyers in the directory. Returns lawyers ranked by composite fit score.",
  {
    search: z.string().optional().describe("Free-text search by lawyer name"),
    practiceArea: z.string().optional().describe("Practice area to filter by"),
    jurisdiction: z.string().optional().describe("Jurisdiction to filter by"),
  },
  async (args) => {
    const practiceAreaId = args.practiceArea
      ? await resolvePracticeAreaId(args.practiceArea)
      : undefined;
    const jurisdictionId = args.jurisdiction
      ? await resolveJurisdictionId(args.jurisdiction)
      : undefined;

    const lawyers = await scoreLawyers(DEFAULT_WEIGHTS, {
      search: args.search,
      practiceAreaId,
      jurisdictionId,
    });

    const results = lawyers.slice(0, 10).map((l) => ({
      id: l.id,
      name: l.name,
      title: l.title,
      currentFirm: l.currentFirm,
      compositeScore: l.compositeScore,
      nps: l.nps,
      avgRating: l.avgRating,
      rankingCount: l.rankingCount,
      bestCategory: l.bestCategory,
      practiceAreas: l.practiceAreas,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_firm_profile",
  "Get detailed profile of a specific firm including rankings, NPS, ratings, lawyers, engagements, and cost benchmarks.",
  {
    firmId: z.string().describe("The firm ID to look up"),
  },
  async ({ firmId }) => {
    const firm = await prisma.firm.findUnique({
      where: { id: firmId },
      include: {
        firmLawyers: {
          where: { isCurrent: true },
          include: { lawyer: { select: { id: true, name: true, title: true } } },
        },
        practiceAreas: {
          include: { practiceArea: true, jurisdiction: true },
        },
        rankings: {
          include: { rankingSource: true, practiceArea: true },
          orderBy: { rankingSource: { editionYear: "desc" } },
        },
        recommendations: { where: { targetType: "FIRM" }, select: { npsScore: true } },
        internalRatings: { where: { targetType: "FIRM" } },
        engagements: {
          where: { deletedAt: null },
          orderBy: { startDate: "desc" },
          take: 5,
          include: { lawyer: { select: { name: true } } },
        },
        costBenchmarks: {
          orderBy: { year: "desc" },
          take: 10,
          include: { practiceArea: true, jurisdiction: true },
        },
      },
    });

    if (!firm) {
      return { content: [{ type: "text" as const, text: "Firm not found" }] };
    }

    const nps = computeNps(firm.recommendations.map((r) => r.npsScore));

    const profile = {
      id: firm.id,
      name: firm.name,
      shortName: firm.shortName,
      country: firm.country,
      city: firm.city,
      firmType: firm.firmType,
      headcount: firm.headcount,
      foundedYear: firm.foundedYear,
      website: firm.website,
      nps,
      currentLawyers: firm.firmLawyers.map((fl) => ({
        id: fl.lawyer.id,
        name: fl.lawyer.name,
        title: fl.lawyer.title,
        role: fl.role,
      })),
      practiceAreas: firm.practiceAreas.map((pa) => ({
        area: pa.practiceArea.name,
        jurisdiction: pa.jurisdiction?.name,
      })),
      rankings: firm.rankings.map((r) => ({
        publisher: r.rankingSource.publisher,
        year: r.rankingSource.editionYear,
        practiceArea: r.practiceArea.name,
        band: r.band,
        tier: r.tier,
        starRating: r.starRating,
      })),
      recentEngagements: firm.engagements.map((e) => ({
        matter: e.matterName,
        type: e.matterType,
        outcome: e.outcome,
        lawyer: e.lawyer?.name,
        startDate: e.startDate,
      })),
      costBenchmarks: firm.costBenchmarks.map((cb) => ({
        role: cb.role,
        hourlyRate: cb.hourlyRateUsd ? `$${(cb.hourlyRateUsd / 100).toFixed(0)}/hr` : null,
        practiceArea: cb.practiceArea.name,
        year: cb.year,
        source: cb.source,
      })),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(profile, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_lawyer_profile",
  "Get detailed profile of a specific lawyer including career history, rankings, NPS, ratings, and engagements.",
  {
    lawyerId: z.string().describe("The lawyer ID to look up"),
  },
  async ({ lawyerId }) => {
    const lawyer = await prisma.lawyer.findUnique({
      where: { id: lawyerId },
      include: {
        firmLawyers: {
          include: { firm: { select: { id: true, name: true, shortName: true } } },
          orderBy: { startDate: "desc" },
        },
        practiceAreas: {
          include: { practiceArea: true, jurisdiction: true },
        },
        rankings: {
          include: { rankingSource: true, practiceArea: true },
        },
        recommendations: { where: { targetType: "LAWYER" }, select: { npsScore: true } },
        internalRatings: { where: { targetType: "LAWYER" } },
        engagements: {
          where: { deletedAt: null },
          orderBy: { startDate: "desc" },
          take: 5,
          include: { firm: { select: { name: true } } },
        },
      },
    });

    if (!lawyer) {
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
        firmId: fl.firm.id,
        firmName: fl.firm.shortName ?? fl.firm.name,
        role: fl.role,
        isCurrent: fl.isCurrent,
        startDate: fl.startDate,
        endDate: fl.endDate,
      })),
      practiceAreas: lawyer.practiceAreas.map((pa) => ({
        area: pa.practiceArea.name,
        jurisdiction: pa.jurisdiction?.name,
      })),
      rankings: lawyer.rankings.map((r) => ({
        publisher: r.rankingSource.publisher,
        year: r.rankingSource.editionYear,
        practiceArea: r.practiceArea.name,
        category: r.category,
      })),
      recentEngagements: lawyer.engagements.map((e) => ({
        matter: e.matterName,
        type: e.matterType,
        outcome: e.outcome,
        firm: e.firm.name,
        startDate: e.startDate,
      })),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(profile, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "compare_firms",
  "Side-by-side comparison of 2-5 firms on rankings, NPS, internal ratings, and cost.",
  {
    firmIds: z.array(z.string()).min(2).max(5).describe("Array of firm IDs to compare"),
  },
  async ({ firmIds }) => {
    const firms = await Promise.all(
      firmIds.map((id) =>
        prisma.firm.findUnique({
          where: { id },
          include: {
            rankings: { include: { rankingSource: true } },
            recommendations: { where: { targetType: "FIRM" }, select: { npsScore: true } },
            internalRatings: { where: { targetType: "FIRM" } },
            engagements: { where: { deletedAt: null } },
            costBenchmarks: {
              orderBy: { year: "desc" },
              take: 5,
            },
          },
        })
      )
    );

    const comparison = firms
      .filter((f) => f !== null)
      .map((firm) => {
        const nps = computeNps(firm.recommendations.map((r) => r.npsScore));
        const ratings = firm.internalRatings;
        const avgRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + (r.responsiveness + r.quality + r.commercialAwareness + r.value + r.subjectMatterExpertise) / 5, 0) / ratings.length
            : null;
        const bands = firm.rankings.filter((r) => r.band != null).map((r) => r.band!);
        const tiers = firm.rankings.filter((r) => r.tier != null).map((r) => r.tier!);
        const totalFees = firm.engagements.reduce(
          (sum, e) => sum + (e.totalFeesUsd ?? 0),
          0
        );
        const avgHourly = firm.costBenchmarks.length > 0
          ? firm.costBenchmarks.reduce((sum, cb) => sum + cb.hourlyRateUsd, 0) / firm.costBenchmarks.length
          : null;

        return {
          id: firm.id,
          name: firm.name,
          firmType: firm.firmType,
          country: firm.country,
          nps,
          avgInternalRating: avgRating ? Number(avgRating.toFixed(1)) : null,
          bestBand: bands.length > 0 ? Math.min(...bands) : null,
          bestTier: tiers.length > 0 ? Math.min(...tiers) : null,
          totalRankings: firm.rankings.length,
          engagementCount: firm.engagements.length,
          totalFeesUsd: totalFees > 0 ? `$${(totalFees / 100).toLocaleString()}` : null,
          avgHourlyRate: avgHourly ? `$${(avgHourly / 100).toFixed(0)}/hr` : null,
        };
      });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(comparison, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "find_alumni",
  "Find lawyers who left a specific firm and where they went. Useful for tracking boutique spin-offs and lateral moves.",
  {
    firmId: z.string().describe("The firm ID to find alumni from"),
  },
  async ({ firmId }) => {
    const firm = await prisma.firm.findUnique({
      where: { id: firmId },
      select: { name: true, shortName: true },
    });

    if (!firm) {
      return { content: [{ type: "text" as const, text: "Firm not found" }] };
    }

    // Find all lawyers who worked at this firm but are no longer current
    const alumni = await prisma.firmLawyer.findMany({
      where: {
        firmId,
        isCurrent: false,
      },
      include: {
        lawyer: {
          select: {
            id: true,
            name: true,
            title: true,
            firmLawyers: {
              where: { isCurrent: true },
              include: {
                firm: { select: { id: true, name: true, shortName: true, firmType: true } },
              },
            },
          },
        },
      },
    });

    const results = alumni.map((fl) => {
      const currentPosition = fl.lawyer.firmLawyers[0];
      return {
        lawyerId: fl.lawyer.id,
        name: fl.lawyer.name,
        title: fl.lawyer.title,
        formerRole: fl.role,
        leftDate: fl.endDate,
        currentFirm: currentPosition
          ? {
              id: currentPosition.firm.id,
              name: currentPosition.firm.shortName ?? currentPosition.firm.name,
              firmType: currentPosition.firm.firmType,
              role: currentPosition.role,
            }
          : null,
      };
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              firm: firm.shortName ?? firm.name,
              alumniCount: results.length,
              alumni: results,
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
  "Get personalized firm/lawyer recommendations for a practice area and jurisdiction, using composite scoring.",
  {
    practiceArea: z.string().describe("Practice area (e.g. 'M&A', 'Litigation')"),
    jurisdiction: z.string().optional().describe("Jurisdiction (e.g. 'Thailand')"),
    type: z.enum(["firms", "lawyers"]).optional().describe("Search for firms or lawyers (default: firms)"),
    limit: z.number().optional().describe("Max results (default: 5)"),
  },
  async (args) => {
    const practiceAreaId = await resolvePracticeAreaId(args.practiceArea);
    const jurisdictionId = args.jurisdiction
      ? await resolveJurisdictionId(args.jurisdiction)
      : undefined;
    const limit = args.limit ?? 5;

    if (args.type === "lawyers") {
      const lawyers = await scoreLawyers(DEFAULT_WEIGHTS, {
        practiceAreaId,
        jurisdictionId,
      });
      const top = lawyers.slice(0, limit);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                practiceArea: args.practiceArea,
                jurisdiction: args.jurisdiction ?? "any",
                recommendations: top.map((l) => ({
                  id: l.id,
                  name: l.name,
                  firm: l.currentFirm?.name,
                  score: l.compositeScore,
                  nps: l.nps,
                  bestCategory: l.bestCategory,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Default: firms
    const firms = await scoreFirms(DEFAULT_WEIGHTS, {
      practiceAreaId,
      jurisdictionId,
    });
    const top = firms.slice(0, limit);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              practiceArea: args.practiceArea,
              jurisdiction: args.jurisdiction ?? "any",
              recommendations: top.map((f) => ({
                id: f.id,
                name: f.name,
                score: f.compositeScore,
                nps: f.nps,
                bestBand: f.bestBand,
                bestTier: f.bestTier,
                firmType: f.firmType,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ─── Resources ──────────────────────────────────────────────────────────────

server.resource(
  "practice-areas",
  "directory://practice-areas",
  async () => {
    const areas = await prisma.practiceArea.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
    return {
      contents: [
        {
          uri: "directory://practice-areas",
          mimeType: "application/json",
          text: JSON.stringify(areas, null, 2),
        },
      ],
    };
  }
);

server.resource(
  "jurisdictions",
  "directory://jurisdictions",
  async () => {
    const jurisdictions = await prisma.jurisdiction.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, country: true, region: true },
    });
    return {
      contents: [
        {
          uri: "directory://jurisdictions",
          mimeType: "application/json",
          text: JSON.stringify(jurisdictions, null, 2),
        },
      ],
    };
  }
);

server.resource(
  "firms",
  "directory://firms",
  async () => {
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
  }
);

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
