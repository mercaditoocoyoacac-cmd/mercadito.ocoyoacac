import { prisma } from "@/server/prisma";
import { haversineDistance } from "@/lib/geo";

const MAX_ACTIVE_DELIVERIES = 3;

export async function autoAssignDelivery(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      customerLat: true,
      customerLng: true,
      store: { select: { address: true } },
    },
  });

  if (!order) return null;

  const drivers = await prisma.user.findMany({
    where: {
      role: "DELIVERY",
      isActive: true,
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      _count: {
        select: {
          deliveries: {
            where: {
              status: { in: ["OUT_FOR_DELIVERY", "READY", "CONFIRMED"] },
            },
          },
        },
      },
    },
  });

  const availableDrivers = drivers.filter((d) => d._count.deliveries < MAX_ACTIVE_DELIVERIES);

  if (availableDrivers.length === 0) return null;

  const targetLat = order.customerLat ?? 19.2929;
  const targetLng = order.customerLng ?? -99.3719;

  const driversWithDistance = availableDrivers
    .filter((d) => d.latitude !== null && d.longitude !== null)
    .map((d) => ({
      id: d.id,
      distance: haversineDistance(d.latitude!, d.longitude!, targetLat, targetLng),
    }))
    .sort((a, b) => a.distance - b.distance);

  if (driversWithDistance.length === 0) return null;

  const nearestDriver = driversWithDistance[0];

  await prisma.order.update({
    where: { id: orderId },
    data: {
      deliveryUserId: nearestDriver.id,
      status: "READY",
    },
  });

  return {
    driverId: nearestDriver.id,
    distanceKm: nearestDriver.distance,
  };
}
