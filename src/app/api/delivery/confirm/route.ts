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
  const { orderId, deliveryCode, action } = json || {};

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

  let newStatus = "COMPLETED";
  let message = "Entrega confirmada";

  if (action === "pickup") {
    newStatus = "OUT_FOR_DELIVERY";
    message = "Producto recogido - En camino";
  }

  const updateData: any = {
    status: newStatus,
  };

  if (user?.role === "DELIVERY" && !order.deliveryUserId) {
    updateData.deliveryUserId = auth.userId;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: updateData,
  });

  return NextResponse.json({
    ok: true,
    message,
    order: {
      id: order.id,
      customerName: order.customerName,
      total: order.totalCents,
      storeName: order.store.name,
      status: newStatus,
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
    let deliveryCode = code;
    
    try {
      const data = JSON.parse(code);
      deliveryCode = data.code;
    } catch {
    }
    
    const order = await prisma.order.findFirst({
      where: { deliveryCode: deliveryCode },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerAddress: true,
        status: true,
        totalCents: true,
        deliveryCode: true,
        store: { select: { name: true, phone: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ ok: false, error: "Código no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, order });
  } catch {
    return NextResponse.json({ ok: false, error: "Código inválido" }, { status: 400 });
  }
}