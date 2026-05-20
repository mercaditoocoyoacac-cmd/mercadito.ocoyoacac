import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

const UpdateStoreSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  category: z.enum(["CANASTA_BASICA", "HERRAMIENTAS", "FLORERIAS", "POSTRES", "COMIDA_PREPARADA", "FRUTAS_VERDURAS", "FARMACIAS", "SERVICIOS"]).optional(),
  description: z.string().max(280).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(140).optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  openTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  closeTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  scheduleDays: z.array(z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])).min(1).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;

    const store = await prisma.store.findUnique({ where: { id }, select: { id: true } });
    if (!store) {
      return NextResponse.json({ ok: false, error: "Tienda no encontrada" }, { status: 404 });
    }

    const json = await req.json().catch(() => null);
    const parsed = UpdateStoreSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos inválidos: " + parsed.error.issues.map(e => e.message).join(", ") },
        { status: 400 },
      );
    }

    await prisma.store.update({
      where: { id },
      data: {
        name: parsed.data.name?.trim(),
        category: parsed.data.category,
        description: parsed.data.description === undefined ? undefined : (parsed.data.description?.trim() || null),
        phone: parsed.data.phone === undefined ? undefined : (parsed.data.phone?.trim() || null),
        address: parsed.data.address === undefined ? undefined : (parsed.data.address?.trim() || null),
        imageUrl: parsed.data.imageUrl,
        isActive: parsed.data.isActive,
        isPublished: parsed.data.isPublished,
        openTime: parsed.data.openTime === undefined ? undefined : (parsed.data.openTime || null),
        closeTime: parsed.data.closeTime === undefined ? undefined : (parsed.data.closeTime || null),
        scheduleDays: parsed.data.scheduleDays,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/stores] PUT Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: "Error al guardar: " + msg }, { status: 500 });
  }
}
