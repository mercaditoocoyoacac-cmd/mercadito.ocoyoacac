import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      additionalRoles?: string;
      isActive?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    additionalRoles?: string;
    isActive?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    additionalRoles?: string;
    isActive?: boolean;
  }
}
