# NERCloud Event Platform

Código-base para processamento assíncrono:
- Kafka
- Workers
- Outbox Pattern
- Queues
- Retries com backoff
- Dead Letter Queue (DLQ)
- Idempotência
- Graceful shutdown
- Observabilidade básica

Arquitetura:
API/serviço -> PostgreSQL Outbox -> Publisher -> Kafka -> Worker -> sucesso
                                              -> retry -> Kafka retry topic
                                              -> limite excedido -> DLQ

O Outbox evita o problema de gravar uma alteração no banco e falhar ao publicar o evento.

## Estrutura
- `packages/events`: contratos de eventos
- `packages/db`: Prisma para outbox/idempotência
- `services/outbox-publisher`: publica registros pendentes no Kafka
- `services/worker`: consome tópicos e processa jobs
- `services/api-example`: exemplo transacional usando Outbox
- `infra`: Kafka + PostgreSQL + tópicos

## Executar
1. `cp .env.example .env`
2. `docker compose up -d`
3. `npm install`
4. `npx prisma generate`
5. `npx prisma migrate dev`
6. iniciar publisher, worker e API.

Antes de produção, configure autenticação, TLS/SASL do Kafka, secrets, métricas, tracing e políticas de retenção adequadas.
