# Next.js (Monorepo) — Kontext: Repo-Root
# 1) Dependencies mit Bun
# 2) Build mit echtem Node.js — `bun run next build` segfaultet in Docker (Linux/arm64, Bun+Next Worker-Treads)

FROM oven/bun:1.2.18 AS deps

WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY packages ./packages
COPY apps ./apps

RUN bun install

FROM node:22-bookworm-slim AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
# Gleiche Host-Angabe wie typischer Browser-Zugriff (localhost) — 127.0.0.1 im Client-Build
# führt sonst zu CORS, wenn Nutzer "localhost" in der Adresszeile nutzt.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG BETTER_AUTH_SECRET=7f2c9a1b4d8e3c6f0a2b4d6e8f0a1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV BETTER_AUTH_URL=${NEXT_PUBLIC_APP_URL}
# Prisma-Client-Generate braucht eine syntaktische URL; echte DB ist zur Build-Zeit nicht nötig
ENV DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/dummy?schema=public
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app /app

# Prisma-Client für @workspace/auth (Better Auth) erzeugen
WORKDIR /app/packages/prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# Turbo erwartet `bun` (packageManager); im Node-Slim-Image fehlt das Binary.
# `apps/web` build-Skript ist nur `next build` — direkt hier ausführen.
WORKDIR /app/apps/web
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
