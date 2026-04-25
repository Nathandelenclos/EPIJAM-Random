FROM node:22-slim AS base

WORKDIR /app

# Enable pnpm via Corepack
RUN corepack enable

FROM base AS deps

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# prisma/config requires DATABASE_URL to be present during generate
ENV DATABASE_URL=postgresql://app:app@db:5432/valorantcasino
RUN pnpm exec prisma generate --schema prisma/schema.prisma
RUN pnpm run build

FROM base AS runner

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated

EXPOSE 3000

CMD ["sh", "-c", "pnpm exec prisma db push --skip-generate && node dist/server/server.js"]
