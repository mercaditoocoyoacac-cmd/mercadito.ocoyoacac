import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { rateLimit } from "@/lib/rate-limit";
import { adminPasswordSchema, isResettableUser } from "@/lib/adminPassword";
import { sendTextNotification } from "@/server/notifications";

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const limited = await rateLimit(`admin-password:${auth.userId}`, { intervalMs: 3600_000, max: 10 });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiados cambios de contraseña. Intenta más tarde." },
      { status: 429 },
    );
  }

  const parsed = adminPasswordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const { userId, password } = parsed.data;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, additionalRoles: true, isActive: true },
  });

  if (!target) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  }
  if (!target.isActive) {
    return NextResponse.json({ ok: false, error: "La cuenta está desactivada" }, { status: 400 });
  }
  if (!isResettableUser(target)) {
    return NextResponse.json(
      { ok: false, error: "Solo se puede cambiar la contraseña de vendedores y repartidores" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash,
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
      lockoutUntil: null,
    },
  });

  const notified = await sendTextNotification(target.id, {
    title: "Contraseña actualizada",
    body: "El administrador actualizó tu contraseña. Si no fuiste tú, contacta al soporte.",
    type: "SECURITY",
    url: "/login",
  })
    .then(() => true)
    .catch(() => false);

  return NextResponse.json({ ok: true, email: target.email, notified });
}
