import { callClaude } from "@/server/ai/anthropic";

export const dynamic = "force-dynamic";

type FirmRef = { id: string; name: string; shortName: string | null };
type LawyerRef = { id: string; name: string };

export async function POST(request: Request) {
  try {
    const { text, firms, lawyers } = (await request.json()) as {
      text: string;
      firms: FirmRef[];
      lawyers: LawyerRef[];
    };

    if (!text?.trim()) {
      return Response.json({ error: "No document text provided" }, { status: 400 });
    }

    const systemPrompt = `You are a legal document parser for SCG's Outside Counsel Platform. You extract structured engagement data from engagement letters, retainer agreements, or similar documents.

Given the text of an engagement document, extract the following fields. Return ONLY valid JSON (no markdown, no code fences):

{
  "matterNo": "matter/reference number if mentioned, or empty string",
  "matterName": "descriptive matter name — infer from scope section if not explicit",
  "matterType": "one of: LITIGATION, ARBITRATION, REGULATORY, TRANSACTIONAL, ADVISORY, IP, EMPLOYMENT, OTHER",
  "firmName": "name of the external law firm",
  "firmId": "matched firm ID from the directory, or empty string",
  "lawyerName": "lead partner/lawyer name if mentioned",
  "lawyerId": "matched lawyer ID from the directory, or empty string",
  "entityName": "SCG entity name if mentioned (the client)",
  "startDate": "YYYY-MM-DD format, or empty string",
  "endDate": "YYYY-MM-DD format, or empty string",
  "totalFeesUsd": "estimated total in cents if mentioned (e.g. $50,000 = 5000000), or empty string",
  "outcome": "ONGOING (default for new engagements)",
  "notes": "brief summary of scope, fee arrangement, and any key terms"
}

MATCHING RULES:
- Match firmName against the directory firms list provided. Use fuzzy matching (e.g. "Baker & McKenzie" matches "Baker McKenzie").
- Match lawyerName against the directory lawyers list provided.
- For matterType, infer from context: disputes/claims → LITIGATION, arbitration → ARBITRATION, M&A/JV → TRANSACTIONAL, general advice → ADVISORY, etc.
- For fees: convert to USD cents. If hourly rates are given without estimated total, note in the notes field but leave totalFeesUsd empty.
- Always default outcome to "ONGOING" for new engagements.`;

    const userMessage = `DIRECTORY FIRMS:
${JSON.stringify(firms.map((f) => ({ id: f.id, name: f.name, short: f.shortName })))}

DIRECTORY LAWYERS:
${JSON.stringify(lawyers.map((l) => ({ id: l.id, name: l.name })))}

DOCUMENT TEXT:
${text}`;

    const response = await callClaude({ systemPrompt, userMessage });

    let extracted;
    try {
      const cleaned = response.content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      extracted = JSON.parse(cleaned);
    } catch {
      return Response.json(
        { error: "Could not parse extraction results. The document may not contain enough structured information." },
        { status: 500 }
      );
    }

    return Response.json({ extracted });
  } catch (err) {
    console.error("Engagement extraction error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
