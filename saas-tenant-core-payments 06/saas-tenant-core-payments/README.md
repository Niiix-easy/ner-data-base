# Payment Core

Módulo de pagamentos multi-tenant para ser integrado ao SaaS Tenant Core.

## Recursos

- Payment abstraction por provider
- Payment methods
- Payment attempts
- Providers
- Webhooks assinados e idempotentes
- Refunds
- Disputes
- Idempotency keys
- Tenant isolation
- RBAC

## Arquitetura

`routes -> service -> provider adapter -> provider`

O restante do SaaS não deve conhecer SDK específico de Stripe/Mercado Pago/etc.
Para trocar o gateway, implemente `PaymentProvider` em `src/payments/providers/`.

## Dinheiro

Valores são armazenados como inteiros em unidade mínima:
- BRL R$ 10,50 = `1050`
- USD $10.50 = `1050`

Nunca use `float` para valores monetários.

## Payment methods

O banco armazena somente referências/token IDs do provedor e dados não sensíveis como marca e últimos 4 dígitos.

Não armazene número completo do cartão, CVV ou PIN.

## Webhooks

O endpoint deve receber o body bruto para validar assinatura.
Cada evento é protegido por:

`@@unique([providerCode, eventId])`

Isso evita processamento duplicado.

## Providers

`mock` já está implementado para desenvolvimento.

`stripe` e `mercadopago` apontam propositalmente para o mock até que seus adapters reais sejam implementados. Não conecte esses nomes diretamente a produção sem implementar a verificação de assinatura e os mapeamentos específicos do provedor.

## Disputes

Disputas são persistidas por `providerDisputeId`. O próximo passo é adicionar handlers específicos dos eventos de chargeback/dispute de cada provider e endpoints para anexar evidências.

## Integração

1. Copie os enums/modelos de `prisma/payment-schema.prisma` para o `prisma/schema.prisma` principal.
2. Adicione as permissões de `src/payments/rbac.ts` ao seed existente.
3. Monte os routers em `server.ts`.
4. Faça `npx prisma migrate dev --name payments`.
5. Gere `npx prisma generate`.

## Produção

Antes de processar dinheiro real:

- implementar adapters oficiais dos provedores;
- usar secrets manager;
- validar assinatura de cada provider conforme sua documentação;
- webhook com raw body;
- retry com backoff e dead-letter;
- reconciliação periódica;
- idempotência também no provider;
- observabilidade;
- antifraude;
- PCI scope minimizado com tokenização/hosted fields;
- controle de acesso e auditoria;
- testes de concorrência para refunds e idempotência;
- limites por tenant;
- reconciliação financeira diária.
