import { redirect } from "next/navigation";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { getUserRoles } from "@/server/requireUser";
import { PublicidadClient } from "./PublicidadClient";

export const revalidate = 0;

export default async function AdminPublicidadPage() {
  const session = await getSession();

  if (!session?.user?.id || session.user.isActive === false || !getUserRoles(session).includes("ADMIN")) {
    redirect("/");
  }

  const [campaigns, stores, categories] = await Promise.all([
    prisma.campaign.findMany({
      include: {
        createdBy: { select: { name: true, email: true } },
        store: { select: { id: true, name: true } },
        category: { select: { id: true, label: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.store.findMany({
      where: { isActive: true, isPublished: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, key: true, label: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <PublicidadClient
      campaigns={campaigns.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : null,
        sentAt: c.sentAt ? c.sentAt.toISOString() : null,
      }))}
      stores={stores}
      categories={categories}
    />
  );
}
