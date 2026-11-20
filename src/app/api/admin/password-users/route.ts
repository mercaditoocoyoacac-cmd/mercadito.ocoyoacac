import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { isResettableUser } from "@/lib/adminPassword";
import { parseRoles } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const query = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { email: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, email: true, role: true, additionalRoles: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    take: 50,
  });

  return NextResponse.json({
    ok: true,
    users: users.filter(isResettableUser).map((user) => ({
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      role: user.role,
      label: parseRoles(user.role, user.additionalRoles).includes("VENDOR") ? "Vendedor" : "Repartidor",
    })),
  });
}
