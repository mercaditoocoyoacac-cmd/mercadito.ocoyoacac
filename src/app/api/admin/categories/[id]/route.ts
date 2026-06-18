import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

const updateSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  icon: z.string().max(10).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { id } = await params;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Categoría no encontrada" }, { status: 404 });
  }

  const category = await prisma.category.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, category });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ ok: false, error: "Categoría no encontrada" }, { status: 404 });
  }

  const storeCount = await prisma.store.count({ where: { category: category.key } });
  if (storeCount > 0) {
    return NextResponse.json({ ok: false, error: `No se puede eliminar: ${storeCount} tienda(s) usan esta categoría` }, { status: 409 });
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
