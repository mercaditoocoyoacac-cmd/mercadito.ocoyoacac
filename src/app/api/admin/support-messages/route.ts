import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { getUserRoles } from "@/server/requireUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || session.user.isActive === false || !getUserRoles(session).includes("ADMIN")) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const messages = await prisma.supportMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ messages });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || session.user.isActive === false || !getUserRoles(session).includes("ADMIN")) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) {
    return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });
  }

  await prisma.supportMessage.update({
    where: { id },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || session.user.isActive === false || !getUserRoles(session).includes("ADMIN")) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) {
    return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });
  }

  await prisma.supportMessage.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
