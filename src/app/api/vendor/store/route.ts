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
  description: z.string().max(280).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(140).optional(),
  imageUrl: z.string().url().optional(),
});

const UpdateStoreSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(280).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(140).optional(),
  imageUrl: z.string().url().nullable().optional(),
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
      description: true,
      phone: true,
      address: true,
      imageUrl: true,
      isActive: true,
    },
  });

  return NextResponse.json({ ok: true, store });
}

export async function POST(req: Request) {
  try {
    console.log("[vendor/store] POST request received");
    const auth = await requireUser();
    if (!auth.ok) {
      console.log("[vendor/store] Auth failed");
      return auth.res;
    }
    console.log("[vendor/store] Auth OK, userId:", auth.userId);

    const json = await req.json().catch(() => null);
    console.log("[vendor/store] Request body:", JSON.stringify(json));
    const parsed = StoreSchema.safeParse(json);
    if (!parsed.success) {
      console.log("[vendor/store] Validation failed:", parsed.error.issues);
      return NextResponse.json(
        { ok: false, error: "Datos inválidos: " + parsed.error.issues.map(e => e.message).join(", ") },
        { status: 400 },
      );
    }
    console.log("[vendor/store] Validation OK");

    const existing = await prisma.store.findFirst({
      where: { ownerId: auth.userId },
      select: { id: true },
    });
    if (existing) {
      console.log("[vendor/store] Store already exists");
      return NextResponse.json(
        { ok: false, error: "Ya tienes una tienda creada." },
        { status: 409 },
      );
    }
    console.log("[vendor/store] No existing store");

    const slug = parsed.data.slug.toLowerCase();
    const taken = await prisma.store.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (taken) {
      console.log("[vendor/store] Slug taken:", slug);
      return NextResponse.json(
        { ok: false, error: "Ese slug ya está en uso." },
        { status: 409 },
      );
    }
    console.log("[vendor/store] Slug available");

    console.log("[vendor/store] Creating store...");
    const store = await prisma.store.create({
      data: {
        name: parsed.data.name.trim(),
        slug,
        description: parsed.data.description?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        address: parsed.data.address?.trim() || null,
        imageUrl: parsed.data.imageUrl ?? null,
        ownerId: auth.userId,
      },
      select: { id: true, name: true, slug: true },
    });
    console.log("[vendor/store] Store created:", store.id);

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 15);
    console.log("[vendor/store] Creating subscription...");

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
    console.log("[vendor/store] Subscription created");

    await prisma.user.update({
      where: { id: auth.userId },
      data: { role: "VENDOR" },
    });
    console.log("[vendor/store] User role updated");

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
    console.log("[vendor/store] PUT request:", JSON.stringify(json));
    const parsed = UpdateStoreSchema.safeParse(json);
    if (!parsed.success) {
      console.log("[vendor/store] PUT validation failed:", parsed.error.issues);
      return NextResponse.json(
        { ok: false, error: "Datos inválidos: " + parsed.error.issues.map(e => e.message).join(", ") },
        { status: 400 },
      );
    }

    console.log("[vendor/store] Updating store...");
    const updated = await prisma.store.update({
      where: { id: store.id },
      data: {
        name: parsed.data.name?.trim(),
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
      },
    });
    console.log("[vendor/store] Store updated:", updated.id);

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

