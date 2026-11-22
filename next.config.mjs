const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = isStatic
  ? {
      // GitHub Pages preview: plain HTML files, no server.
      output: "export",
      basePath,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      images: {
        formats: ["image/avif", "image/webp"],
        remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
      },
    };

export default nextConfig;
