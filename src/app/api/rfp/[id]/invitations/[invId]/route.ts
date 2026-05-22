import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { updateInvitationResponse } from "@/server/rfp/mutations";
import { invitationResponseSchema } from "@/lib/validation/rfp";
import { shouldAutoGenerate, generateComparisonReport } from "@/server/rfp/comparison";
import { getCurrentUserId } from "../../../current-user";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; invId: string }> }
) {
  const { invId } = await params;
  const invitation = await prisma.rfpInvitation.findUnique({
    where: { id: invId },
    include: {
      firm: { select: { id: true, name: true, firmType: true } },
      evaluations: true,
    },
  });
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  return NextResponse.json(invitation);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invId: string }> }
) {
  const { id: rfpId, invId } = await params;
  const body = await req.json();
  const parsed = invitationResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const invitation = await updateInvitationResponse(invId, parsed.data);

  const autoGen = await shouldAutoGenerate(rfpId);
  if (autoGen) {
    getCurrentUserId().then((userId) =>
      generateComparisonReport(rfpId, userId).catch(() => {})
    );
  }

  return NextResponse.json(invitation);
}
