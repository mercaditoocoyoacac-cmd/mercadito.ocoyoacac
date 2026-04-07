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
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = StoreSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos." },
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
      description: parsed.data.description?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      address: parsed.data.address?.trim() || null,
      imageUrl: parsed.data.imageUrl ?? null,
      ownerId: auth.userId,
    },
    select: { id: true, name: true, slug: true },
  });

  await prisma.user.update({
    where: { id: auth.userId },
    data: { role: "VENDOR" },
  });

  return NextResponse.json({ ok: true, store });
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });
  if (!store) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = UpdateStoreSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos." },
      { status: 400 },
    );
  }

  await prisma.store.update({
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

  return NextResponse.json({ ok: true });
}

