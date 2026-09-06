# NeerCloud Local

Monorepo base com:

- Next.js Dashboard
- PostgreSQL
- Prisma
- Redis
- Docker Compose
- Config centralizada
- Logger JSON
- Sessões HTTP com cookie HttpOnly
- Middleware de autenticação
- API de health
- CRUD de usuários
- CRUD de projetos

## 1. Configuração

Copie `.env.example` para `.env` e altere pelo menos:

- `POSTGRES_PASSWORD`
- `STUDIO_ADMIN_PASSWORD`
- `STUDIO_SESSION_SECRET`

## 2. Subir infraestrutura

```bash
docker compose up -d postgres redis
```

## 3. Instalar dependências

```bash
corepack enable
pnpm install
```

## 4. Gerar Prisma

```bash
pnpm db:generate
```

## 5. Criar banco

Para desenvolvimento:

```bash
pnpm db:migrate
```

ou:

```bash
pnpm db:push
```

## 6. Iniciar

```bash
pnpm dev
```

Dashboard:

http://127.0.0.1:3000

Com Docker:

```bash
docker compose up -d --build dashboard
```

Dashboard:

http://127.0.0.1:3010

## Login

A senha é a definida em `STUDIO_ADMIN_PASSWORD`.

O primeiro login cria automaticamente:

`admin@neercloud.local`

## Rotas

GET `/api/health`

POST `/api/auth/login`

POST `/api/auth/logout`

GET `/api/auth/me`

GET/POST `/api/users`

GET/PATCH/DELETE `/api/users/:id`

GET/POST `/api/projects`

GET/PATCH/DELETE `/api/projects/:id`

GET `/api/system/postgres`

GET `/api/system/redis`

## Importante

Não coloque senhas reais no Git. O `.env` está no `.gitignore`.
