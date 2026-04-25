FROM node:22-slim AS base

# Prisma requires OpenSSL to connect to the database
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN corepack enable

# ── deps ─────────────────────────────────────────────────────────────────────
FROM base AS deps

COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN pnpm install --no-frozen-lockfile

# ── builder ──────────────────────────────────────────────────────────────────
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# DATABASE_URL is needed by prisma.config.ts at generate time (no real connection needed)
ENV DATABASE_URL=postgresql://app:app@db:5432/valorantcasino
RUN pnpm exec prisma generate
RUN pnpm run build

# ── runner ───────────────────────────────────────────────────────────────────
FROM base AS runner

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/package.json         ./package.json
COPY --from=builder /app/node_modules         ./node_modules
COPY --from=builder /app/.output              ./.output
COPY --from=builder /app/prisma               ./prisma
COPY --from=builder /app/prisma.config.ts     ./prisma.config.ts
COPY --from=builder /app/src/generated        ./src/generated

EXPOSE 3000

# prisma db push syncs the schema then starts the server
CMD ["sh", "-c", "pnpm exec prisma db push && node .output/server/index.mjs"]
