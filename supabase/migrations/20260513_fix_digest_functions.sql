-- ==========================================
-- Fix: Corregir funciones de hash con digest
-- Problema: digest(text) no existe, necesita bytea
-- Solución: Usar convert_to() para convertir a bytea
-- ==========================================

-- Asegurar que pgcrypto esté disponible
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- Sellado: ingreso
CREATE OR REPLACE FUNCTION public.sellar_ingreso()
RETURNS trigger AS $$
DECLARE
    v_hash_anterior TEXT;
BEGIN
    SELECT hash_actual INTO v_hash_anterior
    FROM public.ingreso
    ORDER BY creacion DESC
    LIMIT 1;

    NEW.hash_anterior := COALESCE(v_hash_anterior, 'genesis');

    NEW.hash_actual := encode(digest(
        convert_to(NEW.id::text || NEW.monto::text || NEW.fecha::text || NEW.hash_anterior, 'utf8'),
        'sha256'
    ), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sellado: egreso
CREATE OR REPLACE FUNCTION public.sellar_egreso()
RETURNS trigger AS $$
DECLARE
    v_hash_anterior TEXT;
BEGIN
    SELECT hash_actual INTO v_hash_anterior
    FROM public.egreso
    ORDER BY creacion DESC
    LIMIT 1;

    NEW.hash_anterior := COALESCE(v_hash_anterior, 'genesis');

    NEW.hash_actual := encode(digest(
        convert_to(NEW.id::text || NEW.monto::text || NEW.fecha::text || NEW.hash_anterior, 'utf8'),
        'sha256'::text
    ), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sellado: activos
CREATE OR REPLACE FUNCTION public.sellar_activo()
RETURNS trigger AS $$
DECLARE
    v_hash_anterior TEXT;
BEGIN
    SELECT hash_actual INTO v_hash_anterior
    FROM public.activos
    ORDER BY creacion DESC
    LIMIT 1;

    NEW.hash_anterior := COALESCE(v_hash_anterior, 'genesis');

    NEW.hash_actual := encode(digest(
        convert_to(NEW.id::text || NEW.costo_total::text || COALESCE(NEW."fechaAdquisicion"::text, '') || NEW.hash_anterior, 'utf8'),
        'sha256'::text
    ), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sellado: archivo (poliformico)
CREATE OR REPLACE FUNCTION public.sellar_archivo()
RETURNS trigger AS $$
DECLARE
    v_hash_anterior TEXT;
    v_llave_foranea TEXT;
BEGIN
    SELECT hash_actual INTO v_hash_anterior
    FROM public.archivo
    ORDER BY creacion DESC
    LIMIT 1;

    NEW.hash_anterior := COALESCE(v_hash_anterior, 'genesis');

    v_llave_foranea := COALESCE(
        NEW.egreso_id::text,
        NEW.ingreso_id::text,
        NEW.activo_id::text,
        NEW.actividad_id::text,
        NEW.miembro_id::text,
        'sin_referencia'
    );

    NEW.hash_actual := encode(digest(
        convert_to(NEW.id::text || NEW.url || v_llave_foranea || NEW.hash_anterior, 'utf8'),
        'sha256'::text
    ), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
