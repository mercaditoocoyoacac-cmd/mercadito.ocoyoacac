import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { updateStoreSchema as UpdateStoreSchema } from "@/lib/schemas";

const StoreSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido"),
  category: z.string().min(1).max(40).default("CANASTA_BASICA"),
  description: z.string().max(280).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(140).optional(),
  imageUrl: z.string().url().optional(),
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
      latitude: true,
      longitude: true,
      openTime: true,
      closeTime: true,
      scheduleDays: true,
      scheduleDetails: true,
      plan: true,
      createdAt: true,
      subscription: {
        select: {
          status: true,
          startDate: true,
          endDate: true,
          discountEndDate: true,
          createdAt: true,
        },
      },
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
        plan: "FREE",
      },
      select: { id: true, name: true, slug: true },
    });

    await prisma.user.update({
      where: { id: auth.userId },
      data: { role: "VENDOR" },
    });

  const s = store as any;
  return NextResponse.json({
    ok: true,
    store: s
      ? {
          id: s.id,
          name: s.name,
          slug: s.slug,
          category: s.category,
          description: s.description ?? null,
          phone: s.phone ?? null,
          address: s.address ?? null,
          imageUrl: s.imageUrl ?? null,
          isActive: s.isActive,
          latitude: s.latitude ?? null,
          longitude: s.longitude ?? null,
          openTime: s.openTime ?? null,
          closeTime: s.closeTime ?? null,
          scheduleDays: s.scheduleDays,
          scheduleDetails: s.scheduleDetails,
          createdAt: s.createdAt?.toISOString() ?? null,
          subscription: s.subscription
            ? {
                status: s.subscription.status,
                startDate: s.subscription.startDate.toISOString(),
                endDate: s.subscription.endDate.toISOString(),
                discountEndDate: s.subscription.discountEndDate?.toISOString() ?? null,
                createdAt: s.subscription.createdAt.toISOString(),
              }
            : null,
        }
      : null,
  });
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

    await prisma.store.update({
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
        latitude: parsed.data.latitude === undefined ? undefined : parsed.data.latitude,
        longitude: parsed.data.longitude === undefined ? undefined : parsed.data.longitude,
        openTime: parsed.data.openTime === undefined ? undefined : (parsed.data.openTime || null),
        closeTime: parsed.data.closeTime === undefined ? undefined : (parsed.data.closeTime || null),
        scheduleDays: parsed.data.scheduleDays,
        scheduleDetails: parsed.data.scheduleDetails,
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

