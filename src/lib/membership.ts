export type PremiumInfo = {
  plan?: string | null;
  subscription?: {
    status?: string | null;
    endDate?: Date | string | null;
  } | null;
};

export function isStorePremium(store: PremiumInfo | null | undefined): boolean {
  const sub = store?.subscription;
  if (!sub) return false;
  if (sub.status !== "ACTIVE" && sub.status !== "TRIAL") return false;
  const end = new Date(sub.endDate ?? 0);
  return end > new Date();
}
