import { z } from "zod";
import { parseRoles } from "@/lib/roles";

export const PASSWORD_MIN_LENGTH = 12;

export const adminPasswordSchema = z.object({
  userId: z.string().min(1, "Falta el usuario"),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .max(128, "La contraseña no puede superar los 128 caracteres")
    .regex(/[A-Za-z]/, "La contraseña debe incluir al menos una letra")
    .regex(/[0-9]/, "La contraseña debe incluir al menos un número"),
});

interface ResetTarget {
  role: string;
  additionalRoles: string | null;
}

export function isResettableUser(user: ResetTarget): boolean {
  const roles = parseRoles(user.role, user.additionalRoles);
  if (roles.includes("ADMIN") || roles.includes("DISPATCH")) return false;
  return roles.includes("VENDOR") || roles.includes("DELIVERY");
}
