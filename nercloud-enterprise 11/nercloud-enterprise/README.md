# NERCloud Enterprise

Módulo para recursos Enterprise:
- SSO
- SCIM
- SLA
- Custom pricing
- Custom contracts
- Dedicated infrastructure

Inclui modelos Prisma, APIs e serviços base para integração com o NERCloud principal.

## Segurança
SSO usa OIDC/SAML como abstração de configuração. SCIM usa tokens armazenados como hash.
Segredos reais devem ficar em secret manager. Não coloque certificados, chaves privadas ou tokens em banco em texto puro.

## Arquitetura
Organization -> EnterpriseContract -> SSOConnection
                       -> SCIMConnection
                       -> SLA
                       -> CustomPricing
                       -> DedicatedInfrastructure

Antes de produção, integrar com o provedor de identidade, provisionamento de usuários, cobrança/ledger, monitoramento e orquestração de infraestrutura.
