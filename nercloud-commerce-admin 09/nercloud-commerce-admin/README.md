# NERCloud Commerce Admin

Módulo integrado de gestão comercial para NERCloud:
- Billing Dashboard
- Usage Dashboard
- Invoice Management
- Payment Management
- Plan Management
- Admin

Stack: Next.js App Router + TypeScript + Prisma + PostgreSQL.

## Modelos
Customer, Subscription, UsageEvent, Invoice, InvoiceLine, Payment, Plan, PlanVersion, Price, AdminUser, AdminSession, AdminAuditLog.

## Regras principais
- Valores monetários são armazenados em centavos.
- Uso é registrado como evento imutável.
- Faturas possuem linhas e status.
- Pagamentos podem ser aplicados a faturas.
- Planos têm versões para preservar histórico de preços.
- A área Admin possui controle de usuários, permissões e auditoria.

## Execução
1. Copie este módulo para o monorepo NERCloud.
2. Adicione as dependências indicadas em package.json.
3. Configure DATABASE_URL.
4. Execute `pnpm prisma generate` e `pnpm prisma migrate dev`.
5. Execute `pnpm dev`.

> O módulo é um scaffold funcional e deve ser integrado à autenticação e ao ledger financeiro já existente antes de uso em produção.
