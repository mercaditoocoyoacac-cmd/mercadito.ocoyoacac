import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });

  if (!user || user.role !== "DELIVERY") {
    return NextResponse.json(
      { ok: false, error: "No autorizado." },
      { status: 403 },
    );
  }

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
