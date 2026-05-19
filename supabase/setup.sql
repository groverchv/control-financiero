-- ==========================================
-- 1. LIMPIEZA TOTAL Y PREPARACIÓN
-- ==========================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role, authenticator;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

-- ==========================================
-- 1.5. STORAGE BUCKETS
-- ==========================================
-- Nota: Asegúrate de tener habilitado el servicio de Storage en Supabase
INSERT INTO storage.buckets (id, name, public) 
VALUES ('archivos', 'archivos', true)
ON CONFLICT (id) DO NOTHING;

-- Borrar cualquier usuario trabado en el sistema de autenticación
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- ==========================================
-- 2. CREACIÓN DE TABLAS
-- ==========================================
CREATE TABLE public.miembro (
    id uuid PRIMARY KEY, 
    nombre text NOT NULL,
    "apellidoPaterno" text,
    "apellidoMaterno" text,
    "correoElectronico" text UNIQUE,
    contrasena text, 
    telefono text,
    profesion text,
    biografia text,
    rol text DEFAULT 'socio',
    estado text DEFAULT 'activo',
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

CREATE TABLE public.notificacion (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE CASCADE,
    titulo text NOT NULL,
    descripcion text,
    fecha date DEFAULT current_date,
    estado text DEFAULT 'pendiente',
    creacion timestamptz DEFAULT now()
);

CREATE TABLE public.tipo_actividad (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    descripcion text,
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

CREATE TABLE public.actividad (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    tipo_actividad_id uuid REFERENCES public.tipo_actividad(id) ON DELETE SET NULL,
    titulo text NOT NULL,
    descripcion text,
    fecha date NOT NULL,
    hora time NOT NULL,
    cupos integer DEFAULT 0,
    ubicacion text,
    latitud numeric(10,8),
    longitud numeric(11,8),
    modalidad text DEFAULT 'presencial',
    costo numeric(10,2) DEFAULT 0,
    requisitos text,
    incluye_certificacion boolean DEFAULT false,
    estado text DEFAULT 'programado',
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

CREATE TABLE public.tipo_ingreso (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    descripcion text,
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

CREATE TABLE public.tipo_egreso (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    descripcion text,
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

CREATE TABLE public.tipo_activo (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    descripcion text,
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

CREATE TABLE public.activos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    tipo_activo_id uuid REFERENCES public.tipo_activo(id) ON DELETE SET NULL,
    nombre text NOT NULL,
    descripcion text,
    costo_total numeric(12,2) DEFAULT 0,
    saldo_pendiente numeric(12,2) DEFAULT 0,
    estado text DEFAULT 'deuda',
    "fechaAdquisicion" date,
    hash_anterior text,
    hash_actual text,
    blockchain_tx_id text,
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

CREATE TABLE public.ingreso (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    registrado_por uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    tipo_ingreso_id uuid REFERENCES public.tipo_ingreso(id),
    monto numeric(12,2) NOT NULL,
    fecha date NOT NULL,
    descripcion text,
    estado text DEFAULT 'pagada',
    hash_anterior text,
    hash_actual text,
    blockchain_tx_id text,
    creacion timestamptz DEFAULT now()
);

CREATE TABLE public.egreso (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    tipo_egreso_id uuid REFERENCES public.tipo_egreso(id),
    activo_id uuid REFERENCES public.activos(id) ON DELETE SET NULL,
    concepto text NOT NULL,
    monto numeric(12,2) NOT NULL,
    fecha date NOT NULL,
    descripcion text,
    hash_anterior text,
    hash_actual text,
    blockchain_tx_id text,
    creacion timestamptz DEFAULT now()
);

CREATE TABLE public.detalles (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    egreso_id uuid REFERENCES public.egreso(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    fecha date NOT NULL,
    descripcion text,
    creacion timestamptz DEFAULT now()
);

CREATE TABLE public.archivo (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE CASCADE,
    egreso_id uuid REFERENCES public.egreso(id) ON DELETE CASCADE,
    ingreso_id uuid REFERENCES public.ingreso(id) ON DELETE CASCADE,
    activo_id uuid REFERENCES public.activos(id) ON DELETE CASCADE,
    actividad_id uuid REFERENCES public.actividad(id) ON DELETE CASCADE,
    url text NOT NULL,
    tipo text,
    estado text DEFAULT 'activo',
    hash_anterior text,
    hash_actual text,
    blockchain_tx_id text,
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

CREATE TABLE public.inscripcion (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE CASCADE,
    actividad_id uuid REFERENCES public.actividad(id) ON DELETE CASCADE,
    fecha_inscripcion timestamptz DEFAULT now(),
    estado text DEFAULT 'confirmado',
    UNIQUE NULLS NOT DISTINCT (miembro_id, actividad_id),
    creacion timestamptz DEFAULT now()
);

CREATE TABLE public.jurado (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE CASCADE,
    actividad_id uuid REFERENCES public.actividad(id) ON DELETE CASCADE,
    actividad_externa text,
    descripcion text,
    fecha_asignacion timestamptz DEFAULT now(),
    UNIQUE NULLS NOT DISTINCT (miembro_id, actividad_id, actividad_externa),
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

-- ==========================================
-- 3. FUNCIONES Y TRIGGERS (Automatización)
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_academico_status()
RETURNS trigger AS $$
BEGIN
  IF NEW.fecha < CURRENT_DATE THEN
    NEW.estado := 'finalizado';
  ELSIF NEW.fecha = CURRENT_DATE THEN
    NEW.estado := 'en_curso';
  ELSE
    NEW.estado := 'programado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_actividad_status
  BEFORE INSERT OR UPDATE ON public.actividad
  FOR EACH ROW EXECUTE FUNCTION public.update_academico_status();

CREATE OR REPLACE FUNCTION public.decrease_cupos()
RETURNS trigger AS $$
BEGIN
  IF NEW.actividad_id IS NOT NULL THEN
    UPDATE public.actividad SET cupos = cupos - 1 WHERE id = NEW.actividad_id AND cupos > 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_decrease_cupos
  AFTER INSERT ON public.inscripcion
  FOR EACH ROW EXECUTE FUNCTION public.decrease_cupos();

CREATE OR REPLACE FUNCTION public.update_activo_saldo()
RETURNS trigger AS $$
BEGIN
  IF NEW.activo_id IS NOT NULL THEN
    UPDATE public.activos 
    SET saldo_pendiente = GREATEST(saldo_pendiente - NEW.monto, 0)
    WHERE id = NEW.activo_id;
    
    UPDATE public.activos
    SET estado = 'pagado'
    WHERE id = NEW.activo_id AND saldo_pendiente <= 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_activo_saldo
  AFTER INSERT ON public.egreso
  FOR EACH ROW EXECUTE FUNCTION public.update_activo_saldo();

CREATE OR REPLACE FUNCTION public.notificar_asignacion_jurado()
RETURNS trigger AS $$
DECLARE
    v_titulo_actividad text;
BEGIN
    IF NEW.actividad_id IS NOT NULL THEN
        SELECT titulo INTO v_titulo_actividad FROM public.actividad WHERE id = NEW.actividad_id;
    ELSE
        v_titulo_actividad := COALESCE(NEW.actividad_externa, 'Actividad externa / general');
    END IF;

    INSERT INTO public.notificacion (miembro_id, titulo, descripcion)
    VALUES (
        NEW.miembro_id,
        'Asignación como Jurado',
        'Has sido designado como jurado para la actividad: ' || v_titulo_actividad || '. Detalle: ' || COALESCE(NEW.descripcion, 'Sin observaciones.')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notificar_asignacion_jurado ON public.jurado;
CREATE TRIGGER tr_notificar_asignacion_jurado
  AFTER INSERT ON public.jurado
  FOR EACH ROW EXECUTE FUNCTION public.notificar_asignacion_jurado();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_count integer;
  v_rol text;
BEGIN
  -- Validamos si ya existen usuarios en la tabla miembro
  SELECT count(*) INTO v_count FROM public.miembro;

  -- Si no hay ningún miembro (es decir, el conteo es 0), forzamos a que sea 'admin'
  IF v_count = 0 THEN
    v_rol := 'admin';
  ELSE
    -- Si ya hay miembros, tomamos el rol de la metadata, o asignamos 'socio' por defecto
    v_rol := COALESCE(new.raw_user_meta_data->>'rol', 'socio');
  END IF;

  INSERT INTO public.miembro (id, nombre, "correoElectronico", rol)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    new.email, 
    v_rol
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

    NEW.hash_actual := encode(extensions.digest(
      convert_to(NEW.id::text || NEW.monto::text || NEW.fecha::text || NEW.hash_anterior, 'utf8'),
      'sha256'
    ), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_blockchain_ingreso
BEFORE INSERT ON public.ingreso
FOR EACH ROW EXECUTE FUNCTION public.sellar_ingreso();

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

    NEW.hash_actual := encode(extensions.digest(
      convert_to(NEW.id::text || NEW.monto::text || NEW.fecha::text || NEW.hash_anterior, 'utf8'),
      'sha256'
    ), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_blockchain_egreso
BEFORE INSERT ON public.egreso
FOR EACH ROW EXECUTE FUNCTION public.sellar_egreso();

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

    NEW.hash_actual := encode(extensions.digest(
      convert_to(NEW.id::text || NEW.costo_total::text || COALESCE(NEW."fechaAdquisicion"::text, '') || NEW.hash_anterior, 'utf8'),
      'sha256'
    ), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_blockchain_activo
BEFORE INSERT ON public.activos
FOR EACH ROW EXECUTE FUNCTION public.sellar_activo();

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

    NEW.hash_actual := encode(extensions.digest(
      convert_to(NEW.id::text || NEW.url || v_llave_foranea || NEW.hash_anterior, 'utf8'),
      'sha256'
    ), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_blockchain_archivo
BEFORE INSERT ON public.archivo
FOR EACH ROW EXECUTE FUNCTION public.sellar_archivo();

-- ==========================================
-- 4. SEGURIDAD DE FILAS (RLS)
-- ==========================================

-- ── Tabla: configuracion_cuotas ──────────────────────────────────
-- Control global de pausa/reanudación de cuotas de membresía.
-- Solo debe existir UN registro activo.
CREATE TABLE IF NOT EXISTS public.configuracion_cuotas (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pausado       boolean      NOT NULL DEFAULT false,
  fecha_pausa   timestamptz,
  dias_pausados integer      NOT NULL DEFAULT 0,
  dias_recordatorio_activos integer NOT NULL DEFAULT 5,
  frecuencia    text         NOT NULL DEFAULT 'mes',
  monto_cuota   numeric      NOT NULL DEFAULT 150,
  creacion      timestamptz  NOT NULL DEFAULT now(),
  actualizacion timestamptz  NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.update_configuracion_cuotas_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizacion = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_configuracion_cuotas_updated ON public.configuracion_cuotas;
CREATE TRIGGER trg_configuracion_cuotas_updated
  BEFORE UPDATE ON public.configuracion_cuotas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_configuracion_cuotas_timestamp();

-- ── Upgrade guard: añadir columnas nuevas si no existen (para BDs ya creadas) ──
ALTER TABLE public.configuracion_cuotas ADD COLUMN IF NOT EXISTS frecuencia    text    NOT NULL DEFAULT 'mes';
ALTER TABLE public.configuracion_cuotas ADD COLUMN IF NOT EXISTS monto_cuota   numeric NOT NULL DEFAULT 150;

INSERT INTO public.configuracion_cuotas (pausado, dias_pausados, dias_recordatorio_activos, frecuencia, monto_cuota)
SELECT false, 0, 5, 'mes', 150
WHERE NOT EXISTS (SELECT 1 FROM public.configuracion_cuotas);

-- ── Tabla: plan_amortizacion ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_amortizacion (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    "activoId" uuid REFERENCES public.activos(id) ON DELETE CASCADE,
    numero integer NOT NULL,
    "fechaVencimiento" date NOT NULL,
    monto numeric(12,2) NOT NULL,
    estado text DEFAULT 'pendiente',
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

ALTER TABLE public.miembro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_actividad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_ingreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_egreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_activo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_amortizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso total" ON public.miembro FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.notificacion FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.tipo_actividad FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.actividad FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.tipo_ingreso FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.tipo_egreso FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.ingreso FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.egreso FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.activos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.detalles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.archivo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.inscripcion FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.tipo_activo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.configuracion_cuotas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.plan_amortizacion FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.jurado FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';