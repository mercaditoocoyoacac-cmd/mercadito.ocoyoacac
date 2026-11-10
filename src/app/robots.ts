import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/appUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/vendor/", "/delivery/", "/api/", "/perfil/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
