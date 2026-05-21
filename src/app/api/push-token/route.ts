import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  try {
    const body = await req.json();
    const { pushToken } = body as { pushToken: string };

    if (!pushToken || typeof pushToken !== "string") {
      return NextResponse.json({ error: "pushToken requerido" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: auth.userId },
      data: { pushToken },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving push token:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
