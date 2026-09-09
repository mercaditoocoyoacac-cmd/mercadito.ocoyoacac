export type PremiumInfo = {
  plan?: string | null;
  subscription?: {
    status?: string | null;
    endDate?: Date | string | null;
  } | null;
};

export const SOLO_DELIVERY_PRICE_CENTS = 29900;
export const VENDE_PLUS_FULL_PRICE_CENTS = 83000;
export const VENDE_PLUS_DISCOUNTED_PRICE_CENTS = 49800;
export const GRACE_DATE = new Date("2026-08-01T00:00:00.000Z");

export const MEMBERSHIP_PLANS = [
  {
    key: "FREE",
    label: "Vende",
    badge: "Gratis",
    priceCents: 0,
  },
  {
    key: "SOLO_DELIVERY",
    label: "Solo Delivery",
    priceCents: SOLO_DELIVERY_PRICE_CENTS,
  },
  {
    key: "MEMBER",
    label: "Vende+",
    priceCents: VENDE_PLUS_FULL_PRICE_CENTS,
  },
] as const;

export type MembershipPlanKey = "FREE" | "SOLO_DELIVERY" | "MEMBER";

export function isPaidPlan(plan: string | null | undefined): boolean {
  return plan === "MEMBER" || plan === "SOLO_DELIVERY";
}

export function membershipPlanPriceCents(plan: string | null | undefined): number {
  if (plan === "SOLO_DELIVERY") return SOLO_DELIVERY_PRICE_CENTS;
  return VENDE_PLUS_FULL_PRICE_CENTS;
}

export function membershipPlanLabel(plan: string | null | undefined): string {
  if (plan === "SOLO_DELIVERY") return "Solo Delivery";
  if (plan === "MEMBER") return "Vende+";
  return "Vende";
}

export function isStorePremium(store: PremiumInfo | null | undefined): boolean {
  const sub = store?.subscription;
  if (!sub) return false;
  if (sub.status !== "ACTIVE" && sub.status !== "TRIAL") return false;
  const end = new Date(sub.endDate ?? 0);
  return end > new Date();
}