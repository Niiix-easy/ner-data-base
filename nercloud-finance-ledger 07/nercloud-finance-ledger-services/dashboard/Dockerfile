FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @neercloud/db prisma:generate
RUN pnpm --filter @neercloud/dashboard build
EXPOSE 3000
CMD ["pnpm","--filter","@neercloud/dashboard","start"]
