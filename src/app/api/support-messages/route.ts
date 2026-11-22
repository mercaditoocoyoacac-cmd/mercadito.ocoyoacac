import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const messages = await prisma.supportMessage.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      message: true,
      imageUrl: true,
      read: true,
      createdAt: true,
      reply: true,
      repliedAt: true,
      repliedBy: true,
    },
  });

  return NextResponse.json({ ok: true, messages });
}
