import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code || code.length < 3) {
    return NextResponse.json({ costCenter: null });
  }

  const costCenter = await prisma.costCenter.findFirst({
    where: {
      code: { startsWith: code },
      isActive: true,
    },
    include: { entity: true },
  });

  if (!costCenter) {
    return NextResponse.json({ costCenter: null });
  }

  return NextResponse.json({
    costCenter: {
      id: costCenter.id,
      code: costCenter.code,
      name: costCenter.name,
      entityName: costCenter.entity.shortName ?? costCenter.entity.name,
      entityCountry: costCenter.entity.country,
    },
  });
}
