import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

type NoteUpdate = {
  firmId: string;
  notes: string;
};

export async function POST(request: Request) {
  try {
    const { updates } = (await request.json()) as { updates: NoteUpdate[] };

    if (!updates || updates.length === 0) {
      return Response.json({ error: "No updates provided" }, { status: 400 });
    }

    // Update each firm's internalNotes
    const results = await Promise.all(
      updates.map((u) =>
        prisma.firm.update({
          where: { id: u.firmId },
          data: { internalNotes: u.notes || null },
          select: { id: true, name: true, shortName: true },
        })
      )
    );

    return Response.json({
      success: true,
      count: results.length,
      firms: results.map((r) => r.shortName ?? r.name),
    });
  } catch (err) {
    console.error("Apply notes error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
