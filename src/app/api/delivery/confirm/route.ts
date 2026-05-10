import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { sendTextNotification } from "@/server/notifications";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const userId = auth.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role !== "DELIVERY" && user?.role !== "VENDOR" && user?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const { orderId, code, action } = json || {};

  if (!orderId || !code) {
    return NextResponse.json({ ok: false, error: "Código requerido" }, { status: 400 });
  }

  let order;
  if (action === "pickup") {
    order = await prisma.order.findFirst({
      where: { id: orderId, deliveryCode: code },
      include: {
        store: { select: { name: true } },
        user: { select: { name: true, phone: true } },
      },
    });
  } else {
    order = await prisma.order.findFirst({
      where: { id: orderId, pickupCode: code },
      include: {
        store: { select: { name: true } },
        user: { select: { name: true, phone: true } },
      },
    });
  }

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

  const updateData: Record<string, string> = {
    status: newStatus,
  };

  if (user?.role === "DELIVERY" && !order.deliveryUserId) {
    updateData.deliveryUserId = userId;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: updateData as any,
  });

  if (newStatus === "COMPLETED") {
    await sendTextNotification(order.userId, {
      title: "Pedido entregado",
      body: `Tu pedido en ${order.store.name} ha sido entregado.`,
      type: "ORDER_COMPLETED",
    });
  }

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
  const type = searchParams.get("type") || "delivery";

  if (!code) {
    return NextResponse.json({ ok: false, error: "Código requerido" }, { status: 400 });
  }

  try {
    let rawCode = code;
    
    try {
      const data = JSON.parse(code);
      rawCode = data.code;
    } catch {
    }
    
    const codeField = type === "pickup" ? { pickupCode: rawCode } : { deliveryCode: rawCode };
    
    const order = await prisma.order.findFirst({
      where: codeField,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerAddress: true,
        status: true,
        totalCents: true,
        deliveryCode: true,
        pickupCode: true,
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
