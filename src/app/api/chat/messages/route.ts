import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const userId = auth.userId;
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId requerido" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId },
    select: { userId: true, deliveryUserId: true },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.userId !== userId && order.deliveryUserId !== userId) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      senderId: true,
      senderRole: true,
      message: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, messages });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const userId = auth.userId;

  const json = await req.json().catch(() => null);
  const { orderId, message } = json || {};

  if (!orderId || !message?.trim()) {
    return NextResponse.json({ ok: false, error: "orderId y message requeridos" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId },
    select: { userId: true, deliveryUserId: true },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
  }

  let senderRole: string;
  if (order.userId === userId) {
    senderRole = "CUSTOMER";
  } else if (order.deliveryUserId === userId) {
    senderRole = "DELIVERY";
  } else {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const chatMessage = await prisma.chatMessage.create({
    data: {
      orderId,
      senderId: userId,
      senderRole,
      message: message.trim(),
    },
    select: {
      id: true,
      senderId: true,
      senderRole: true,
      message: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, message: chatMessage });
}
