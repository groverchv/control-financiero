-- =====================================================================
-- SCRIPT UNIFICADO: REINICIO, ESQUEMA Y POBLACIÓN DE DATOS
-- =====================================================================

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


-- ==========================================
-- 1. PREPARACIÓN DEL ESQUEMA (PRODUCCIÓN)
-- ==========================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role, authenticator;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA public;

-- ==========================================
-- 1.5. ALMACENAMIENTO DE ARCHIVOS (CLOUDINARY)
-- ==========================================
-- No se utiliza el Storage de Supabase para evitar consumir espacio y ancho de banda
-- del plan gratuito. En su lugar, el sistema está acoplado a Cloudinary, el cual
-- procesa los archivos y guarda directamente la URL pública en la tabla "archivo".

-- Borrar cualquier usuario trabado en el sistema de autenticación
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- ==========================================
-- 2. CREACIÓN DE TABLAS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.miembro (
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
    fecha_pausa timestamptz DEFAULT NULL,
    dias_pausados numeric DEFAULT 0,
    fecha_proxima_cuota timestamptz DEFAULT NULL,
    tiempo_restante_cuota interval DEFAULT NULL,
    monto_inscripcion numeric DEFAULT 150,
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

-- Upgrade guard: asegurar columnas de control de cuotas para miembro
ALTER TABLE public.miembro ADD COLUMN IF NOT EXISTS fecha_proxima_cuota timestamptz DEFAULT NULL;
ALTER TABLE public.miembro ADD COLUMN IF NOT EXISTS tiempo_restante_cuota interval DEFAULT NULL;
ALTER TABLE public.miembro ADD COLUMN IF NOT EXISTS monto_inscripcion numeric DEFAULT 150;
ALTER TABLE public.miembro DROP COLUMN IF EXISTS monto_mensual;


CREATE TABLE IF NOT EXISTS public.notificacion (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE CASCADE,
    titulo text NOT NULL,
    descripcion text,
    estado text DEFAULT 'pendiente',
    creacion timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tipo_actividad (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    descripcion text,
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.actividad (
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
    publicado boolean DEFAULT true,
    hash_anterior text,
    hash_actual text,
    blockchain_tx_id text,
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inscripcion (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE CASCADE,
    actividad_id uuid REFERENCES public.actividad(id) ON DELETE CASCADE,
    fecha_inscripcion timestamptz DEFAULT now(),
    estado text DEFAULT 'confirmado',
    UNIQUE NULLS NOT DISTINCT (miembro_id, actividad_id),
    creacion timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tipo_ingreso (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    descripcion text,
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

-- Sembrado inicial para tipo_ingreso
INSERT INTO public.tipo_ingreso (nombre, descripcion)
VALUES ('Pago de Actividad', 'Pago por inscripción a actividades académicas o eventos con costo.')
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tipo_egreso (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    descripcion text,
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

-- Sembrado inicial para tipo_egreso
INSERT INTO public.tipo_egreso (nombre, descripcion)
VALUES ('Pago de Activos', 'Egresos destinados a la adquisición, mantenimiento o gestión de activos institucionales.')
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tipo_activo (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    descripcion text,
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activos (
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

CREATE TABLE IF NOT EXISTS public.ingreso (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    registrado_por uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    devuelto_por uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    tipo_ingreso_id uuid REFERENCES public.tipo_ingreso(id),
    inscripcion_id uuid REFERENCES public.inscripcion(id) ON DELETE SET NULL,
    monto numeric(12,2) NOT NULL,
    fecha date NOT NULL,
    descripcion text,
    estado text DEFAULT 'pagada',
    hash_anterior text,
    hash_actual text,
    blockchain_tx_id text,
    creacion timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.egreso (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    tipo_egreso_id uuid REFERENCES public.tipo_egreso(id),
    activo_id uuid REFERENCES public.activos(id) ON DELETE SET NULL,
    concepto text NOT NULL,
    monto numeric(12,2) NOT NULL,
    descripcion text,
    hash_anterior text,
    hash_actual text,
    blockchain_tx_id text,
    creacion timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.detalles (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    egreso_id uuid REFERENCES public.egreso(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    fecha date NOT NULL,
    descripcion text,
    creacion timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.archivo (
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


CREATE TABLE IF NOT EXISTS public.jurado (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE CASCADE,
    actividad_id uuid REFERENCES public.actividad(id) ON DELETE CASCADE,
    actividad_externa text,
    descripcion text,
    fecha_asignacion timestamptz DEFAULT now(),
    creacion timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS jurado_sistema_miembro_unique_idx ON public.jurado (miembro_id, actividad_id) WHERE miembro_id IS NOT NULL AND actividad_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS jurado_externa_miembro_unique_idx ON public.jurado (miembro_id, actividad_externa) WHERE miembro_id IS NOT NULL AND actividad_externa IS NOT NULL;

-- ==========================================
-- 3. FUNCIONES Y TRIGGERS (Automatización)
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_academico_status()
RETURNS trigger AS $$
BEGIN
  IF NEW.estado = 'cancelado' THEN
    RETURN NEW;
  END IF;

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

DROP TRIGGER IF EXISTS tr_update_actividad_status ON public.actividad;
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

DROP TRIGGER IF EXISTS tr_decrease_cupos ON public.inscripcion;
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

DROP TRIGGER IF EXISTS tr_update_activo_saldo ON public.egreso;
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
        v_titulo_actividad := COALESCE(NEW.actividad_externa, 'Actividad externa');
    END IF;

    INSERT INTO public.notificacion (miembro_id, titulo, descripcion)
    VALUES (
        NEW.miembro_id,
        'Asignación como Jurado',
        'Jurado asignado para: ' || v_titulo_actividad || COALESCE('. Detalle: ' || NEW.descripcion, '')
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
  v_frecuencia text;
  v_monto numeric;
  v_monto_inscripcion numeric;
  v_interval interval;
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

  -- Obtener la configuración actual de cuotas para el valor de bienvenida y frecuencia
  SELECT frecuencia, monto_cuota INTO v_frecuencia, v_monto 
  FROM public.configuracion_cuotas 
  ORDER BY creacion DESC LIMIT 1;

  v_frecuencia := COALESCE(v_frecuencia, 'mes');
  
  -- Leer monto_inscripcion de la metadata si se especificó, o usar 150 por defecto
  v_monto_inscripcion := COALESCE((new.raw_user_meta_data->>'monto_inscripcion')::numeric, 150);

  IF v_frecuencia = '1_minuto' THEN
    v_interval := INTERVAL '1 minute';
  ELSIF v_frecuencia = '3_minutos' THEN
    v_interval := INTERVAL '3 minutes';
  ELSIF v_frecuencia = '5_minutos' THEN
    v_interval := INTERVAL '5 minutes';
  ELSIF v_frecuencia = '1_dia' THEN
    v_interval := INTERVAL '1 day';
  ELSIF v_frecuencia = '2_dias' THEN
    v_interval := INTERVAL '2 days';
  ELSIF v_frecuencia = '3_dias' THEN
    v_interval := INTERVAL '3 days';
  ELSIF v_frecuencia = 'semana' THEN
    v_interval := INTERVAL '1 week';
  ELSIF v_frecuencia = 'trimestre' THEN
    v_interval := INTERVAL '3 months';
  ELSE
    v_interval := INTERVAL '1 month';
  END IF;

  INSERT INTO public.miembro (id, nombre, "correoElectronico", rol, fecha_proxima_cuota, monto_inscripcion)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    new.email, 
    v_rol,
    now() + v_interval,
    v_monto_inscripcion
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insertar primera cuota de bienvenida (Inscripción)
  INSERT INTO public.cuota_membresia (miembro_id, periodo, monto_esperado, estado)
  VALUES (
    new.id,
    CASE 
      WHEN v_frecuencia = '3_minutos' THEN 'Inscripción (3 min)'
      WHEN v_frecuencia = '1_dia' THEN 'Inscripción (Día)'
      ELSE 'Inscripción ' || TO_CHAR(now(), 'YYYY-MM')
    END,
    v_monto_inscripcion,
    'pendiente'
  );
  
  -- Insert welcome notification
  INSERT INTO public.notificacion (miembro_id, titulo, descripcion)
  VALUES (
    new.id,
    '¡Bienvenido!',
    'Te damos la bienvenida.'
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Gestión de pausa de cuotas por estado inactivo de socio
-- Asegurar que la columna sea de tipo numeric para guardar precisión decimal de días de pausa
ALTER TABLE public.miembro ALTER COLUMN dias_pausados TYPE numeric;

CREATE OR REPLACE FUNCTION public.gestionar_pausa_miembro()
RETURNS trigger AS $$
DECLARE
    v_frecuencia text;
    v_interval interval;
BEGIN
    -- Si el estado cambia de activo a inactivo, guardar fecha de pausa y congelar el tiempo restante para la cuota
    IF OLD.estado = 'activo' AND NEW.estado = 'inactivo' THEN
        NEW.fecha_pausa := now();
        IF OLD.fecha_proxima_cuota IS NOT NULL THEN
            NEW.tiempo_restante_cuota := OLD.fecha_proxima_cuota - now();
            NEW.fecha_proxima_cuota := NULL;
        END IF;
    -- Si el estado cambia de inactivo a activo, calcular días pausados y restablecer la fecha de la próxima cuota
    ELSIF OLD.estado = 'inactivo' AND NEW.estado = 'activo' THEN
        IF OLD.fecha_pausa IS NOT NULL THEN
            NEW.dias_pausados := COALESCE(OLD.dias_pausados, 0) + (EXTRACT(EPOCH FROM (now() - OLD.fecha_pausa)) / 86400.0);
            NEW.fecha_pausa := NULL;
        END IF;

        -- Si el frontend pide expresamente reiniciar (tiempo_restante_cuota es NULL en NEW)
        IF NEW.tiempo_restante_cuota IS NULL THEN
            -- Obtener frecuencia actual
            SELECT frecuencia INTO v_frecuencia FROM public.configuracion_cuotas ORDER BY creacion DESC LIMIT 1;
            v_frecuencia := COALESCE(v_frecuencia, 'mes');

            IF v_frecuencia = '1_minuto' THEN v_interval := INTERVAL '1 minute';
            ELSIF v_frecuencia = '3_minutos' THEN v_interval := INTERVAL '3 minutes';
            ELSIF v_frecuencia = '5_minutos' THEN v_interval := INTERVAL '5 minutes';
            ELSIF v_frecuencia = '1_dia' THEN v_interval := INTERVAL '1 day';
            ELSIF v_frecuencia = '2_dias' THEN v_interval := INTERVAL '2 days';
            ELSIF v_frecuencia = '3_dias' THEN v_interval := INTERVAL '3 days';
            ELSIF v_frecuencia = 'semana' THEN v_interval := INTERVAL '1 week';
            ELSIF v_frecuencia = 'trimestre' THEN v_interval := INTERVAL '3 months';
            ELSE v_interval := INTERVAL '1 month';
            END IF;

            NEW.fecha_proxima_cuota := now() + v_interval;
        ELSE
            -- Reanudar desde donde se pausó
            NEW.fecha_proxima_cuota := now() + NEW.tiempo_restante_cuota;
            NEW.tiempo_restante_cuota := NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trg_gestionar_pausa_miembro ON public.miembro;
CREATE TRIGGER trg_gestionar_pausa_miembro
  BEFORE UPDATE OF estado ON public.miembro
  FOR EACH ROW
  EXECUTE FUNCTION public.gestionar_pausa_miembro();

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
      convert_to(NEW.id::text || NEW.monto::text || NEW.creacion::text || NEW.hash_anterior, 'utf8'),
      'sha256'
    ), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_blockchain_ingreso ON public.ingreso;
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
      convert_to(NEW.id::text || NEW.monto::text || NEW.creacion::text || NEW.hash_anterior, 'utf8'),
      'sha256'
    ), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_blockchain_egreso ON public.egreso;
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

DROP TRIGGER IF EXISTS tr_blockchain_activo ON public.activos;
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

DROP TRIGGER IF EXISTS tr_blockchain_archivo ON public.archivo;
CREATE TRIGGER tr_blockchain_archivo
BEFORE INSERT ON public.archivo
FOR EACH ROW EXECUTE FUNCTION public.sellar_archivo();

-- Sellado: actividad
CREATE OR REPLACE FUNCTION public.sellar_actividad()
RETURNS trigger AS $$
DECLARE
    v_hash_anterior TEXT;
BEGIN
    IF NEW.hash_actual IS NULL THEN
        SELECT hash_actual INTO v_hash_anterior
        FROM public.actividad
        WHERE hash_actual IS NOT NULL
        ORDER BY creacion DESC
        LIMIT 1;

        NEW.hash_anterior := COALESCE(v_hash_anterior, 'genesis');
        NEW.hash_actual := encode(extensions.digest(
          convert_to(NEW.id::text || NEW.titulo || NEW.costo::text || NEW.fecha::text || NEW.hash_anterior, 'utf8'),
          'sha256'
        ), 'hex');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_blockchain_actividad ON public.actividad;
CREATE TRIGGER tr_blockchain_actividad
BEFORE INSERT ON public.actividad
FOR EACH ROW EXECUTE FUNCTION public.sellar_actividad();

-- ==========================================
-- 3.5. ÍNDICES DE OPTIMIZACIÓN (PERFORMANCE)
-- ==========================================

-- Índices en Claves Foráneas para Acelerar Consultas y Joins
CREATE INDEX IF NOT EXISTS idx_actividad_tipo ON public.actividad(tipo_actividad_id);
CREATE INDEX IF NOT EXISTS idx_actividad_miembro ON public.actividad(miembro_id);
CREATE INDEX IF NOT EXISTS idx_inscripcion_miembro ON public.inscripcion(miembro_id);
CREATE INDEX IF NOT EXISTS idx_inscripcion_actividad ON public.inscripcion(actividad_id);
CREATE INDEX IF NOT EXISTS idx_activos_miembro ON public.activos(miembro_id);
CREATE INDEX IF NOT EXISTS idx_activos_tipo ON public.activos(tipo_activo_id);
CREATE INDEX IF NOT EXISTS idx_ingreso_miembro ON public.ingreso(miembro_id);
CREATE INDEX IF NOT EXISTS idx_ingreso_tipo ON public.ingreso(tipo_ingreso_id);
CREATE INDEX IF NOT EXISTS idx_egreso_miembro ON public.egreso(miembro_id);
CREATE INDEX IF NOT EXISTS idx_egreso_tipo ON public.egreso(tipo_egreso_id);
CREATE INDEX IF NOT EXISTS idx_notificacion_miembro ON public.notificacion(miembro_id);
CREATE INDEX IF NOT EXISTS idx_jurado_actividad ON public.jurado(actividad_id);
CREATE INDEX IF NOT EXISTS idx_jurado_miembro ON public.jurado(miembro_id);

-- Índices en Claves Foráneas para archivos adjuntos
CREATE INDEX IF NOT EXISTS idx_archivo_egreso ON public.archivo(egreso_id);
CREATE INDEX IF NOT EXISTS idx_archivo_ingreso ON public.archivo(ingreso_id);
CREATE INDEX IF NOT EXISTS idx_archivo_activo ON public.archivo(activo_id);
CREATE INDEX IF NOT EXISTS idx_archivo_actividad ON public.archivo(actividad_id);
CREATE INDEX IF NOT EXISTS idx_archivo_miembro ON public.archivo(miembro_id);

-- Índices de Carga Ordenada para Evitar Ordenamientos en Memoria en Triggers Blockchain
CREATE INDEX IF NOT EXISTS idx_archivo_blockchain_sync ON public.archivo(creacion DESC, hash_actual);
CREATE INDEX IF NOT EXISTS idx_actividad_blockchain_sync ON public.actividad(creacion DESC, hash_actual);
CREATE INDEX IF NOT EXISTS idx_activos_blockchain_sync ON public.activos(creacion DESC, hash_actual);
CREATE INDEX IF NOT EXISTS idx_ingreso_blockchain_sync ON public.ingreso(creacion DESC, hash_actual);
CREATE INDEX IF NOT EXISTS idx_egreso_blockchain_sync ON public.egreso(creacion DESC, hash_actual);

-- Índices Adicionales de Rendimiento y Claves Foráneas Faltantes
CREATE INDEX IF NOT EXISTS idx_ingreso_inscripcion ON public.ingreso(inscripcion_id) WHERE inscripcion_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_egreso_activo ON public.egreso(activo_id) WHERE activo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_detalles_egreso ON public.detalles(egreso_id);

-- Índices en Columnas Filtradas y Ordenadas Frecuentemente
CREATE INDEX IF NOT EXISTS idx_miembro_estado ON public.miembro(estado);
CREATE INDEX IF NOT EXISTS idx_miembro_rol ON public.miembro(rol);
CREATE INDEX IF NOT EXISTS idx_actividad_fecha_estado_pub ON public.actividad(fecha, estado, publicado);
CREATE INDEX IF NOT EXISTS idx_ingreso_fecha_estado ON public.ingreso(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_detalles_fecha ON public.detalles(fecha);

-- Meta-Indexing: Índices de Trigramas GIN para Búsquedas de Texto (ilike)
CREATE INDEX IF NOT EXISTS idx_miembro_nombre_trgm ON public.miembro USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_actividad_titulo_trgm ON public.actividad USING gin (titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ingreso_desc_trgm ON public.ingreso USING gin (descripcion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_egreso_concepto_trgm ON public.egreso USING gin (concepto gin_trgm_ops);

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
  dias_pausados numeric      NOT NULL DEFAULT 0,
  frecuencia    text         NOT NULL DEFAULT 'mes',
  monto_cuota   numeric      NOT NULL DEFAULT 20,
  dias_recordatorio_activos integer NOT NULL DEFAULT 5,
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
ALTER TABLE public.configuracion_cuotas ADD COLUMN IF NOT EXISTS monto_cuota   numeric NOT NULL DEFAULT 20;
ALTER TABLE public.configuracion_cuotas ADD COLUMN IF NOT EXISTS dias_recordatorio_activos integer NOT NULL DEFAULT 5;

INSERT INTO public.configuracion_cuotas (pausado, dias_pausados, frecuencia, monto_cuota, dias_recordatorio_activos)
SELECT false, 0, 'mes', 20, 5
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

CREATE INDEX IF NOT EXISTS idx_plan_amortizacion_activo ON public.plan_amortizacion("activoId");

-- ── Tabla: cuota_membresia ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cuota_membresia (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE CASCADE,
    configuracion_id uuid REFERENCES public.configuracion_cuotas(id) ON DELETE SET NULL,
    periodo text NOT NULL,
    monto_esperado numeric(12,2) NOT NULL DEFAULT 150,
    estado text DEFAULT 'pendiente', -- 'pendiente', 'pagado'
    ingreso_id uuid REFERENCES public.ingreso(id) ON DELETE SET NULL,
    creacion timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuota_membresia_miembro ON public.cuota_membresia(miembro_id);

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
ALTER TABLE public.cuota_membresia ENABLE ROW LEVEL SECURITY;


-- Eliminar políticas existentes antes de crearlas para evitar errores de duplicación
DROP POLICY IF EXISTS "Acceso total" ON public.miembro;
DROP POLICY IF EXISTS "Acceso total" ON public.notificacion;
DROP POLICY IF EXISTS "Acceso total" ON public.tipo_actividad;
DROP POLICY IF EXISTS "Acceso total" ON public.actividad;
DROP POLICY IF EXISTS "Acceso total" ON public.tipo_ingreso;
DROP POLICY IF EXISTS "Acceso total" ON public.tipo_egreso;
DROP POLICY IF EXISTS "Acceso total" ON public.ingreso;
DROP POLICY IF EXISTS "Acceso total" ON public.egreso;
DROP POLICY IF EXISTS "Acceso total" ON public.activos;
DROP POLICY IF EXISTS "Acceso total" ON public.detalles;
DROP POLICY IF EXISTS "Acceso total" ON public.archivo;
DROP POLICY IF EXISTS "Acceso total" ON public.inscripcion;
DROP POLICY IF EXISTS "Acceso total" ON public.tipo_activo;
DROP POLICY IF EXISTS "Acceso total" ON public.configuracion_cuotas;
DROP POLICY IF EXISTS "Acceso total" ON public.plan_amortizacion;
DROP POLICY IF EXISTS "Acceso total" ON public.jurado;
DROP POLICY IF EXISTS "Acceso total" ON public.cuota_membresia;


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
CREATE POLICY "Acceso total" ON public.cuota_membresia FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Políticas para permitir la lectura pública (visitantes sin sesión iniciada)
DROP POLICY IF EXISTS "Lectura publica de miembros" ON public.miembro;
DROP POLICY IF EXISTS "Lectura publica de tipo_actividad" ON public.tipo_actividad;
DROP POLICY IF EXISTS "Lectura publica de actividad" ON public.actividad;
DROP POLICY IF EXISTS "Lectura publica de archivo" ON public.archivo;
DROP POLICY IF EXISTS "Lectura publica de jurado" ON public.jurado;
DROP POLICY IF EXISTS "Lectura publica de ingresos" ON public.ingreso;

CREATE POLICY "Lectura publica de miembros" ON public.miembro FOR SELECT TO anon USING (estado = 'activo');
CREATE POLICY "Lectura publica de tipo_actividad" ON public.tipo_actividad FOR SELECT TO anon USING (true);
CREATE POLICY "Lectura publica de actividad" ON public.actividad FOR SELECT TO anon USING (true);
CREATE POLICY "Lectura publica de archivo" ON public.archivo FOR SELECT TO anon USING (true);
CREATE POLICY "Lectura publica de jurado" ON public.jurado FOR SELECT TO anon USING (true);
CREATE POLICY "Lectura publica de ingresos" ON public.ingreso FOR SELECT TO anon USING (true);

-- Habilitar tiempo real para las tablas correspondientes de forma segura
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'miembro'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.miembro;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'notificacion'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacion;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'plan_amortizacion'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_amortizacion;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'cuota_membresia'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cuota_membresia;
    END IF;

END $$;

NOTIFY pgrst, 'reload schema';

-- ==============================================================
-- OPTIMIZACIONES SUPABASE & LIMPIEZA DE DATOS EFÍMEROS
-- ==============================================================
-- Este script automatiza la limpieza de registros antiguos (basura)
-- en la tabla "notificacion" para mantener el uso de la Base de Datos 
-- optimizado por debajo de los 500 MB (límite del plan gratuito).
-- ==============================================================

-- ==============================================================
-- 1. LIMPIEZA AUTOMÁTICA DE NOTIFICACIONES MAYORES A 100 DÍAS
-- ==============================================================

-- Función que realiza el borrado de notificaciones antiguas (basura)
CREATE OR REPLACE FUNCTION public.limpiar_notificaciones_antiguas()
RETURNS trigger AS $$
BEGIN
    -- Elimina todas las notificaciones que tengan más de 100 días de antigüedad
    DELETE FROM public.notificacion
    WHERE creacion < NOW() - INTERVAL '100 days';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se dispara después de insertar una nueva notificación
DROP TRIGGER IF EXISTS tr_limpiar_notificaciones_excedentes ON public.notificacion;
CREATE TRIGGER tr_limpiar_notificaciones_excedentes
    AFTER INSERT ON public.notificacion
    FOR EACH ROW
    EXECUTE FUNCTION public.limpiar_notificaciones_antiguas();

-- Ejecutar una limpieza inicial inmediata de cualquier registro huérfano o antiguo
DELETE FROM public.notificacion
WHERE creacion < NOW() - INTERVAL '100 days';

-- ==============================================================
-- 2. CREACIÓN DE ÍNDICES PARA BÚSQUEDAS RÁPIDAS (Optimiza CPU/Memoria)
-- ==============================================================
-- Estos índices mejoran dramáticamente la velocidad de las consultas 
-- frecuentes en el sistema financiero y evitan escaneos secuenciales costosos.

-- Índices para la tabla ingreso (búsquedas por miembro y estado)
CREATE INDEX IF NOT EXISTS idx_ingreso_miembro_id ON public.ingreso(miembro_id);
CREATE INDEX IF NOT EXISTS idx_ingreso_estado ON public.ingreso(estado);

-- Índices para la tabla egreso
CREATE INDEX IF NOT EXISTS idx_egreso_miembro_id ON public.egreso(miembro_id);

-- Índices para la tabla archivo (búsqueda de urls y relaciones polimórficas)
CREATE INDEX IF NOT EXISTS idx_archivo_relaciones ON public.archivo(egreso_id, ingreso_id, activo_id);

-- Índices para notificaciones (búsquedas activas en realtime por miembro)
CREATE INDEX IF NOT EXISTS idx_notificacion_miembro_pendiente ON public.notificacion(miembro_id, estado);

