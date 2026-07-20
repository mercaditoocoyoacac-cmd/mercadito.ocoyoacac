import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "30")));
  const filter = searchParams.get("filter");

  const where: Record<string, unknown> = { userId: auth.userId };
  if (filter === "unread") where.read = false;
  else if (filter === "read") where.read = true;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return NextResponse.json({
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
