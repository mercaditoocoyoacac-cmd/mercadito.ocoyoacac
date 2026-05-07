import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { pushToken } = body as { pushToken: string };

    if (!pushToken || typeof pushToken !== "string") {
      return NextResponse.json({ error: "pushToken requerido" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { pushToken },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving push token:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
