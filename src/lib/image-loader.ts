"use client";

interface ImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

const CLOUDINARY_HOST = "res.cloudinary.com";
const UPLOAD_PATH = "/image/upload/";

export default function imageLoader({ src, width, quality }: ImageLoaderProps) {
  if (!src.startsWith("https://")) return src;

  try {
    const url = new URL(src);
    if (url.hostname !== CLOUDINARY_HOST) return src;

    const markerIndex = url.pathname.indexOf(UPLOAD_PATH);
    if (markerIndex === -1) return src;

    const prefix = url.pathname.slice(0, markerIndex + UPLOAD_PATH.length);
    const publicId = url.pathname.slice(markerIndex + UPLOAD_PATH.length);
    if (!publicId) return src;

    const transformations = ["f_auto", "c_limit", `w_${width}`, `q_${quality ?? "auto"}`].join(",");
    url.pathname = `${prefix}${transformations}/${publicId}`;
    return url.toString();
  } catch {
    return src;
  }
}
