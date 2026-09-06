# Operação

## Retry
Cada falha recebe um contador de tentativas. O atraso usa backoff exponencial com jitter.

## DLQ
Após `MAX_RETRIES`, o evento é publicado em `billing.events.dlq` e registrado em `FailedEvent`.

## Idempotência
`ProcessedEvent` usa `(consumer,eventId)` como chave única. O handler deve continuar idempotente porque Kafka pode entregar mensagens novamente.

## Outbox
A aplicação grava sua alteração de negócio e o evento na mesma transação PostgreSQL. Um publisher separado envia os eventos ao Kafka.

## Concorrência
Para múltiplas instâncias do publisher, recomenda-se adicionar locking PostgreSQL com `FOR UPDATE SKIP LOCKED` ou uma estratégia de claim atômico. O scaffold atual serve para uma instância e desenvolvimento.

## Produção
Adicionar:
- Kafka TLS/SASL
- schema registry/versionamento de contratos
- métricas Prometheus/OpenTelemetry
- tracing distribuído
- alertas de lag e DLQ
- retenção/compactação
- replay controlado da DLQ
- limites de concorrência
- graceful shutdown
- secret manager
