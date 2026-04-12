import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { prisma } from "@/server/prisma";

function getDeviceId(userAgent: string, ip: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(`${userAgent}-${ip}`).digest("hex").slice(0, 32);
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 15 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Correo y contraseña",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        if (!user.isActive) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

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
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.needsDeviceApproval = (user as any).needsDeviceApproval;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
};

