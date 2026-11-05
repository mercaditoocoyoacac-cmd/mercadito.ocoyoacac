import crypto from "crypto";
import { prisma } from "@/server/prisma";
import { parseRoles } from "@/lib/roles";

const TTL_MS = 10 * 60 * 1000;

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

export async function verifyDownloadToken(token: string) {
  if (!getSecret()) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const provided = Buffer.from(signature);
  const calculated = Buffer.from(expected);
  if (provided.length !== calculated.length) return null;
  if (!crypto.timingSafeEqual(provided, calculated)) return null;

  let data: { u?: string; e?: number; q?: string };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!data.u || typeof data.e !== "number" || Date.now() > data.e) return null;

  const user = await prisma.user.findUnique({
    where: { id: data.u },
    select: { isActive: true, role: true, additionalRoles: true },
  });

  if (!user || !user.isActive) return null;
  if (!parseRoles(user.role, user.additionalRoles).includes("ADMIN")) return null;

  return { userId: data.u, query: typeof data.q === "string" ? data.q : "" };
}
