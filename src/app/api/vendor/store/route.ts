import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const StoreSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido"),
  category: z.enum(["CANASTA_BASICA", "HERRAMIENTAS", "FLORERIAS", "POSTRES", "COMIDA_PREPARADA", "FRUTAS_VERDURAS", "FARMACIAS", "SERVICIOS"]).default("CANASTA_BASICA"),
  description: z.string().max(280).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(140).optional(),
  imageUrl: z.string().url().optional(),
});

const UpdateStoreSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  category: z.enum(["CANASTA_BASICA", "HERRAMIENTAS", "FLORERIAS", "POSTRES", "COMIDA_PREPARADA", "FRUTAS_VERDURAS", "FARMACIAS", "SERVICIOS"]).optional(),
  description: z.string().max(280).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(140).optional(),
  imageUrl: z.string().url().nullable().optional(),
  openTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  closeTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  scheduleDays: z.array(z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])).min(1).optional(),
});

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      description: true,
      phone: true,
      address: true,
      imageUrl: true,
      isActive: true,
      openTime: true,
      closeTime: true,
      scheduleDays: true,
    },
  });

  return NextResponse.json({ ok: true, store });
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.res;

    const json = await req.json().catch(() => null);
    const parsed = StoreSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos inválidos: " + parsed.error.issues.map(e => e.message).join(", ") },
        { status: 400 },
      );
    }

    const existing = await prisma.store.findFirst({
      where: { ownerId: auth.userId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Ya tienes una tienda creada." },
        { status: 409 },
      );
    }

    const slug = parsed.data.slug.toLowerCase();
    const taken = await prisma.store.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json(
        { ok: false, error: "Ese slug ya está en uso." },
        { status: 409 },
      );
    }

    const store = await prisma.store.create({
      data: {
        name: parsed.data.name.trim(),
        slug,
        category: parsed.data.category,
        description: parsed.data.description?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        address: parsed.data.address?.trim() || null,
        imageUrl: parsed.data.imageUrl ?? null,
        ownerId: auth.userId,
        isPublished: true,
      },
      select: { id: true, name: true, slug: true },
    });

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 15);

    await prisma.subscription.create({
      data: {
        storeId: store.id,
        status: "TRIAL",
        startDate: new Date(),
        endDate: trialEnd,
        monthlyPriceCents: 49600,
        contractSigned: false,
      },
    });

    await prisma.user.update({
      where: { id: auth.userId },
      data: { role: "VENDOR" },
    });

    return NextResponse.json({ ok: true, store });
  } catch (error) {
    console.error("[vendor/store] Error creating store:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: "Error al crear la tienda: " + msg },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.res;

    const store = await prisma.store.findFirst({
      where: { ownerId: auth.userId },
      select: { id: true },
    });
    if (!store) {
      return NextResponse.json({ ok: false, error: "No tienes tienda creada." }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = UpdateStoreSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos inválidos: " + parsed.error.issues.map(e => e.message).join(", ") },
        { status: 400 },
      );
    }

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: {
        name: parsed.data.name?.trim(),
        category: parsed.data.category,
        description:
          parsed.data.description === undefined
            ? undefined
            : parsed.data.description?.trim() || null,
        phone:
          parsed.data.phone === undefined
            ? undefined
            : parsed.data.phone?.trim() || null,
        address:
          parsed.data.address === undefined
            ? undefined
            : parsed.data.address?.trim() || null,
        imageUrl: parsed.data.imageUrl,
        openTime: parsed.data.openTime === undefined ? undefined : (parsed.data.openTime || null),
        closeTime: parsed.data.closeTime === undefined ? undefined : (parsed.data.closeTime || null),
        scheduleDays: parsed.data.scheduleDays,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[vendor/store] PUT Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: "Error al guardar: " + msg },
      { status: 500 },
    );
  }
}

