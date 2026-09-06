FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY services/dashboard/package.json services/dashboard/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/redis/package.json packages/redis/package.json
COPY packages/logger/package.json packages/logger/package.json
RUN pnpm install --frozen-lockfile=false

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @neercloud/db prisma:generate
RUN pnpm --filter @neercloud/dashboard build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/services/dashboard/.next ./services/dashboard/.next
COPY --from=builder /app/services/dashboard/public ./services/dashboard/public
COPY --from=builder /app/services/dashboard/package.json ./services/dashboard/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
WORKDIR /app/services/dashboard
EXPOSE 3000
CMD ["pnpm", "start"]
