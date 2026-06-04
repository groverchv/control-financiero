-- =====================================================================
-- SCRIPT DE REINICIO DE BASE DE DATOS LOCAL
-- ADVERTENCIA: Este script ELIMINA todo el esquema público y todos sus
-- datos. No lo use en entornos de producción.
-- =====================================================================

-- 1. Eliminar el esquema público y todo su contenido
DROP SCHEMA IF EXISTS public CASCADE;

-- 2. Volver a crear el esquema público
CREATE SCHEMA public;

-- 3. Restablecer permisos básicos para el correcto funcionamiento de Supabase/PostgREST
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role, authenticator;

-- 4. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA public;

-- Mensaje de finalización
SELECT 'Esquema público reiniciado exitosamente. Ahora proceda a ejecutar setup.sql y dataseed.sql.' AS status;
