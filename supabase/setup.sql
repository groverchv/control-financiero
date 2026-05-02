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

CREATE TABLE public.evento (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
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

CREATE TABLE public.actividad_academica (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
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
    imagen_url text,
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
    creacion timestamptz DEFAULT now()
);

CREATE TABLE public.egreso (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    tipo_egreso_id uuid REFERENCES public.tipo_egreso(id),
    activo_id uuid REFERENCES public.activos(id) ON DELETE SET NULL,
    monto numeric(12,2) NOT NULL,
    fecha date NOT NULL,
    concepto text NOT NULL,
    descripcion text,
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
    evento_id uuid REFERENCES public.evento(id) ON DELETE CASCADE,
    actividad_academica_id uuid REFERENCES public.actividad_academica(id) ON DELETE CASCADE,
    url text NOT NULL,
    tipo text,
    estado text DEFAULT 'activo',
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

CREATE TABLE public.inscripcion (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE CASCADE,
    evento_id uuid REFERENCES public.evento(id) ON DELETE CASCADE,
    actividad_academica_id uuid REFERENCES public.actividad_academica(id) ON DELETE CASCADE,
    fecha_inscripcion timestamptz DEFAULT now(),
    estado text DEFAULT 'confirmado',
    UNIQUE NULLS NOT DISTINCT (miembro_id, evento_id),
    UNIQUE NULLS NOT DISTINCT (miembro_id, actividad_academica_id)
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

CREATE TRIGGER tr_update_evento_status
  BEFORE INSERT OR UPDATE ON public.evento
  FOR EACH ROW EXECUTE FUNCTION public.update_academico_status();

CREATE OR REPLACE FUNCTION public.decrease_cupos()
RETURNS trigger AS $$
BEGIN
  IF NEW.evento_id IS NOT NULL THEN
    UPDATE public.evento SET cupos = cupos - 1 WHERE id = NEW.evento_id AND cupos > 0;
  END IF;
  IF NEW.actividad_academica_id IS NOT NULL THEN
    UPDATE public.actividad_academica SET cupos = cupos - 1 WHERE id = NEW.actividad_academica_id AND cupos > 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_decrease_cupos
  AFTER INSERT ON public.inscripcion
  FOR EACH ROW EXECUTE FUNCTION public.decrease_cupos();

CREATE TRIGGER tr_update_actividad_status
  BEFORE INSERT OR UPDATE ON public.actividad_academica
  FOR EACH ROW EXECUTE FUNCTION public.update_academico_status();

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 4. SEGURIDAD DE FILAS (RLS)
-- ==========================================
ALTER TABLE public.miembro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividad_academica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_ingreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_egreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_activo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripcion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso total" ON public.miembro FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.notificacion FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.evento FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.actividad_academica FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.tipo_ingreso FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.tipo_egreso FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.ingreso FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.egreso FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.activos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.detalles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.archivo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.inscripcion FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON public.tipo_activo FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';