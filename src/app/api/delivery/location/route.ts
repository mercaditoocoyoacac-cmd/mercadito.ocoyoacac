import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function POST(req: Request) {
  const auth = await requireRole("DELIVERY");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = LocationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: {
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    },
  });

  return NextResponse.json({ ok: true });
}
