import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const { storeId, action } = json || {};

  if (!storeId || !action) {
    return NextResponse.json({ ok: false, error: "Datos requeridos" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { subscription: true },
  });

  if (!store) {
    return NextResponse.json({ ok: false, error: "Tienda no encontrada" }, { status: 404 });
  }

  if (action === "approve") {
    await prisma.store.update({
      where: { id: storeId },
      data: { isApproved: true, isPublished: true },
    });
  } else if (action === "reject") {
    await prisma.store.update({
      where: { id: storeId },
      data: { isApproved: false, isPublished: false, isActive: false },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");

  if (!storeId) {
    return NextResponse.json({ ok: false, error: "Store ID requerido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { subscription: true },
  });

  if (!store) {
    return NextResponse.json({ ok: false, error: "Tienda no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    store: {
      id: store.id,
      name: store.name,
      subscription: store.subscription
        ? {
            contractSigned: store.subscription.contractSigned,
            contractSignedAt: store.subscription.contractSignedAt,
            contractTerms: store.subscription.contractTerms,
            contractPdfUrl: store.subscription.contractPdfUrl,
          }
        : null,
    },
  });
}