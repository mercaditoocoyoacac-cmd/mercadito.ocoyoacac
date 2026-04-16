import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const session = await prisma.session.findUnique({
    where: { token: auth.sessionToken || "" },
  });

  if (!session || session.userId !== auth.userId) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });

  if (user?.role !== "DELIVERY" && user?.role !== "VENDOR" && user?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const { orderId, deliveryCode } = json || {};

  if (!orderId || !deliveryCode) {
    return NextResponse.json({ ok: false, error: "Datos requeridos" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, deliveryCode },
    include: {
      store: { select: { name: true } },
      user: { select: { name: true, phone: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Código inválido" }, { status: 404 });
  }

  if (order.status === "COMPLETED") {
    return NextResponse.json({ ok: false, error: "Orden ya entregada" }, { status: 400 });
  }

  const updateData: any = {
    status: "COMPLETED",
  };

  if (user?.role === "DELIVERY") {
    updateData.deliveryUserId = auth.userId;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: updateData,
  });

  return NextResponse.json({
    ok: true,
    message: "Entrega confirmada",
    order: {
      id: order.id,
      customerName: order.customerName,
      total: order.totalCents,
      storeName: order.store.name,
    },
  });
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ ok: false, error: "Código requerido" }, { status: 400 });
  }

  try {
    const data = JSON.parse(code);
    const order = await prisma.order.findFirst({
      where: { id: data.orderId, deliveryCode: data.code },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerAddress: true,
        status: true,
        totalCents: true,
        store: { select: { name: true, phone: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ ok: false, error: "Código inválido" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, order });
  } catch {
    return NextResponse.json({ ok: false, error: "Código inválido" }, { status: 400 });
  }
}