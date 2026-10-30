import { NextResponse } from "next/server";
import { requireUser } from "@/server/requireUser";
import { rateLimit } from "@/lib/rate-limit";

function detectImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(`upload:${auth.userId}`, { intervalMs: 3600_000, max: 40 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas subidas. Intenta más tarde." },
      { status: 429 },
    );
  }

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

  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const detected = detectImageType(head);
  if (!detected || detected !== file.type) {
    return NextResponse.json(
      { ok: false, error: "El archivo no es una imagen válida." },
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
