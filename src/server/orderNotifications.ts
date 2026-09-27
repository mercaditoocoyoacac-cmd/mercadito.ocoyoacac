import { prisma } from "@/server/prisma";
import { sendTextNotification } from "@/server/notifications";

function customerUrl(orderId: string) {
  return `/mis-pedidos/${orderId}`;
}

function vendorUrl() {
  return "/vendor/pedidos";
}

function driverUrl() {
  return "/delivery";
}

interface PhaseOptions {
  exceptUserId?: string;
  skipCustomer?: boolean;
  reason?: string;
}

export async function notifyOrderCreated(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      store: { select: { name: true } },
    },
  });

  if (!order || !order.userId) return;

  await sendTextNotification(order.userId, {
    title: "Pedido recibido",
    body: `Tu pedido en ${order.store?.name || "la tienda"} fue registrado. Te avisaremos de cada etapa.`,
    type: "NEW_ORDER",
    url: customerUrl(orderId),
    orderId,
  });
}

export async function notifyOrderHasDriver(orderId: string, exceptUserId?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      customerName: true,
      store: { select: { name: true, ownerId: true } },
      deliveryUser: { select: { id: true, name: true } },
    },
  });

  if (!order) return;

  const recipients: { userId: string; title: string; body: string; url: string }[] = [];

  if (order.userId && order.userId !== exceptUserId) {
    recipients.push({
      userId: order.userId,
      title: "Repartidor asignado",
      body: `Un repartidor tomará tu pedido de ${order.store?.name || "la tienda"}. Sigue su avance aquí.`,
      url: customerUrl(orderId),
    });
  }

  if (order.store?.ownerId && order.store.ownerId !== exceptUserId) {
    recipients.push({
      userId: order.store.ownerId,
      title: "Repartidor asignado",
      body: `Un repartidor ya atiende el pedido de ${order.customerName}.`,
      url: vendorUrl(),
    });
  }

  if (order.deliveryUser && order.deliveryUser.id !== exceptUserId) {
    recipients.push({
      userId: order.deliveryUser.id,
      title: "Te asignaron este pedido",
      body: `${order.customerName} — ${order.store?.name || "Tienda"}. Es el momento de recogerlo.`,
      url: driverUrl(),
    });
  }

  await Promise.allSettled(
    recipients.map((r) =>
      sendTextNotification(r.userId, {
        title: r.title,
        body: r.body,
        type: "ORDER_ACCEPTED",
        url: r.url,
        orderId,
      }),
    ),
  );
}

export async function notifyOrderOutForDelivery(orderId: string, exceptUserId?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      customerName: true,
      store: { select: { name: true, ownerId: true } },
      deliveryUser: { select: { id: true } },
    },
  });

  if (!order) return;

  const recipients: { userId: string; title: string; body: string; url: string }[] = [];

  if (order.userId && order.userId !== exceptUserId) {
    recipients.push({
      userId: order.userId,
      title: "Tu pedido va en camino",
      body: `Tu pedido de ${order.store?.name || "la tienda"} va en camino. 🛵`,
      url: customerUrl(orderId),
    });
  }

  if (order.store?.ownerId && order.store.ownerId !== exceptUserId) {
    recipients.push({
      userId: order.store.ownerId,
      title: "Pedido en camino",
      body: `El repartidor ya salió con el pedido de ${order.customerName}.`,
      url: vendorUrl(),
    });
  }

  if (order.deliveryUser && order.deliveryUser.id !== exceptUserId) {
    recipients.push({
      userId: order.deliveryUser.id,
      title: "Entrega en curso",
      body: `Entrega el pedido de ${order.customerName}. ¡Vas muy bien!`,
      url: driverUrl(),
    });
  }

  await Promise.allSettled(
    recipients.map((r) =>
      sendTextNotification(r.userId, {
        title: r.title,
        body: r.body,
        type: "OUT_FOR_DELIVERY",
        url: r.url,
        orderId,
      }),
    ),
  );
}

export async function notifyDeliveryArrived(orderId: string, exceptUserId?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      customerName: true,
      store: { select: { name: true, ownerId: true } },
    },
  });

  if (!order) return;

  await Promise.allSettled([
    order.userId && order.userId !== exceptUserId
      ? sendTextNotification(order.userId, {
          title: "Repartidor llegó",
          body: `¡El repartidor ya está en tu domicilio! Sal a recibir tu pedido de ${order.store?.name || "la tienda"}.`,
          type: "DELIVERY_ARRIVED",
          url: customerUrl(orderId),
          orderId,
        })
      : Promise.resolve(),
    order.store?.ownerId && order.store.ownerId !== exceptUserId
      ? sendTextNotification(order.store.ownerId, {
          title: "Repartidor llegó al domicilio",
          body: `El repartidor ya está entregando el pedido de ${order.customerName}.`,
          type: "DELIVERY_ARRIVED",
          url: vendorUrl(),
          orderId,
        })
      : Promise.resolve(),
  ]);
}

export async function notifyOrderFinished(orderId: string, opts: PhaseOptions = {}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      customerName: true,
      store: { select: { name: true, ownerId: true } },
      deliveryUser: { select: { id: true } },
    },
  });

  if (!order) return;

  const recipients: { userId: string; title: string; body: string; url: string }[] = [];

  if (order.userId && !opts.skipCustomer && order.userId !== opts.exceptUserId) {
    recipients.push({
      userId: order.userId,
      title: "Pedido entregado",
      body: `Tu pedido en ${order.store?.name || "la tienda"} ha sido entregado.`,
      url: customerUrl(orderId),
    });
  }

  if (order.store?.ownerId && order.store.ownerId !== opts.exceptUserId) {
    recipients.push({
      userId: order.store.ownerId,
      title: "Pedido entregado",
      body: `El pedido de ${order.customerName} fue entregado.`,
      url: vendorUrl(),
    });
  }

  if (order.deliveryUser && order.deliveryUser.id !== opts.exceptUserId) {
    recipients.push({
      userId: order.deliveryUser.id,
      title: "Pedido entregado",
      body: `Entregaste el pedido de ${order.customerName}. ¡Gracias!`,
      url: driverUrl(),
    });
  }

  await Promise.allSettled(
    recipients.map((r) =>
      sendTextNotification(r.userId, {
        title: r.title,
        body: r.body,
        type: "ORDER_COMPLETED",
        url: r.url,
        orderId,
      }),
    ),
  );
}

export async function notifyOrderCancelled(orderId: string, opts: PhaseOptions = {}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      customerName: true,
      store: { select: { name: true, ownerId: true } },
      deliveryUser: { select: { id: true } },
    },
  });

  if (!order) return;

  const reasonText = opts.reason ? `\nMotivo: ${opts.reason}` : "";

  const recipients: { userId: string; title: string; body: string; url: string }[] = [];

  if (order.userId && order.userId !== opts.exceptUserId) {
    recipients.push({
      userId: order.userId,
      title: "Pedido cancelado",
      body: `Tu pedido en ${order.store?.name || "la tienda"} fue cancelado.${reasonText}`,
      url: customerUrl(orderId),
    });
  }

  if (order.store?.ownerId && order.store.ownerId !== opts.exceptUserId) {
    recipients.push({
      userId: order.store.ownerId,
      title: "Pedido cancelado",
      body: `El pedido de ${order.customerName} fue cancelado.${reasonText}`,
      url: vendorUrl(),
    });
  }

  if (order.deliveryUser && order.deliveryUser.id !== opts.exceptUserId) {
    recipients.push({
      userId: order.deliveryUser.id,
      title: "Pedido cancelado",
      body: `El pedido de ${order.customerName} fue cancelado.${reasonText}`,
      url: driverUrl(),
    });
  }

  await Promise.allSettled(
    recipients.map((r) =>
      sendTextNotification(r.userId, {
        title: r.title,
        body: r.body,
        type: "CANCELLED",
        url: r.url,
        orderId,
      }),
    ),
  );
}