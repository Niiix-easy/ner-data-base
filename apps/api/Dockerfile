FROM node:20-alpine AS builder

# Instalar ferramentas do SO para habilitar atualizações remotas via docker.sock
RUN apk add --no-cache git bash docker-cli docker-cli-compose openssh-client

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN npm i -g pnpm && pnpm i --filter api

COPY . .
RUN pnpm --filter api build

FROM node:20-alpine
RUN apk add --no-cache git bash docker-cli docker-cli-compose openssh-client
WORKDIR /app
COPY --from=builder /app ./
RUN npm i -g pnpm

CMD ["npm", "start", "--workspace", "apps/api"]
