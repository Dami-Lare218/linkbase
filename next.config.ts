import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output only for the Docker image (the Dockerfile sets this flag at build time).
  // Vercel and local builds keep the default output (Doc/deployment.md §5).
  output: process.env.LINKBASE_STANDALONE_BUILD === "1" ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Profile pictures are capped at 2 MB; the rest covers the multipart overhead.
      bodySizeLimit: "2.2mb",
    },
  },
  images: {
    // Only profile pictures from a Vercel Blob store, under avatars/, without query strings.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/avatars/**", search: "" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
