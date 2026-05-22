import { prisma } from "@/server/db";
import { querySubPanel, type SubPanelFirm } from "@/server/ai/sub-panel";
import type { ComplexityTier } from "@/generated/prisma/client";

export type EnrichedFirmSuggestion = SubPanelFirm & {
  activeMatters: number;
  lastScorecardTier: string | null;
  pendingRfpInvitations: number;
  warnings: string[];
};

export async function suggestFirmsForRfp(
  jurisdictionId: string,
  practiceAreaId: string,
  complexityTier: ComplexityTier
): Promise<EnrichedFirmSuggestion[]> {
  const subPanel = await querySubPanel({
    jurisdictionId,
    practiceAreaId,
    complexityTier,
    limit: 20,
  });

  if (subPanel.firms.length === 0) return [];

  const firmIds = subPanel.firms.map((f) => f.firmId);

  const [matterCounts, scorecards, pendingInvitations] = await Promise.all([
    prisma.matter.groupBy({
      by: ["firmId"],
      where: { firmId: { in: firmIds }, status: "ACTIVE", deletedAt: null },
      _count: { id: true },
    }),
    prisma.scorecard.findMany({
      where: { firmId: { in: firmIds } },
      orderBy: { periodEnd: "desc" },
      distinct: ["firmId"],
      select: { firmId: true, tier: true },
    }),
    prisma.rfpInvitation.groupBy({
      by: ["firmId"],
      where: {
        firmId: { in: firmIds },
        status: { in: ["INVITED", "SUBMITTED"] },
      },
      _count: { id: true },
    }),
  ]);

  const matterMap = new Map(matterCounts.map((m) => [m.firmId, m._count.id]));
  const scorecardMap = new Map(scorecards.map((s) => [s.firmId, s.tier]));
  const invitationMap = new Map(pendingInvitations.map((i) => [i.firmId, i._count.id]));

  return subPanel.firms.map((firm) => {
    const warnings: string[] = [];

    if (firm.panelStatus === "PROBATION") warnings.push("Firm is on probation");
    if (firm.overallScore !== null && firm.overallScore < 60) warnings.push("Below-average score");
    if (!firm.lastReviewedAt) warnings.push("Capability not yet reviewed");

    const pendingCount = invitationMap.get(firm.firmId) ?? 0;
    if (pendingCount > 0) warnings.push(`${pendingCount} pending RFP invitation(s)`);

    const tier = scorecardMap.get(firm.firmId);
    if (tier === "REQUIRES_IMPROVEMENT") warnings.push("Latest scorecard: requires improvement");
    if (tier === "EXIT_REVIEW") warnings.push("Latest scorecard: exit review");

    return {
      ...firm,
      activeMatters: matterMap.get(firm.firmId) ?? 0,
      lastScorecardTier: tier ?? null,
      pendingRfpInvitations: pendingCount,
      warnings,
    };
  });
}
