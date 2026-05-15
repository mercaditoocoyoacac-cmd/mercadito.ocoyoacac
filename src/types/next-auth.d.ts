import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      additionalRoles?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    additionalRoles?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    additionalRoles?: string;
  }
}
