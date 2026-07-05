import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

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
      scheduleDetails: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ ok: true, stores });
}
