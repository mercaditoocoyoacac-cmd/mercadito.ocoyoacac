import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { prisma } from "@/server/prisma";

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "";

async function verifyCaptcha(token: string): Promise<boolean> {
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

function getDeviceId(userAgent: string, ip: string): string {
  return crypto.createHash("sha256").update(`${userAgent}-${ip}`).digest("hex").slice(0, 32);
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Correo y contraseña",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
        captchaToken: { label: "Captcha", type: "hidden" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        if (RECAPTCHA_SECRET_KEY) {
          if (!credentials?.captchaToken) return null;
          if (!(await verifyCaptcha(credentials.captchaToken))) return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        if (!user.isActive) return null;

        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          const now = new Date();
          const attempts = (user.failedLoginAttempts || 0) + 1;
          const updates: Record<string, unknown> = {
            failedLoginAttempts: attempts,
            lastFailedLoginAt: now,
          };
          if (attempts >= 5) {
            updates.lockoutUntil = new Date(now.getTime() + 15 * 60 * 1000);
          }
          await prisma.user.update({ where: { id: user.id }, data: updates });
          return null;
        }

        if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lastFailedLoginAt: null, lockoutUntil: null },
          });
        }

        const headersList = await headers();
        const userAgent = headersList.get("user-agent") || "unknown";
        const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";
        const deviceId = getDeviceId(userAgent, ip);

        const device = await prisma.deviceAuthorization.findFirst({
          where: { userId: user.id, deviceId },
        });

        if (!device) {
          await prisma.deviceAuthorization.create({
            data: {
              userId: user.id,
              deviceId,
              userAgent,
              ipAddress: ip,
              isApproved: true,
            },
          });
        } else if (!device.isApproved) {
          return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          additionalRoles: user.additionalRoles || undefined,
          needsDeviceApproval: true,
          };
        } else {
          await prisma.deviceAuthorization.update({
            where: { id: device.id },
            data: { lastSeen: new Date() },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          additionalRoles: user.additionalRoles || undefined,
          isActive: user.isActive,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        token.additionalRoles = user.additionalRoles;
        token.isActive = user.isActive;
        token.needsDeviceApproval = (user as { needsDeviceApproval?: boolean }).needsDeviceApproval;
      } else if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, additionalRoles: true, isActive: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.additionalRoles = dbUser.additionalRoles || undefined;
          token.isActive = dbUser.isActive;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.role) session.user.role = token.role;
      if (token.additionalRoles) session.user.additionalRoles = token.additionalRoles;
      if (typeof token.isActive === "boolean") session.user.isActive = token.isActive;
      return session;
    },
  },
};
