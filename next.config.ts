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
  async rewrites() {
    return {
      // Short profile URLs: /maryokafor shows /user/maryokafor (the address bar keeps the short URL).
      // `fallback` runs only after every page, file and dynamic route has been checked, so real
      // routes (/, /login, /dashboard, /api/...) always win. Route names are reserved handles
      // (handle-rules.ts), so nobody can claim one. The pattern matches the handle format.
      fallback: [{ source: "/:handle([A-Za-z0-9_-]{3,30})", destination: "/user/:handle" }],
    };
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
