import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["@capacitor/core"],
  },
  // Exclude imss-umf-turnos (separate project) from build
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
};

export default nextConfig;
