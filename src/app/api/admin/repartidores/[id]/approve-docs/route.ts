import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });

  const admin = await prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true, email: true } });
  const approvedBy = admin?.name || admin?.email || auth.userId;

  await prisma.user.update({
    where: { id },
    data: {
      driverDocsApproved: true,
      driverDocsApprovedAt: new Date(),
      driverDocsApprovedBy: approvedBy,
    },
  });

  return NextResponse.json({ ok: true });
}