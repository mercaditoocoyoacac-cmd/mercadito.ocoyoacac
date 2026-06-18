import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole("DELIVERY");
  if (!auth.ok) return auth.res;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { availabilitySchedule: true },
  });

  return NextResponse.json({ ok: true, schedule: user?.availabilitySchedule });
}

export async function PUT(req: Request) {
  const auth = await requireRole("DELIVERY");
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));
  const { schedule } = body;

  if (!schedule || !schedule.mode || !schedule.days) {
    return NextResponse.json({ ok: false, error: "Datos de horario inválidos" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: { availabilitySchedule: schedule },
  });

  return NextResponse.json({ ok: true });
}
