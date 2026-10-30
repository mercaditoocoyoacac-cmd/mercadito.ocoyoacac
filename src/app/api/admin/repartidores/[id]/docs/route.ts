import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

const DOC_FIELDS = [
  "vehiclePhotoUrl",
  "licensePhotoUrl",
  "personPhotoUrl",
  "officialIdPhotoUrl",
] as const;

type DocField = (typeof DOC_FIELDS)[number];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!json || typeof json !== "object") {
    return NextResponse.json({ ok: false, error: "Solicitud inválida" }, { status: 400 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const allowedPrefix = cloudName ? `https://res.cloudinary.com/${cloudName}/` : null;

  const update: Partial<Record<DocField, string | null>> = {};
  for (const field of DOC_FIELDS) {
    if (!(field in json)) continue;
    const value = json[field];
    if (value === null) {
      update[field] = null;
      continue;
    }
    const valid =
      typeof value === "string" &&
      value.startsWith("https://") &&
      (!allowedPrefix || value.startsWith(allowedPrefix));
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "La foto debe ser una URL válida de Cloudinary" },
        { status: 400 },
      );
    }
    update[field] = value;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "No se recibieron fotos" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      role: true,
      additionalRoles: true,
      vehiclePhotoUrl: true,
      licensePhotoUrl: true,
      personPhotoUrl: true,
      officialIdPhotoUrl: true,
      driverDocsSubmittedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  const roles = [user.role, ...(user.additionalRoles?.split(",").filter(Boolean) ?? [])];
  if (!roles.includes("DELIVERY")) {
    return NextResponse.json(
      { ok: false, error: "El usuario no tiene rol de repartidor" },
      { status: 400 },
    );
  }

  const resolved = (field: DocField) =>
    field in update ? update[field] ?? null : user[field];

  const merged = {
    vehiclePhotoUrl: resolved("vehiclePhotoUrl"),
    licensePhotoUrl: resolved("licensePhotoUrl"),
    personPhotoUrl: resolved("personPhotoUrl"),
    officialIdPhotoUrl: resolved("officialIdPhotoUrl"),
  };

  const complete = Boolean(
    merged.vehiclePhotoUrl &&
      merged.licensePhotoUrl &&
      merged.personPhotoUrl &&
      merged.officialIdPhotoUrl,
  );

  const data: Record<string, unknown> = { ...update };
  if (complete && !user.driverDocsSubmittedAt) {
    data.driverDocsSubmittedAt = new Date();
  }

  await prisma.user.update({ where: { id }, data });

  return NextResponse.json({ ok: true, complete, photos: merged });
}
