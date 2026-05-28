import { NextRequest, NextResponse } from "next/server";
import { getOrCreateResponseToken } from "@/server/rfp/mutations";

/**
 * POST /api/rfp/[id]/invitations/[invId]/token
 * Internal — generates (or retrieves) a response token for the invitation,
 * then returns the public URL the firm should use to respond.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invId: string }> }
) {
  const { invId } = await params;

  try {
    const token = await getOrCreateResponseToken(invId);

    // Build the public URL — use the request origin so it works in dev + prod
    const origin = req.headers.get("x-forwarded-host")
      ? `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host")}`
      : new URL(req.url).origin;

    const publicUrl = `${origin}/respond/${token}`;

    return NextResponse.json({ token, url: publicUrl });
  } catch (err) {
    console.error("[Token] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate link" },
      { status: 500 }
    );
  }
}
