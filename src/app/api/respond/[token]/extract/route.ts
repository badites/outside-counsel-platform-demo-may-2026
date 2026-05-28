import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { callClaude } from "@/server/ai/anthropic";

/**
 * POST /api/respond/[token]/extract
 * Public — AI extraction of structured data from pasted proposal text.
 * No auth required (the token itself is the auth).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate the token exists and is still INVITED
  const invitation = await prisma.rfpInvitation.findUnique({
    where: { responseToken: token },
    include: {
      rfp: {
        select: {
          title: true,
          scopeDocument: true,
          pricingRequirements: true,
        },
      },
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  if (invitation.status !== "INVITED") {
    return NextResponse.json(
      { error: "This invitation has already been responded to" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const proposalText = body.proposalText;
  if (!proposalText || typeof proposalText !== "string" || proposalText.trim().length < 20) {
    return NextResponse.json(
      { error: "Please provide the full proposal text (at least 20 characters)" },
      { status: 400 }
    );
  }

  // Build AI extraction prompt
  const systemPrompt = `You are a legal billing data extraction assistant. Extract structured fee proposal data from the text provided by an outside counsel law firm.

Context about the RFP:
- Title: ${invitation.rfp.title}
${invitation.rfp.scopeDocument ? `- Scope: ${invitation.rfp.scopeDocument}` : ""}
${invitation.rfp.pricingRequirements ? `- Pricing requirements: ${invitation.rfp.pricingRequirements}` : ""}

Return ONLY valid JSON with this exact structure (omit fields you cannot confidently extract):
{
  "feeType": "CAPPED" | "FIXED" | "HOURLY" | "PHASED_FIXED" | "BLENDED" | "SUCCESS",
  "currencyCode": "THB" | "USD" | "SGD" | "EUR" | "GBP" | "JPY",
  "phases": [
    { "phase": "Phase name", "feeCents": 150000000 }
  ],
  "staffingPlan": "Extracted staffing details as a single text block",
  "narrative": "Extracted approach / methodology / experience as a single text block",
  "totalFeeCents": 300000000,
  "confidence": 0.85
}

Rules:
- feeCents and totalFeeCents are in cents (multiply monetary amounts by 100)
- If a currency symbol is mentioned (e.g. $, ฿, £), infer currencyCode
- If no currency is mentioned, default to THB
- If no fee type is clearly stated, default to CAPPED
- phases should capture distinct work phases mentioned with their fees
- If only a single total fee is mentioned, create one phase called "Total fee" with that amount
- confidence is your estimate of how accurately you extracted the data (0 to 1)
- Do NOT make up data. If a field cannot be extracted, omit it.
- Return ONLY the JSON object, no markdown fences, no explanation.`;

  try {
    const response = await callClaude({
      systemPrompt,
      userMessage: proposalText.slice(0, 15000), // Cap input length
    });

    // Parse the AI response as JSON
    let extracted: Record<string, unknown>;
    try {
      // Strip any markdown fences if present
      const cleaned = response.content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      extracted = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI could not parse the proposal. Try pasting a clearer text." },
        { status: 422 }
      );
    }

    return NextResponse.json(extracted);
  } catch (err) {
    console.error("[Extract] Claude CLI error:", err);
    return NextResponse.json(
      { error: "AI extraction is temporarily unavailable. Please fill in the form manually." },
      { status: 503 }
    );
  }
}
