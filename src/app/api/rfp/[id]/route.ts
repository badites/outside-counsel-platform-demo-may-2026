import { NextRequest, NextResponse } from "next/server";
import { getRfp } from "@/server/rfp/queries";
import { updateDraftRfp } from "@/server/rfp/mutations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rfp = await getRfp(id);
  if (!rfp) {
    return NextResponse.json({ error: "RFP not found" }, { status: 404 });
  }
  return NextResponse.json(rfp);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const rfp = await updateDraftRfp(id, body);
  return NextResponse.json(rfp);
}
