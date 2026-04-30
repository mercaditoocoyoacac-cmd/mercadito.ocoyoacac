import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "mercadito-admin-secure-2024";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  name: z.string().min(2).max(80).optional(),
  phone: z.string().optional(),
  role: z.enum(["CUSTOMER", "VENDOR", "DELIVERY", "ADMIN"]).optional(),
  adminKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
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
      if (role === "VENDOR") {
        const updated = await prisma.user.update({
          where: { email: emailLower },
          data: { role: "VENDOR" },
          select: { id: true, email: true },
        });
        return NextResponse.json({ ok: true, user: updated, upgraded: true });
      }
      return NextResponse.json(
        { ok: false, error: "Ese correo ya está registrado." },
        { status: 409 },
      );
    }

    let userRole: "CUSTOMER" | "VENDOR" | "DELIVERY" | "ADMIN" = role ?? "CUSTOMER";

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

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { ok: false, error: "Error del servidor" },
      { status: 500 },
    );
  }
}

