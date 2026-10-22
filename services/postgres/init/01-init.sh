#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create required roles for PostgREST
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '$AUTHENTICATOR_PASSWORD';
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;

    -- Grant required permissions to roles
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;

    -- Configure database permissions
    GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated;
EOSQL
