import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { hasCompleteDocs } from "@/server/driverDocs";

const DOC_FIELDS = [
  "vehiclePhotoUrl",
  "licensePhotoUrl",
  "personPhotoUrl",
  "officialIdPhotoUrl",
] as const;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const data: Record<string, string | null> = {};
  let anyValue = false;
  for (const field of DOC_FIELDS) {
    const value = json?.[field];
    data[field] = typeof value === "string" && value.startsWith("https://") ? value : null;
    if (data[field]) anyValue = true;
  }

  if (!anyValue) {
    return NextResponse.json(
      { ok: false, error: "No se proporcionó ninguna foto." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      vehiclePhotoUrl: true,
      licensePhotoUrl: true,
      personPhotoUrl: true,
      officialIdPhotoUrl: true,
      driverDocsSubmittedAt: true,
      driverDocsApproved: true,
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  const merged = {
    vehiclePhotoUrl: data.vehiclePhotoUrl ?? user.vehiclePhotoUrl,
    licensePhotoUrl: data.licensePhotoUrl ?? user.licensePhotoUrl,
    personPhotoUrl: data.personPhotoUrl ?? user.personPhotoUrl,
    officialIdPhotoUrl: data.officialIdPhotoUrl ?? user.officialIdPhotoUrl,
    driverDocsApproved: user.driverDocsApproved,
  };

  const update: Record<string, unknown> = { ...data };
  if (hasCompleteDocs(merged) && !user.driverDocsSubmittedAt) {
    update.driverDocsSubmittedAt = new Date();
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: update,
  });

  return NextResponse.json({ ok: true, complete: hasCompleteDocs(merged) });
}