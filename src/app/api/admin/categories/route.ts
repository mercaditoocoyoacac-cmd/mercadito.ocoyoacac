import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  key: z.string().min(1).max(40).regex(/^[A-Z0-9_]+$/),
  label: z.string().min(1).max(80),
  icon: z.string().max(10).default("🏪"),
  sortOrder: z.number().int().min(0).default(0),
});

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ ok: true, categories });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({ where: { key: parsed.data.key } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Ya existe una categoría con esa clave" }, { status: 409 });
  }

  const category = await prisma.category.create({ data: parsed.data });

  return NextResponse.json({ ok: true, category });
}
