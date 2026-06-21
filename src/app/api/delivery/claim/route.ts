import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { appendStatusTimestamp } from "@/lib/statusTimestamps";
import { rateLimit } from "@/lib/rate-limit";

const ClaimSchema = z.object({
  orderId: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = await requireRole("DELIVERY");
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(`claim:${auth.userId}`, { intervalMs: 10_000, max: 5 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Espera unos segundos." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, role: true, isActive: true, latitude: true, longitude: true, additionalRoles: true },
  });
  const hasDeliveryRole = user?.role === "DELIVERY" || (user?.additionalRoles ?? "").split(",").includes("DELIVERY");
  if (!user || !hasDeliveryRole || !user.isActive) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = ClaimSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: {
      id: true,
      status: true,
      fulfillmentType: true,
      deliveryUserId: true,
      statusTimestamps: true,
      store: { select: { name: true } },
    },
  });

  if (!order || order.fulfillmentType !== "DELIVERY") {
    return NextResponse.json({ ok: false, error: "Pedido no disponible." }, { status: 404 });
  }

  if (order.status !== "CONFIRMED" && order.status !== "READY") {
    return NextResponse.json({ ok: false, error: "El pedido no está disponible para entrega." }, { status: 400 });
  }

  if (order.deliveryUserId) {
    return NextResponse.json({ ok: false, error: "Este pedido ya fue asignado a otro repartidor." }, { status: 409 });
  }

  const currentTs = order.statusTimestamps as Record<string, string> | null;

  const claimed = await prisma.order.updateMany({
    where: {
      id: parsed.data.orderId,
      deliveryUserId: null,
      status: { in: ["CONFIRMED", "READY"] },
    },
    data: {
      deliveryUserId: user.id,
      status: "READY",
      statusTimestamps: appendStatusTimestamp(currentTs, "READY"),
    },
  });

  if (claimed.count === 0) {
    return NextResponse.json({ ok: false, error: "Otro repartidor tomó este pedido primero." }, { status: 409 });
  }

  revalidatePath(`/vendor/pedidos/${parsed.data.orderId}`);
  revalidatePath("/vendor/pedidos");
  revalidatePath("/delivery");

  return NextResponse.json({ ok: true, orderId: parsed.data.orderId });
}
