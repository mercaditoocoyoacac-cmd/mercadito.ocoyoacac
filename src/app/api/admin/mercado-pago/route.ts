import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

export async function GET(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const stores = await prisma.store.findMany({
    where: {
      mercadoPagoStatus: "PENDING",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      mercadoPagoStatus: true,
      mercadoPagoAccountId: true,
      owner: { select: { email: true, name: true } },
    },
  });

  return NextResponse.json({ ok: true, stores });
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const { storeId, action } = json || {};

  if (!storeId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (action === "approve") {
    await prisma.store.update({
      where: { id: storeId },
      data: {
        acceptsMercadoPago: true,
        mercadoPagoStatus: "APPROVED",
      },
    });
  } else if (action === "reject") {
    await prisma.store.update({
      where: { id: storeId },
      data: {
        acceptsMercadoPago: false,
        mercadoPagoStatus: "REJECTED",
      },
    });
  }

  return NextResponse.json({ ok: true });
}