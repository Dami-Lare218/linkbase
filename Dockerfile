# syntax=docker/dockerfile:1

# Linkbase production image (Doc/deployment.md §5).
# Vercel does not use this image: it builds from source. The image proves the app builds and
# runs in a clean Linux environment, and is the artifact if Linkbase is ever self-hosted.
#
# Build:  docker build -t linkbase .
# Run:    docker run --rm -p 3000:3000 --env-file <file outside the repo> linkbase
#
# No secrets are used at build time. MONGODB_URI, AUTH_SECRET and BLOB_READ_WRITE_TOKEN are
# passed only when the container runs, never as build args.

# Node 24 LTS (Next.js 16.4 needs >= 20.9). Keep in step with NODE_VERSION in .github/workflows/quality-checks.yml.
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# 1. Dependencies: exact versions from package-lock.json.
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# 2. Build: standalone output (see next.config.ts), only traced files end up in .next/standalone.
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV LINKBASE_STANDALONE_BUILD=1
# public/ doesn't exist yet. Creating it keeps the runner COPY below working, today and once it does.
RUN mkdir -p public && npm run build

# 3. Runtime: a fresh image with only the standalone server, static assets and public files.
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# App files stay owned by root (read-only for the app). Only the Next.js cache folder is writable.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
RUN mkdir -p .next/cache && chown node:node .next/cache

# Non-root user that ships with the official Node image (uid 1000).
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["node", "server.js"]
