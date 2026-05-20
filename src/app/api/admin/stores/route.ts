import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const stores = await prisma.store.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      description: true,
      phone: true,
      address: true,
      latitude: true,
      longitude: true,
      imageUrl: true,
      isActive: true,
      isPublished: true,
      isApproved: true,
      openTime: true,
      closeTime: true,
      scheduleDays: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ ok: true, stores });
}
