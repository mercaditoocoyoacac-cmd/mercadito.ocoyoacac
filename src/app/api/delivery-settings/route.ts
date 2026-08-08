import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

export async function GET() {
  const existing = await prisma.deliverySettings.findUnique({ where: { id: 1 } });
  const settings = existing ?? { id: 1, baseFeeCents: 2500, extraFeePerSegmentCents: 1000, baseDistanceKm: 2, segmentKm: 2, fallbackFeeCents: 2500, updatedAt: new Date() };
  return NextResponse.json({ ok: true, settings });
}
