import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { redirect } from "next/navigation";
import { formatMoney } from "@/lib/format";

function Stars({ score }: { score: number }) {
  return (
    <span className="text-yellow-500">
      {score.toFixed(1)} ★
    </span>
  );
}

export default async function AdminRankingPage() {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") redirect("/admin/login");

  const stores = await prisma.store.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      orders: {
        select: {
          rating: { select: { storeScore: true } },
        },
      },
    },
  });

  const storeRanking = stores
    .map((s) => {
      const scores = s.orders
        .map((o) => o.rating?.storeScore)
        .filter((s): s is number => s !== undefined && s !== null);
      const avg = scores.length > 0 ? scores.reduce((a, s) => a + s, 0) / scores.length : 0;
      return { id: s.id, name: s.name, slug: s.slug, avg, total: scores.length };
    })
    .sort((a, b) => b.avg - a.avg);

  const deliveryUsers = await prisma.user.findMany({
    where: { role: "DELIVERY" },
    select: {
      id: true,
      name: true,
      email: true,
      deliveries: {
        select: {
          rating: { select: { deliveryScore: true } },
        },
      },
    },
  });

  const deliveryRanking = deliveryUsers
    .map((d) => {
      const scores = d.deliveries
        .map((o) => o.rating?.deliveryScore)
        .filter((s): s is number => s !== undefined && s !== null);
      const avg = scores.length > 0 ? scores.reduce((a, s) => a + s, 0) / scores.length : 0;
      return { id: d.id, name: d.name || d.email, avg, total: scores.length };
    })
    .sort((a, b) => b.avg - a.avg);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Ranking de calificaciones</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Calificaciones promedio de tiendas y repartidores
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Tiendas</h2>
          </div>
          {storeRanking.length === 0 ? (
            <div className="p-5 text-center text-sm text-[color:var(--muted)]">
              Sin calificaciones
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {storeRanking.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 text-center text-sm font-bold ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-[color:var(--muted)]"}`}>
                      #{i + 1}
                    </span>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-[color:var(--muted)]">{s.total} opiniones</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold">
                    {s.total > 0 ? <Stars score={s.avg} /> : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Repartidores</h2>
          </div>
          {deliveryRanking.length === 0 ? (
            <div className="p-5 text-center text-sm text-[color:var(--muted)]">
              Sin calificaciones
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {deliveryRanking.map((d, i) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 text-center text-sm font-bold ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-[color:var(--muted)]"}`}>
                      #{i + 1}
                    </span>
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-[color:var(--muted)]">{d.total} opiniones</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold">
                    {d.total > 0 ? <Stars score={d.avg} /> : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
