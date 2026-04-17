const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

const WINDOW_MS = 60000;
const MAX_REQUESTS = 10;

export function rateLimit(key: string): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now - record.lastReset > WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, lastReset: now });
    return { success: true, remaining: MAX_REQUESTS - 1 };
  }

  if (record.count >= MAX_REQUESTS) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: MAX_REQUESTS - record.count };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.lastReset > WINDOW_MS * 2) {
      rateLimitMap.delete(key);
    }
  }
}, WINDOW_MS);

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}