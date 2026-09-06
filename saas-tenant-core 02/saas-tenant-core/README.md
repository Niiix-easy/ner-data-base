# SaaS Tenant Core

Backend completo inicial para SaaS multi-tenant com:

- Users
- Organizations
- Memberships
- RBAC
- Permissions
- API Keys
- Tenant isolation
- JWT authentication
- Audit logs
- PostgreSQL + Prisma
- Docker Compose

## 1. Subir PostgreSQL

```bash
docker compose up -d
```

## 2. Configurar ambiente

```bash
copy .env.example .env
```

No Linux/macOS:

```bash
cp .env.example .env
```

Altere `JWT_SECRET` e `API_KEY_PEPPER` antes de produção.

## 3. Instalar e criar banco

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
```

## 4. Executar

```bash
npm run dev
```

API: `http://localhost:3000`

## Conta de teste

- email: `admin@example.com`
- senha: `ChangeMe123!`

Troque a senha imediatamente em ambiente real.

## Tenant isolation

Toda operação protegida obtém o `organizationId` do contexto autenticado e filtra diretamente no banco.

Exemplo:

```ts
where: {
  id: req.params.id,
  organizationId: tenantId(req)
}
```

Não aceite `organizationId` vindo do body para definir o tenant.

API Keys também são vinculadas a `userId + organizationId`, e a autenticação carrega a membership correspondente antes de permitir acesso.

## Trocar de organização

Para uma implementação de produção com múltiplas organizações por usuário, crie um endpoint `/auth/switch-organization` que valide a membership escolhida e emita um JWT com `organizationId` explícito. Nesta versão, o JWT contém apenas o usuário e o middleware seleciona a primeira membership ativa; isso mantém o núcleo simples para a primeira etapa.

## Endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /me`

### Organizations
- `GET /organizations`
- `GET /organizations/current`
- `PATCH /organizations/current`

### Members
- `GET /members`
- `POST /members`
- `PATCH /members/:id`
- `DELETE /members/:id`

### RBAC
- `GET /roles`
- `POST /roles`
- `GET /permissions`

### API Keys
- `GET /api-keys`
- `POST /api-keys`
- `POST /api-keys/:id/revoke`

### Audit
- `GET /audit-logs`

### Health
- `GET /health`

## Produção

Adicionar antes do deploy:

- refresh tokens com rotação e revogação;
- confirmação de email;
- recuperação de senha;
- rate limiting;
- CSRF se usar cookies;
- 2FA/MFA;
- sessões/dispositivos;
- convite por email;
- política de senha;
- secret manager;
- TLS;
- logs centralizados;
- backups PostgreSQL;
- testes automatizados;
- RLS do PostgreSQL para uma segunda camada de isolamento;
- fila para tarefas assíncronas;
- paginação em todas as listagens;
- cache onde necessário.
