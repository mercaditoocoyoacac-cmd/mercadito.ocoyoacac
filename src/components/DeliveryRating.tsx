import { prisma } from "@/server/prisma";

export default async function DeliveryRating({ deliveryUserId }: { deliveryUserId: string }) {
  const ratings = await prisma.orderRating.findMany({
    where: { order: { deliveryUserId }, deliveryScore: { not: null } },
    select: { deliveryScore: true },
  });

  const avg = ratings.length > 0
    ? (ratings.reduce((a, r) => a + r.deliveryScore!, 0) / ratings.length).toFixed(1)
    : null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-right shadow-sm">
      <div className="text-xs text-[color:var(--muted)]">Calificación</div>
      <div className="text-xl font-bold">
        {avg ? <span className="text-yellow-500">{avg} ★</span> : "—"}
      </div>
      <div className="text-xs text-[color:var(--muted)]">
        {ratings.length} opiniones
      </div>
    </div>
  );
}
