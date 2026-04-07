import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

export function getSession() {
  return getServerSession(authOptions);
}

