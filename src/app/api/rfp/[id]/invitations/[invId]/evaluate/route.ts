import { NextRequest, NextResponse } from "next/server";
import { scoreInvitation } from "@/server/rfp/mutations";
import { evaluationScoreSchema } from "@/lib/validation/rfp";
import { getCurrentUserId } from "../../../../current-user";
import { z } from "zod";

const bodySchema = z.object({
  scores: z.array(evaluationScoreSchema).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invId: string }> }
) {
  const { invId } = await params;
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  await scoreInvitation(invId, userId, parsed.data.scores);
  return NextResponse.json({ ok: true });
}
