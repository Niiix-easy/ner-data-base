FROM node:18-alpine
WORKDIR /app
# First copy the workspace files
COPY pnpm-workspace.yaml package.json ./
# Copy workspace apps
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker
COPY packages/database ./packages/database

RUN npm install -g pnpm && pnpm install

WORKDIR /app/packages/database
RUN npx prisma generate

WORKDIR /app/apps/worker
CMD ["npm", "start"]
