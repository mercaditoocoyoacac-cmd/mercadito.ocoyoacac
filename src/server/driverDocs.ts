import type { User } from "@prisma/client";

export const DRIVER_DOCS_DEADLINE = new Date("2026-10-15T06:00:00.000Z");

export type DriverDocsUser = Pick<
  User,
  "vehiclePhotoUrl" | "licensePhotoUrl" | "personPhotoUrl" | "officialIdPhotoUrl"
>;

const DOC_FIELDS: { key: keyof DriverDocsUser; label: string }[] = [
  { key: "vehiclePhotoUrl", label: "foto del vehículo" },
  { key: "licensePhotoUrl", label: "licencia de conducir" },
  { key: "personPhotoUrl", label: "foto de la persona" },
  { key: "officialIdPhotoUrl", label: "identificación oficial" },
];

export function hasCompleteDocs(user: DriverDocsUser): boolean {
  return DOC_FIELDS.every((f) => Boolean(user[f.key]));
}

export function missingDocs(user: DriverDocsUser): string[] {
  return DOC_FIELDS.filter((f) => !user[f.key]).map((f) => f.label);
}

const ROLE_PRIORITY: Record<string, number> = { VENDOR: 0, CUSTOMER: 1, ADMIN: 2 };

export function stripDeliveryRole(user: {
  role: string;
  additionalRoles: string | null;
}): { role: string; additionalRoles: string | null } {
  const roles = [
    user.role,
    ...(user.additionalRoles ? user.additionalRoles.split(",") : []),
  ]
    .filter((r) => r && r !== "DELIVERY")
    .sort((a, b) => (ROLE_PRIORITY[a] ?? 9) - (ROLE_PRIORITY[b] ?? 9));

  if (roles.length === 0) roles.push("CUSTOMER");

  const [primary, ...rest] = roles;
  return {
    role: primary,
    additionalRoles: rest.length > 0 ? rest.join(",") : null,
  };
}