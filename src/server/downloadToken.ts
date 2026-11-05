import crypto from "crypto";
import { prisma } from "@/server/prisma";
import { parseRoles } from "@/lib/roles";

const TTL_MS = 10 * 60 * 1000;

export type DownloadTokenResult =
  | { ok: true; userId: string; query: string }
  | { ok: false; reason: "no-secret" | "malformed" | "expired" | "inactive" | "forbidden" };

function getSecret() {
  return process.env.NEXTAUTH_SECRET || "";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createDownloadToken(userId: string, query: string) {
  const payload = Buffer.from(
    JSON.stringify({ u: userId, e: Date.now() + TTL_MS, q: query }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export async function verifyDownloadToken(token: string): Promise<DownloadTokenResult> {
  if (!getSecret()) return { ok: false, reason: "no-secret" };

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return { ok: false, reason: "malformed" };

  const expected = sign(payload);
  const provided = Buffer.from(signature);
  const calculated = Buffer.from(expected);
  if (provided.length !== calculated.length) return { ok: false, reason: "malformed" };
  if (!crypto.timingSafeEqual(provided, calculated)) return { ok: false, reason: "malformed" };

  let data: { u?: string; e?: number; q?: string };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (!data.u || typeof data.e !== "number") return { ok: false, reason: "malformed" };
  if (Date.now() > data.e) return { ok: false, reason: "expired" };

  const user = await prisma.user.findUnique({
    where: { id: data.u },
    select: { isActive: true, role: true, additionalRoles: true },
  });

  if (!user || !user.isActive) return { ok: false, reason: "inactive" };
  if (!parseRoles(user.role, user.additionalRoles).includes("ADMIN")) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, userId: data.u, query: typeof data.q === "string" ? data.q : "" };
}
