import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { callClaude } from "@/server/ai/anthropic";

export const dynamic = "force-dynamic";

type CoachMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { question, currentReport, conversationHistory } = (await req.json()) as {
    question: string;
    currentReport: string;
    conversationHistory: CoachMessage[];
  };

  if (!question?.trim()) {
    return NextResponse.json({ error: "No question provided" }, { status: 400 });
  }

  // Fetch RFP context for grounding
  const rfp = await prisma.rfp.findUnique({
    where: { id },
    include: {
      practiceArea: { select: { name: true } },
      jurisdiction: { select: { name: true } },
      invitations: {
        where: { status: "SUBMITTED" },
        include: {
          firm: { select: { name: true, firmType: true, shortName: true } },
        },
      },
    },
  });

  if (!rfp) {
    return NextResponse.json({ error: "RFP not found" }, { status: 404 });
  }

  // Build firm proposal summaries for context
  const firmContext = rfp.invitations
    .map((inv) => {
      const fee = inv.proposedFeeCents
        ? `${inv.currencyCode ?? "USD"} ${(inv.proposedFeeCents / 100).toLocaleString()} (${inv.proposedFeeType ?? "N/A"})`
        : "Not provided";

      // Parse phase breakdown
      let phaseInfo = "";
      try {
        if (inv.feeBreakdown) {
          const phases = JSON.parse(inv.feeBreakdown) as Array<{ phase: string; feeCents: number }>;
          if (phases.length > 0) {
            phaseInfo = " | Phases: " + phases
              .map((p) => `${p.phase}: ${inv.currencyCode ?? "USD"} ${(p.feeCents / 100).toLocaleString()}`)
              .join(", ");
          }
        }
      } catch { /* ignore */ }

      return `- ${inv.firm.name}: Total fee ${fee}${phaseInfo}
  Staffing: ${inv.staffingPlan ?? "N/A"}
  Response: ${inv.responseDocument ?? "Not provided"}`;
    })
    .join("\n");

  // Build conversation context
  const historyText = conversationHistory
    .map((m) => `${m.role === "user" ? "Lawyer" : "Coach"}: ${m.content}`)
    .join("\n\n");

  const systemPrompt = `You are an AI analysis coach helping an in-house lawyer at SCG (Siam Cement Group) refine their evaluation of outside counsel RFP responses.

You have access to the current comparison report and the underlying proposal data. Your role:
- Answer questions about the proposals, clarify comparisons, highlight risks
- When asked about scope coverage, cross-reference the RFP scope with each firm's response to identify what's explicitly covered vs. bundled vs. missing
- When asked to adjust the analysis (e.g. "weight cost more heavily"), produce an UPDATED version of the relevant section
- When asked to rewrite sections, produce the rewritten text
- Be specific, cite firm names and numbers
- Keep responses concise — this is for a busy GC

IMPORTANT: If your response includes a complete rewritten/updated report, wrap it in <updated_report>...</updated_report> tags. This will replace the current report in the UI. Only include this when the user explicitly asks for a rewrite or significant modification to the report. For simple Q&A, just answer directly.

RFP: ${rfp.title}
Practice area: ${rfp.practiceArea?.name ?? "N/A"}
Jurisdiction: ${rfp.jurisdiction?.name ?? "N/A"}
Scope document: ${rfp.scopeDocument ?? "Not specified"}
Pricing requirements: ${rfp.pricingRequirements ?? "Standard"}
Additional requirements: ${rfp.additionalRequirements ?? "None"}

FIRM PROPOSALS:
${firmContext}`;

  const userMessage = `CURRENT REPORT:
${currentReport}

${historyText ? `CONVERSATION SO FAR:\n${historyText}\n\n` : ""}Lawyer's question: ${question}`;

  try {
    const response = await callClaude({ systemPrompt, userMessage });
    const content = response.content;

    // Check if the response contains an updated report
    const reportMatch = content.match(/<updated_report>([\s\S]*?)<\/updated_report>/);
    let updatedReport: string | null = null;
    let displayResponse = content;

    if (reportMatch) {
      updatedReport = reportMatch[1].trim();
      // Remove the updated_report tags from the displayed response
      displayResponse = content
        .replace(/<updated_report>[\s\S]*?<\/updated_report>/, "")
        .trim();
      if (!displayResponse) {
        displayResponse = "I've updated the report based on your request. The changes are reflected above.";
      }
    }

    return NextResponse.json({
      response: displayResponse,
      updatedReport,
    });
  } catch (err) {
    console.error("Coach API error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
