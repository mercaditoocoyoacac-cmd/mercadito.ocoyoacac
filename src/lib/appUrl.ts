const CANONICAL_ORIGIN = "https://mercadito-ocoyoacac.com";
const CANONICAL_HOST = "mercadito-ocoyoacac.com";

const REDUNDANT_HOSTS = new Set([
  "mercaditoocoyoacac.com",
  "www.mercaditoocoyoacac.com",
  "mercaditoocoyoacac.vercel.app",
]);

const LEGACY_APP_HOSTS = new Set(["mercadito-ocoyoacac.vercel.app"]);

function isRedundantHost(host: string): boolean {
  const normalized = host.toLowerCase();
  return (
    REDUNDANT_HOSTS.has(normalized) ||
    normalized === `www.${CANONICAL_HOST}` ||
    normalized.endsWith(`.${CANONICAL_HOST}`)
  );
}

function parseOrigin(value?: string | null, collapseLegacy = false): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    if (isRedundantHost(parsed.host)) return CANONICAL_ORIGIN;
    if (collapseLegacy && LEGACY_APP_HOSTS.has(parsed.host.toLowerCase())) return CANONICAL_ORIGIN;
    return parsed.origin;
  } catch {
    return null;
  }
}

function fallbackOrigin(): string {
  return process.env.NODE_ENV === "production" ? CANONICAL_ORIGIN : "http://localhost:3000";
}

export function appUrl(): string {
  return parseOrigin(process.env.NEXT_PUBLIC_APP_URL, true) ?? fallbackOrigin();
}

export function publicUrl(): string {
  const configured = parseOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return appUrl();
  return parseOrigin(process.env.NEXTAUTH_URL) ?? appUrl();
}

export function absoluteUrl(path = "/"): string {
  return new URL(path, `${appUrl()}/`).toString();
}

export { CANONICAL_ORIGIN };
