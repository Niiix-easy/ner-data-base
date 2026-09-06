# SCIM

Endpoints:
- GET `/scim/v2.0/health`
- GET `/scim/v2.0/Users`
- POST `/scim/v2.0/Users`
- PATCH `/scim/v2.0/Users/:id`

O token de provisionamento é exibido somente na criação e armazenado como hash.

Para produção adicionar:
- Groups
- DELETE
- PUT
- filtros SCIM
- paginação
- ETags
- rate limiting
- auditoria
- rotação/revogação de tokens
