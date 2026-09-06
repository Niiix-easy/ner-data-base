-- 02-rls-setup.sql
-- Implementa isolamento rigoroso de Tenant/Organization utilizando RLS do PostgreSQL

-- 1. Cria a role de aplicação que NÃO DEVE ter SUPERUSER e não deve ignorar RLS (BYPASSRLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'neer_app') THEN
    CREATE ROLE neer_app NOLOGIN NOINHERIT;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO neer_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO neer_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO neer_app;

CREATE OR REPLACE FUNCTION get_current_tenant() RETURNS text AS $$
  SELECT current_setting('app.current_tenant_id', true);
$$ LANGUAGE sql STABLE;

DO $$
DECLARE
    table_rec record;
    tenant_tables text[] := ARRAY['Project', 'Subscription', 'Invoice', 'Payment', 'AuditLog', 'WebhookEvent', 'UsageAggregate', 'ApiKey', 'Resource'];
    t text;
BEGIN
    FOR t IN SELECT unnest(tenant_tables) LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public."%I" ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('ALTER TABLE public."%I" FORCE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public."%I"', t);
            EXECUTE format('CREATE POLICY tenant_isolation_policy ON public."%I" FOR ALL TO neer_app USING ("organizationId" = get_current_tenant() AND get_current_tenant() IS NOT NULL)', t);
        END IF;
    END LOOP;
END
$$;
