import { NextResponse } from "next/server";
import { requireUser } from "@/server/requireUser";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { ok: false, error: "No se proporcionó archivo." },
      { status: 400 },
    );
  }

  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!validTypes.includes(file.type)) {
    return NextResponse.json(
      { ok: false, error: "Tipo de archivo no válido. Usa JPG, PNG, WebP o GIF." },
      { status: 400 },
    );
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { ok: false, error: "El archivo debe ser menor a 5MB." },
      { status: 400 },
    );
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    return NextResponse.json(
      { ok: false, error: "Configuración de Cloudinary incompleta." },
      { status: 500 },
    );
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body,
    }
  );

  const data = (await response.json()) as {
    secure_url?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.secure_url) {
    const errorMessage = data.error?.message ?? "Error al subir imagen";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: data.secure_url });
}
