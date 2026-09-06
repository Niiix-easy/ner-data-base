# NERCloud Billing Engine

Código base completo para:
- Subscriptions
- Billing Cycles
- Rating
- Proration
- Invoices
- Credits
- Coupons
- Taxes

Integra com o catálogo anterior:
Products -> Plans -> Plan Versions -> Prices -> Meters -> Entitlements

Stack: Next.js + TypeScript + Prisma + PostgreSQL.

## Instalação
```bash
corepack enable
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

## API
GET/POST /api/subscriptions
GET/PATCH/DELETE /api/subscriptions/:id

GET/POST /api/billing-cycles
GET/PATCH/DELETE /api/billing-cycles/:id

POST /api/rating
POST /api/proration

GET/POST /api/invoices
GET/PATCH/DELETE /api/invoices/:id

GET/POST /api/credits
GET/PATCH/DELETE /api/credits/:id

GET/POST /api/coupons
GET/PATCH/DELETE /api/coupons/:id

GET/POST /api/taxes
GET/PATCH/DELETE /api/taxes/:id

## Regras
- Valores monetários são armazenados em centavos.
- Rating calcula cobrança recorrente e por uso.
- Proration calcula crédito/cobrança proporcional por dias.
- Invoice possui linhas, impostos, créditos e totais.
- Coupon suporta percentual e valor fixo.
- Tax pode ser percentual ou valor fixo.
