import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import QRCode from "qrcode";

function generateDeliveryCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const { orderId } = json || {};

  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Order ID requerido" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, store: { ownerId: auth.userId } },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Orden no encontrada" }, { status: 404 });
  }

  if (order.status !== "CONFIRMED" && order.status !== "READY") {
    return NextResponse.json({ ok: false, error: "La orden debe estar confirmada o lista" }, { status: 400 });
  }

  let deliveryCode = order.deliveryCode;
  
  if (!deliveryCode) {
    deliveryCode = generateDeliveryCode();
    await prisma.order.update({
      where: { id: orderId },
      data: { deliveryCode, status: "READY" },
    });
  }

  const qrDataUrl = await QRCode.toDataURL(
    JSON.stringify({ orderId, code: deliveryCode }),
    { width: 300, margin: 2 }
  );

  return NextResponse.json({
    ok: true,
    deliveryCode,
    qrCode: qrDataUrl,
  });
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Order ID requerido" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, store: { ownerId: auth.userId } },
    select: { deliveryCode: true },
  });

  if (!order || !order.deliveryCode) {
    return NextResponse.json({ ok: false, error: "Código no generado" }, { status: 404 });
  }

  const qrDataUrl = await QRCode.toDataURL(
    JSON.stringify({ orderId, code: order.deliveryCode }),
    { width: 300, margin: 2 }
  );

  return NextResponse.json({
    ok: true,
    deliveryCode: order.deliveryCode,
    qrCode: qrDataUrl,
  });
}