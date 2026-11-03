export const ADMIN_ROLE = "ADMIN";
export const DISPATCH_ROLE = "DISPATCH";

export const STAFF_ROLES = [ADMIN_ROLE, DISPATCH_ROLE] as const;

export function parseRoles(role?: string | null, additionalRoles?: string | null): string[] {
  return [role ?? "", ...(additionalRoles?.split(",") ?? [])].map((r) => r.trim()).filter(Boolean);
}

export function isAdmin(roles: string[]): boolean {
  return roles.includes(ADMIN_ROLE);
}

export function isDispatcher(roles: string[]): boolean {
  return roles.includes(DISPATCH_ROLE);
}
