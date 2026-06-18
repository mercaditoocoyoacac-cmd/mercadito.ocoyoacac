import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "DELIVERY") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { availabilitySchedule: true },
  });

  return NextResponse.json({ ok: true, schedule: user?.availabilitySchedule });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "DELIVERY") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { schedule } = body;

  if (!schedule || !schedule.mode || !schedule.days) {
    return NextResponse.json({ ok: false, error: "Datos de horario inválidos" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { availabilitySchedule: schedule },
  });

  return NextResponse.json({ ok: true });
}
