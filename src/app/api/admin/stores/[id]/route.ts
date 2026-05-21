import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { updateStoreSchemaAdmin as UpdateStoreSchema } from "@/lib/schemas";

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
        latitude: parsed.data.latitude === undefined ? undefined : parsed.data.latitude,
        longitude: parsed.data.longitude === undefined ? undefined : parsed.data.longitude,
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
