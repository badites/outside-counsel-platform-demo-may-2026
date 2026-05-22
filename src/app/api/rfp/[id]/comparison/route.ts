import { NextRequest, NextResponse } from "next/server";
import { getLatestComparison, generateComparisonReport } from "@/server/rfp/comparison";
import { resolveApiKey } from "@/server/ai/anthropic";
import { getCurrentUserId } from "../../current-user";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const comparison = await getLatestComparison(id);
  if (!comparison) {
    return NextResponse.json({ error: "No comparison report found" }, { status: 404 });
  }
  return NextResponse.json(comparison);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const apiKey = resolveApiKey(req);
  const content = await generateComparisonReport(id, userId, apiKey);
  return NextResponse.json({ content }, { status: 201 });
}
