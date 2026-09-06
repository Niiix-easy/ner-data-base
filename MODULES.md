# Módulos — Neer-Data-Base

Mapeamento entre os 14 módulos da arquitetura e onde cada um vive no repo.

| # | Módulo | Pasta | Status |
|---|--------|-------|--------|
| 01 | Platform Core | `services/control-plane/` (orgs, projetos) | ✅ Fase 1 |
| 02 | PostgreSQL Manager | `services/control-plane/src/provisioning.js` + `services/postgres/init/` | ✅ Fase 1 |
| 03 | API Gateway | `services/kong/` | ✅ Fase 1 |
| 04 | Auto REST API | PostgREST (`docker-compose.yml`, serviço `rest`) | ✅ Fase 1 |
| 05 | GraphQL API | `services/graphql/` (PostGraphile) | ✅ Fase 3 |
| 06 | Authentication | GoTrue (`docker-compose.yml`, serviço `auth`) + login social (GitHub/Google) + `templates/auth-starter/` | ✅ Fase 1 |
| — | Integrações (OAuth Apps + GitHub sync) | `services/control-plane/src/routes/`, `docs/INTEGRATIONS.md` | ✅ Fase 4 |
| 07 | Authorization/RLS | `services/postgres/init/02_default_rls.sql` | ✅ Fase 1 |
| 08 | Realtime | Supabase Realtime (`docker-compose.yml`) + `sdk/js/src/clients/realtime.js` | ✅ Fase 2 |
| 09 | Storage | `services/storage/` (wrapper sobre MinIO) | ✅ Fase 2 |
| 10 | Edge Functions | `services/functions/` (runtime Deno) | ✅ Fase 3 |
| 11 | Database Studio | `services/dashboard/` | 🟡 esqueleto |
| 12 | CLI + SDK | `cli/`, `sdk/js/` (rest, auth, storage, realtime, graphql) | ✅ Fase 2 |
| 13 | Observability | `observability/` (Prometheus, Grafana, Loki, Tempo) | ✅ Fase 3 |
| 14 | Cloud/Orchestration | `infra/kubernetes/`, `infra/terraform/` | ✅ Fase 4 (base) |

Cada pasta de módulo tem seu próprio `README.md` com detalhes de como rodar
e estender aquele módulo especificamente.
