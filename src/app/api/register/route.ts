import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { sendPushToAdmins } from "@/server/push";

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "mercadito-admin-secure-2024";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  name: z.string().min(2).max(80).optional(),
  phone: z.string().refine((v) => v.replace(/\D/g, "").length >= 10, "El teléfono debe tener al menos 10 dígitos"),
  role: z.enum(["CUSTOMER", "VENDOR", "DELIVERY", "ADMIN"]).optional(),
  adminKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const rlKey = `register:${ip}`;
    const rl = await rateLimit(rlKey, { intervalMs: 3600_000, max: 5 });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Demasiados registros desde esta IP. Intenta más tarde." },
        { status: 429 },
      );
    }

    const json = await req.json().catch(() => null);
    const parsed = RegisterSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Datos inválidos: " + parsed.error.issues.map(e => e.message).join(", ") },
        { status: 400 },
      );
    }

    const { email, password, name, phone, role, adminKey } = parsed.data;
    const emailLower = email.toLowerCase().trim();

    const exists = await prisma.user.findUnique({ where: { email: emailLower } });
    if (exists) {
      const upgradeRole = role || "CUSTOMER";

      if (exists.role === upgradeRole) {
        return NextResponse.json(
          { ok: false, error: `Ya tienes el rol de ${upgradeRole === "VENDOR" ? "vendedor" : upgradeRole === "DELIVERY" ? "repartidor" : "cliente"}.` },
          { status: 409 },
        );
      }

      const additional = [exists.role, ...(exists.additionalRoles ? exists.additionalRoles.split(",") : [])]
        .filter((r) => r !== upgradeRole)
        .join(",");
      const updated = await prisma.user.update({
        where: { email: emailLower },
        data: { role: upgradeRole as "CUSTOMER" | "VENDOR" | "DELIVERY" | "ADMIN", additionalRoles: additional || null },
        select: { id: true, email: true },
      });
      const roleLabels2: Record<string, string> = { CUSTOMER: "Cliente", VENDOR: "Vendedor", DELIVERY: "Repartidor", ADMIN: "Admin" };
      await sendPushToAdmins({
        title: "🆕 Actualización de rol",
        body: `${exists.name || emailLower} ahora también es ${roleLabels2[upgradeRole] || upgradeRole}`,
        url: "/admin/usuarios",
        type: "NEW_USER",
      });
      return NextResponse.json({ ok: true, user: updated, upgraded: true });
    }

    const userRole: "CUSTOMER" | "VENDOR" | "DELIVERY" | "ADMIN" = role ?? "CUSTOMER";

    if (userRole === "ADMIN" && adminKey !== ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { ok: false, error: "Clave de administrador inválida." },
        { status: 403 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const cleanPhone = phone?.replace(/\D/g, "") || null;
    
    const user = await prisma.user.create({
      data: {
        email: emailLower,
        name: name?.trim() || null,
        phone: cleanPhone,
        phoneVerified: cleanPhone ? true : undefined,
        passwordHash,
        role: userRole,
      },
      select: { id: true, email: true },
    });

    // Notify admins of new registration
    const roleLabels: Record<string, string> = { CUSTOMER: "Cliente", VENDOR: "Vendedor", DELIVERY: "Repartidor", ADMIN: "Admin" };
    await sendPushToAdmins({
      title: "🆕 Nuevo registro",
      body: `${name?.trim() || emailLower} se registró como ${roleLabels[userRole] || userRole}`,
      url: "/admin/usuarios",
      type: "NEW_USER",
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { ok: false, error: "Error del servidor" },
      { status: 500 },
    );
  }
}

