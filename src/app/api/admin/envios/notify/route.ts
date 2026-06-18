import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { sendTextNotification } from "@/server/notifications";
import { sendWhatsAppMessage } from "@/server/whatsapp";
import { sendSMS } from "@/server/sns";

const NotifySchema = z.object({
  orderId: z.string().min(1),
  to: z.enum(["driver", "customer"]),
});

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = NotifySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  const { orderId, to } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      store: { select: { name: true } },
      deliveryUser: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
  }

  if (to === "driver" && order.deliveryUser) {
    await sendTextNotification(order.deliveryUser.id, {
      title: "Notificación de administrador",
      body: `Tu pedido en ${order.store.name} (${order.customerName}) requiere atención.`,
      type: "ADMIN_NOTIFY",
      url: "/delivery",
    });
  }

  if (to === "customer") {
    await sendTextNotification(order.userId, {
      title: "Notificación de la tienda",
      body: `Tu pedido en ${order.store.name} está en proceso.`,
      type: "ADMIN_NOTIFY",
      url: `/mis-pedidos/${orderId}`,
    });

    const msg = `Hola ${order.customerName}, tu pedido en ${order.store.name} está siendo atendido. Gracias por tu paciencia.`;
    await Promise.allSettled([
      sendWhatsAppMessage(order.customerPhone, msg),
      sendSMS(order.customerPhone, msg.replace(/[^\w\sáéíóúñ,.!¡¿?]/g, "")),
    ]);
  }

  return NextResponse.json({ ok: true });
}
