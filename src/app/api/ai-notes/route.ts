import { prisma } from "@/server/db";
import { callClaude } from "@/server/ai/anthropic";

export const dynamic = "force-dynamic";

type NoteProposal = {
  firmId: string;
  firmName: string;
  currentNotes: string | null;
  proposedNotes: string;
};

export async function POST(request: Request) {
  try {
    const { instruction } = (await request.json()) as { instruction: string };

    if (!instruction?.trim()) {
      return Response.json({ error: "No instruction provided" }, { status: 400 });
    }

    // Fetch all active firms with their current notes
    const firms = await prisma.firm.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, shortName: true, internalNotes: true },
      orderBy: { name: "asc" },
    });

    const firmList = firms.map((f) => ({
      id: f.id,
      name: f.name,
      shortName: f.shortName,
      currentNotes: f.internalNotes,
    }));

    const systemPrompt = `You are a helper that parses natural language instructions about law firms and converts them into structured AI Knowledge Notes.

You will receive:
1. A list of law firms in the directory (with IDs, names, and current notes)
2. A natural language instruction from the user

Your job:
- Identify which firm(s) the instruction refers to (fuzzy match on name/shortName)
- Generate concise, actionable AI Knowledge Notes for each matched firm
- If a firm already has notes, MERGE the new instruction with existing notes (don't overwrite unless the user explicitly says to replace)
- Notes should be written as clear directives for an AI recommendation engine, e.g. "Corporate secretary only — do not recommend for M&A advisory or litigation"

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "proposals": [
    {
      "firmId": "the-firm-id",
      "firmName": "Full Firm Name",
      "proposedNotes": "The merged/new notes text"
    }
  ],
  "unmatched": ["any firm names from the instruction that couldn't be matched"]
}

If no firms match, return {"proposals": [], "unmatched": ["the names"]}.`;

    const userMessage = `FIRMS IN DIRECTORY:
${JSON.stringify(firmList, null, 2)}

USER INSTRUCTION:
${instruction}`;

    const response = await callClaude({
      systemPrompt,
      userMessage,
    });

    // Parse the JSON response from Claude
    let parsed: { proposals: { firmId: string; firmName: string; proposedNotes: string }[]; unmatched?: string[] };
    try {
      // Strip any markdown code fences if present
      const cleaned = response.content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return Response.json(
        { error: "Failed to parse AI response. Please try rephrasing your instruction." },
        { status: 500 }
      );
    }

    // Enrich proposals with current notes
    const enriched: NoteProposal[] = parsed.proposals.map((p) => {
      const firm = firms.find((f) => f.id === p.firmId);
      return {
        firmId: p.firmId,
        firmName: p.firmName,
        currentNotes: firm?.internalNotes ?? null,
        proposedNotes: p.proposedNotes,
      };
    });

    return Response.json({
      proposals: enriched,
      unmatched: parsed.unmatched ?? [],
    });
  } catch (err) {
    console.error("AI Notes API error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
