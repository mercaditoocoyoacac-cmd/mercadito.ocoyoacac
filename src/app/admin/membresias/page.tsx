import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { getUserRoles } from "@/server/requireUser";
import { formatDateInMexico } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export const revalidate = 30;

const FULL_PRICE_CENTS = 83_000;
const DISCOUNTED_PRICE_CENTS = 49_800;
const GRACE_PERIOD_CUTOFF = new Date("2026-08-01");

export default async function AdminSubscriptionsPage() {
  const session = await getSession();

  if (!session?.user?.id || session.user.isActive === false || !getUserRoles(session).includes("ADMIN")) {
    redirect("/");
  }

  const stores = await prisma.store.findMany({
    include: {
      owner: { select: { id: true, email: true, name: true, isActive: true, trialUsed: true } },
      subscription: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const today = new Date();
  const trialStores = stores.filter(
    (s) => s.subscription?.status === "TRIAL" && new Date(s.subscription.endDate) > today
  );
  const activeStores = stores.filter(
    (s) => s.subscription?.status === "ACTIVE" && new Date(s.subscription.endDate) > today
  );
  const expiredStores = stores.filter(
    (s) =>
      !s.subscription ||
      s.subscription.status === "EXPIRED" ||
      s.subscription.status === "CANCELLED" ||
      new Date(s.subscription.endDate) <= today
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Gestión de Membresías
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Administra las membresías de las tiendas
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-5">
          <div className="text-sm text-emerald-700">Prueba gratuita</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700">
            {trialStores.length}
          </div>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-50 p-5">
          <div className="text-sm text-blue-700">Suscripciones activas</div>
          <div className="mt-1 text-2xl font-semibold text-blue-700">
            {activeStores.length}
          </div>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-50 p-5">
          <div className="text-sm text-red-700">Vencidas / Sin suscripción</div>
          <div className="mt-1 text-2xl font-semibold text-red-700">
            {expiredStores.length}
          </div>
        </div>
      </div>

      {trialStores.length > 0 && (
        <div className="mb-8 rounded-xl border border-emerald-500/30 bg-emerald-50/50">
          <div className="border-b border-emerald-500/30 px-5 py-4">
            <h2 className="font-semibold text-emerald-800">
              🔥 En prueba gratuita ({trialStores.length})
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {trialStores.map((store) => {
              const sub = store.subscription!;
              const daysLeft = Math.ceil((new Date(sub.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div key={store.id} className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{store.name}</div>
                      <div className="text-sm text-[color:var(--muted)]">
                        {store.owner.name || store.owner.email}
                      </div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {store.owner.email}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        🧪 Prueba
                      </div>
                      <div className="text-xs mt-1 text-emerald-700 font-medium">
                        {daysLeft} días restantes
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-[color:var(--muted)]">
                    Inicio: {formatDateInMexico(sub.startDate)} | 
                    Fin: {formatDateInMexico(sub.endDate)}
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-700">
                    Al terminar prueba: {formatMoney(DISCOUNTED_PRICE_CENTS)}/mes (40% desc.) primeros 12 meses, luego {formatMoney(FULL_PRICE_CENTS)}/mes
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {store.isPublished ? (
                      <form action={async () => {
                        "use server";
                        await prisma.store.update({
                          where: { id: store.id },
                          data: { isPublished: false },
                        });
                        revalidatePath("/admin/membresias");
                      }}>
                        <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                          Desactivar tienda
                        </button>
                      </form>
                    ) : (
                      <form action={async () => {
                        "use server";
                        await prisma.store.update({
                          where: { id: store.id },
                          data: { isPublished: true },
                        });
                        revalidatePath("/admin/membresias");
                      }}>
                        <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                          Activar tienda
                        </button>
                      </form>
                    )}
                    <form action={async () => {
                      "use server";
                      const endDate = new Date();
                      endDate.setMonth(endDate.getMonth() + 1);
                      const discountEnd = new Date();
                      discountEnd.setFullYear(discountEnd.getFullYear() + 1);
                      await prisma.subscription.update({
                        where: { storeId: store.id },
                        data: {
                          status: "ACTIVE",
                          endDate,
                          monthlyPriceCents: FULL_PRICE_CENTS,
                          discountEndDate: discountEnd,
                        },
                      });
                      await prisma.store.update({
                        where: { id: store.id },
                        data: { isPublished: true },
                      });
                      revalidatePath("/admin/membresias");
                    }}>
                      <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                        Convertir a activo ({formatMoney(FULL_PRICE_CENTS)})
                      </button>
                    </form>
                    <form action={async () => {
                      "use server";
                      const trialEnd = new Date();
                      trialEnd.setDate(trialEnd.getDate() + 30);
                      await prisma.subscription.update({
                        where: { storeId: store.id },
                        data: {
                          status: "TRIAL",
                          startDate: new Date(),
                          endDate: trialEnd,
                        },
                      });
                      revalidatePath("/admin/membresias");
                    }}>
                      <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                        Reactivar prueba
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-semibold">Todas las tiendas ({stores.length})</h2>
        </div>
        {stores.length === 0 ? (
          <div className="p-5 text-center text-sm text-[color:var(--muted)]">
            No hay tiendas registradas.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {stores.map((store) => {
              const sub = store.subscription;
              const isActive = sub?.status === "ACTIVE" && new Date(sub.endDate) > today;
              const isTrial = sub?.status === "TRIAL" && new Date(sub.endDate) > today;
              const daysLeft = sub ? Math.ceil((new Date(sub.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

              return (
                <div key={store.id} className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{store.name}</div>
                      <div className="text-sm text-[color:var(--muted)]">
                        {store.owner.name || store.owner.email}
                      </div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {store.owner.email}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        store.isPublished
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {store.isPublished ? "Activa" : "Inactiva"}
                      </div>
                      {isTrial && (
                        <div className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                          🧪 Prueba ({daysLeft}d)
                        </div>
                      )}
                      {sub && (
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          isActive
                            ? "bg-blue-100 text-blue-800"
                            : sub.status === "EXPIRED" || sub.status === "CANCELLED"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {isActive ? "Activa" : sub.status === "TRIAL" ? "Prueba" : sub.status === "EXPIRED" ? "Expirada" : sub.status === "CANCELLED" ? "Cancelada" : "Sin membresía"}
                        </div>
                      )}
                    </div>
                  </div>
                  {store.owner.trialUsed && (
                    <div className="mt-2 flex items-center gap-2 text-xs px-2 py-1 rounded-lg bg-amber-50 border border-amber-200">
                      <span className="text-amber-600">⚠️</span>
                      <span className="text-amber-700 font-medium">Ya utilizó su período de prueba de 30 días</span>
                    </div>
                  )}
                  {store.createdAt < GRACE_PERIOD_CUTOFF && (
                    <div className="mt-1 flex items-center gap-2 text-xs px-2 py-1 rounded-lg bg-purple-50 border border-purple-200">
                      <span className="text-purple-600">🎁</span>
                      <span className="text-purple-700 font-medium">Período de gracia beta — gratis hasta agosto 2026</span>
                    </div>
                  )}
                  {sub && (
                    <div className="mt-2 text-xs text-[color:var(--muted)]">
                      Inicio: {formatDateInMexico(sub.startDate)} | 
                      Fin: {formatDateInMexico(sub.endDate)}
                    </div>
                  )}
                  {sub && sub.status === "ACTIVE" && (
                    <div className="mt-1 text-[11px] text-[color:var(--muted)] space-x-2">
                      <span>Precio: {formatMoney(sub.monthlyPriceCents)}/mes</span>
                      {sub.discountEndDate && new Date(sub.discountEndDate) > today && (
                        <span className="text-green-600 font-medium">
                          🏷️ Descuento 40% activo hasta {formatDateInMexico(sub.discountEndDate)}
                          ({Math.ceil((new Date(sub.discountEndDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} días)
                        </span>
                      )}
                      {sub.discountEndDate && new Date(sub.discountEndDate) <= today && (
                        <span className="text-orange-600">Descuento vencido — precio completo</span>
                      )}
                      {sub.paymentReference && (
                        <span className="text-blue-600">| Ref: {sub.paymentReference}</span>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    {!store.isPublished && (
                      <form action={async () => {
                        "use server";
                        await prisma.store.update({
                          where: { id: store.id },
data: { isPublished: true },
                        });
                        revalidatePath("/admin/membresias");
                      }}>
                        <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                          Activar tienda
                        </button>
                      </form>
                    )}
                    {store.isPublished && (
                      <form action={async () => {
                        "use server";
                        await prisma.store.update({
                          where: { id: store.id },
                          data: { isPublished: false },
                        });
                        revalidatePath("/admin/membresias");
                      }}>
                        <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                          Desactivar tienda
                        </button>
                      </form>
                    )}
                    <form action={async () => {
                      "use server";
                      const endDate = new Date();
                      endDate.setMonth(endDate.getMonth() + 1);
                      const now = new Date();
                      const existingSub = await prisma.subscription.findUnique({ where: { storeId: store.id } });
                      const isFirstPayment = !existingSub || existingSub.status !== "ACTIVE";
                      const discountEnd = isFirstPayment
                        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
                        : existingSub.discountEndDate && existingSub.discountEndDate > now
                          ? existingSub.discountEndDate
                          : null;
                      await prisma.subscription.upsert({
                        where: { storeId: store.id },
                        create: {
                          storeId: store.id,
                          status: "ACTIVE",
                          endDate,
                          monthlyPriceCents: FULL_PRICE_CENTS,
                          discountEndDate: discountEnd,
                        },
                        update: {
                          status: "ACTIVE",
                          endDate,
                          discountEndDate: discountEnd,
                          monthlyPriceCents: FULL_PRICE_CENTS,
                        },
                      });
                      await prisma.store.update({
                        where: { id: store.id },
                        data: { isPublished: true },
                      });
                      revalidatePath("/admin/membresias");
                    }}>
                      <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                        Renovar membresía ({formatMoney(FULL_PRICE_CENTS)})
                      </button>
                    </form>
                    {!sub || (sub.status !== "TRIAL" && !isTrial) ? (
                    <form action={async () => {
                      "use server";
                      const trialEnd = new Date();
                      trialEnd.setDate(trialEnd.getDate() + 30);
                      await prisma.subscription.upsert({
                        where: { storeId: store.id },
                        create: {
                          storeId: store.id,
                          status: "TRIAL",
                          startDate: new Date(),
                          endDate: trialEnd,
                          monthlyPriceCents: DISCOUNTED_PRICE_CENTS,
                        },
                        update: {
                          status: "TRIAL",
                          startDate: new Date(),
                          endDate: trialEnd,
                        },
                      });
                        if (!store.owner.trialUsed) {
                          await prisma.user.update({
                            where: { id: store.owner.id },
                            data: { trialUsed: true },
                          });
                        }
                        revalidatePath("/admin/membresias");
                      }}>
                        <button className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
                          store.owner.trialUsed
                            ? "bg-amber-500 hover:bg-amber-600"
                            : "bg-emerald-500 hover:bg-emerald-600"
                        }`}>
                          {store.owner.trialUsed ? "Reactivar prueba ⚠️" : "🧪 Activar prueba"}
                        </button>
                      </form>
                    ) : (
                      <form action={async () => {
                        "use server";
                        await prisma.subscription.update({
                          where: { storeId: store.id },
                          data: { status: "EXPIRED" },
                        });
                        revalidatePath("/admin/membresias");
                      }}>
                        <button className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600">
                          Desactivar prueba
                        </button>
                      </form>
                    )}
                    <form action={async () => {
                      "use server";
                      await prisma.user.update({
                        where: { id: store.owner.id },
                        data: { trialUsed: !store.owner.trialUsed },
                      });
                      revalidatePath("/admin/membresias");
                    }}>
                      <button className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
                        store.owner.trialUsed
                          ? "bg-red-400 hover:bg-red-500"
                          : "bg-gray-400 hover:bg-gray-500"
                      }`}>
                        {store.owner.trialUsed ? "✓ Prueba usada" : "✗ Prueba disponible"}
                      </button>
                    </form>
                    {store.owner.isActive ? (
                      <form action={async () => {
                        "use server";
                        await prisma.user.update({
                          where: { id: store.owner.id },
                          data: { isActive: false },
                        });
                        revalidatePath("/admin/membresias");
                      }}>
                        <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                          Suspender vendedor
                        </button>
                      </form>
                    ) : (
                      <form action={async () => {
                        "use server";
                        await prisma.user.update({
                          where: { id: store.owner.id },
                          data: { isActive: true },
                        });
                        revalidatePath("/admin/membresias");
                      }}>
                        <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                          Activar vendedor
                        </button>
                      </form>
                    )}
                    <form action={async () => {
                      "use server";
                      await prisma.store.update({
                        where: { id: store.id },
                        data: { acceptsMercadoPago: !store.acceptsMercadoPago },
                      });
                      revalidatePath("/admin/membresias");
                    }}>
                      <button className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                        store.acceptsMercadoPago
                          ? "bg-yellow-500 text-white hover:bg-yellow-600"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}>
                        {store.acceptsMercadoPago ? "MercadoPago ✓" : "MercadoPago ✗"}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}