-- =====================================================================
-- SCRIPT UNIFICADO: REINICIO, ESQUEMA Y POBLACIÓN DE DATOS
-- control-financiero — revisión experta v3 (auditoría integral)
-- =====================================================================
-- ADVERTENCIA: Este script ELIMINA todo el esquema público y todos sus
-- datos. No lo use en producción sin confirmar que tiene respaldo.
-- =====================================================================

-- =====================================================================
-- 1. REINICIO DEL ESQUEMA
-- =====================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Restablecer permisos básicos para Supabase / PostgREST
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role, authenticator;

-- Extensiones necesarias (una sola vez)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"  SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_trgm"   SCHEMA public;

-- Limpiar usuarios de auth trabados (solo en reset local)
DELETE FROM auth.identities;
DELETE FROM auth.users;

SELECT 'Esquema público reiniciado exitosamente.' AS status;


-- =====================================================================
-- 2. CREACIÓN DE TABLAS
-- (Orden respeta dependencias: primero las referenciadas, luego las que referencian)
-- =====================================================================

-- ── miembro ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.miembro (
    id                   uuid PRIMARY KEY,
    nombre               text NOT NULL,
    "apellidoPaterno"    text,
    "apellidoMaterno"    text,
    "correoElectronico"  text UNIQUE,
    telefono             text,
    profesion            text,
    biografia            text,
    rol                  text DEFAULT 'socio'
                             CONSTRAINT chk_miembro_rol
                             CHECK (rol IN ('admin', 'socio', 'secretario', 'tesorero')),
    estado               text DEFAULT 'activo'
                             CONSTRAINT chk_miembro_estado
                             CHECK (estado IN ('activo', 'inactivo')),
    fecha_pausa          timestamptz DEFAULT NULL,
    dias_pausados        numeric     DEFAULT 0,
    fecha_proxima_cuota  timestamptz DEFAULT NULL,
    tiempo_restante_cuota interval   DEFAULT NULL,
    monto_inscripcion    numeric     DEFAULT 150,
    ci                   text,
    creacion             timestamptz DEFAULT now(),
    actualizacion        timestamptz DEFAULT now()
);

-- ── notificacion ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notificacion (
    id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id uuid REFERENCES public.miembro(id) ON DELETE CASCADE,
    titulo     text NOT NULL,
    descripcion text,
    estado     text DEFAULT 'pendiente',
    creacion   timestamptz DEFAULT now()
);

-- ── tipo_actividad ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tipo_actividad (
    id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre      text NOT NULL,
    descripcion text,
    creacion    timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

-- ── actividad ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.actividad (
    id                   uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id           uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    tipo_actividad_id    uuid REFERENCES public.tipo_actividad(id) ON DELETE SET NULL,
    titulo               text NOT NULL,
    descripcion          text,
    fecha                date NOT NULL,
    hora                 time NOT NULL,
    cupos                integer DEFAULT 0,
    ubicacion            text,
    latitud              numeric(10,8),
    longitud             numeric(11,8),
    modalidad            text DEFAULT 'presencial',
    costo                numeric(10,2) DEFAULT 0,
    requisitos           text,
    incluye_certificacion boolean DEFAULT false,
    estado               text DEFAULT 'programado',
    publicado            boolean DEFAULT true,
    creacion             timestamptz DEFAULT now(),
    actualizacion        timestamptz DEFAULT now()
);

-- ── inscripcion ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inscripcion (
    id                uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id        uuid REFERENCES public.miembro(id) ON DELETE CASCADE,
    actividad_id      uuid REFERENCES public.actividad(id) ON DELETE CASCADE,
    fecha_inscripcion timestamptz DEFAULT now(),
    -- Estados validos: 'confirmado' (default), 'cancelado' (desvinculado), 'pagado' (costo saldado)
    estado            text DEFAULT 'confirmado'
                          CONSTRAINT chk_inscripcion_estado
                          CHECK (estado IN ('confirmado', 'cancelado', 'pagado')),
    creacion          timestamptz DEFAULT now(),
    UNIQUE NULLS NOT DISTINCT (miembro_id, actividad_id)
);

-- ── tipo_ingreso ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tipo_ingreso (
    id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre      text NOT NULL UNIQUE,
    descripcion text,
    creacion    timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

INSERT INTO public.tipo_ingreso (nombre, descripcion)
VALUES ('Pago de Cuota', 'Pago de cuota mensual ordinaria.')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.tipo_ingreso (nombre, descripcion)
VALUES ('Pago por Actividad', 'Pago por inscripción a actividades académicas o eventos con costo.')
ON CONFLICT (nombre) DO NOTHING;



-- ── tipo_egreso ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tipo_egreso (
    id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre      text NOT NULL UNIQUE,
    descripcion text,
    creacion    timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

INSERT INTO public.tipo_egreso (nombre, descripcion)
VALUES ('Pago de Activos', 'Egresos destinados a la adquisición, mantenimiento o gestión de activos institucionales.')
ON CONFLICT (nombre) DO NOTHING;

-- ── tipo_activo ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tipo_activo (
    id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre      text NOT NULL,
    descripcion text,
    creacion    timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now()
);

-- ── activos ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activos (
    id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id      uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    tipo_activo_id  uuid REFERENCES public.tipo_activo(id) ON DELETE SET NULL,
    nombre          text NOT NULL,
    descripcion     text,
    costo_total     numeric(12,2) DEFAULT 0
                        CONSTRAINT chk_activos_costo_positivo CHECK (costo_total >= 0),
    saldo_pendiente numeric(12,2) DEFAULT 0
                        CONSTRAINT chk_activos_saldo_positivo CHECK (saldo_pendiente >= 0),
    estado          text DEFAULT 'deuda'
                        CONSTRAINT chk_activos_estado
                        CHECK (estado IN ('deuda', 'pagado', 'en_proceso')),
    "fechaAdquisicion" date,
    creacion        timestamptz DEFAULT now(),
    actualizacion   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qr_pago (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre          text NOT NULL,
    tipo_ingreso_id uuid REFERENCES public.tipo_ingreso(id) ON DELETE SET NULL,
    activo          boolean DEFAULT true,
    creacion        timestamptz DEFAULT now(),
    actualizacion   timestamptz DEFAULT now()
);

-- ── ingreso ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ingreso (
    id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id      uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    registrado_por  uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    devuelto_por    uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    tipo_ingreso_id uuid REFERENCES public.tipo_ingreso(id),
    inscripcion_id  uuid REFERENCES public.inscripcion(id) ON DELETE SET NULL,
    qr_id           uuid REFERENCES public.qr_pago(id) ON DELETE SET NULL,
    monto           numeric(12,2) NOT NULL
                        CONSTRAINT chk_ingreso_monto CHECK (monto >= 0),
    fecha           date NOT NULL,
    descripcion     text,
    -- Estados: 'pagada' (default al registrar), 'devolucion' (reembolso total), 'pendiente'
    estado          text DEFAULT 'pagada'
                        CONSTRAINT chk_ingreso_estado
                        CHECK (estado IN ('pagada', 'devolucion', 'pendiente', 'rechazado')),
    creacion        timestamptz DEFAULT now()
);

-- ── egreso ───────────────────────────────────────────────────────────
-- Columna "fecha" permite reportes financieros por período.
CREATE TABLE IF NOT EXISTS public.egreso (
    id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id      uuid REFERENCES public.miembro(id) ON DELETE SET NULL,
    tipo_egreso_id  uuid REFERENCES public.tipo_egreso(id),
    activo_id       uuid REFERENCES public.activos(id) ON DELETE SET NULL,
    concepto        text NOT NULL,
    monto           numeric(12,2) NOT NULL
                        CONSTRAINT chk_egreso_monto_positivo CHECK (monto > 0),
    fecha           date NOT NULL DEFAULT CURRENT_DATE,
    descripcion     text,
    creacion        timestamptz DEFAULT now()
);

-- ── detalles ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.detalles (
    id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    egreso_id   uuid REFERENCES public.egreso(id) ON DELETE CASCADE,
    nombre      text NOT NULL,
    fecha       date NOT NULL,
    descripcion text,
    creacion    timestamptz DEFAULT now()
);

-- ── archivo ──────────────────────────────────────────────────────────
-- Almacenamiento: Cloudinary (URL externa). No se usa Supabase Storage.
-- CONSTRAINT: todo archivo debe estar vinculado a al menos una entidad.
CREATE TABLE IF NOT EXISTS public.archivo (
    id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id   uuid REFERENCES public.miembro(id)  ON DELETE CASCADE,
    egreso_id    uuid REFERENCES public.egreso(id)   ON DELETE CASCADE,
    ingreso_id   uuid REFERENCES public.ingreso(id)  ON DELETE CASCADE,
    activo_id    uuid REFERENCES public.activos(id)  ON DELETE CASCADE,
    actividad_id uuid REFERENCES public.actividad(id) ON DELETE CASCADE,
    qr_id        uuid REFERENCES public.qr_pago(id)  ON DELETE CASCADE,
    url          text NOT NULL,
    tipo         text,
    estado       text DEFAULT 'activo',
    creacion     timestamptz DEFAULT now(),
    actualizacion timestamptz DEFAULT now(),
    -- Garantiza que el archivo esté vinculado a al menos una entidad (no huérfanos)
    CONSTRAINT chk_archivo_tiene_referencia CHECK (
        miembro_id IS NOT NULL OR egreso_id IS NOT NULL OR
        ingreso_id IS NOT NULL OR activo_id IS NOT NULL OR
        actividad_id IS NOT NULL OR qr_id IS NOT NULL
    )
);

-- ── jurado ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jurado (
    id                uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id        uuid REFERENCES public.miembro(id)   ON DELETE CASCADE,
    actividad_id      uuid REFERENCES public.actividad(id) ON DELETE CASCADE,
    actividad_externa text,
    descripcion       text,
    fecha_asignacion  timestamptz DEFAULT now(),
    creacion          timestamptz DEFAULT now(),
    actualizacion     timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS jurado_sistema_miembro_unique_idx
    ON public.jurado (miembro_id, actividad_id)
    WHERE miembro_id IS NOT NULL AND actividad_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS jurado_externa_miembro_unique_idx
    ON public.jurado (miembro_id, actividad_externa)
    WHERE miembro_id IS NOT NULL AND actividad_externa IS NOT NULL;

-- ── configuracion_cuotas ─────────────────────────────────────────────
-- Control global de cuotas de membresía.
-- SINGLETON: singleton_guard=true con UNIQUE garantiza una sola fila en toda la tabla.
-- El frontend debe usar UPSERT (ON CONFLICT) en lugar de INSERT para actualizar.
CREATE TABLE IF NOT EXISTS public.configuracion_cuotas (
    id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Columna centinela: garantiza que solo exista UN registro de configuración activa
    singleton_guard           boolean     NOT NULL DEFAULT true
                                  CONSTRAINT uq_configuracion_singleton UNIQUE,
    pausado                   boolean     NOT NULL DEFAULT false,
    fecha_pausa               timestamptz,
    dias_pausados             numeric     NOT NULL DEFAULT 0,
    frecuencia                text        NOT NULL DEFAULT 'mes'
                                  CONSTRAINT chk_config_frecuencia
                                  CHECK (frecuencia IN ('1_minuto','3_minutos','5_minutos','1_dia','2_dias','3_dias','semana','mes','trimestre')),
    monto_cuota               numeric     NOT NULL DEFAULT 20
                                  CONSTRAINT chk_config_monto_positivo CHECK (monto_cuota > 0),
    dias_recordatorio_activos integer     NOT NULL DEFAULT 5
                                  CONSTRAINT chk_config_dias_positivos CHECK (dias_recordatorio_activos >= 0),
    creacion                  timestamptz NOT NULL DEFAULT now(),
    actualizacion             timestamptz NOT NULL DEFAULT now()
);

-- Registro singleton inicial (UPSERT: actualiza si ya existe)
INSERT INTO public.configuracion_cuotas
    (singleton_guard, pausado, dias_pausados, frecuencia, monto_cuota, dias_recordatorio_activos)
VALUES
    (true, false, 0, 'mes', 20, 5)
ON CONFLICT (singleton_guard) DO NOTHING;

-- ── plan_amortizacion ────────────────────────────────────────────────
-- NORMALIZADO: columnas en snake_case para consistencia con el resto del esquema.
CREATE TABLE IF NOT EXISTS public.plan_amortizacion (
    id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    activo_id        uuid REFERENCES public.activos(id) ON DELETE CASCADE NOT NULL,
    numero           integer NOT NULL CONSTRAINT chk_plan_numero_positivo CHECK (numero > 0),
    fecha_vencimiento date NOT NULL,
    monto            numeric(12,2) NOT NULL CONSTRAINT chk_plan_monto_positivo CHECK (monto > 0),
    estado           text DEFAULT 'pendiente'
                         CONSTRAINT chk_plan_estado CHECK (estado IN ('pendiente', 'pagado', 'vencido')),
    creacion         timestamptz DEFAULT now(),
    actualizacion    timestamptz DEFAULT now()
);

-- ── cuota_membresia ──────────────────────────────────────────────────
-- UNIQUE(miembro_id, periodo): previene cuotas duplicadas en condiciones de concurrencia.
CREATE TABLE IF NOT EXISTS public.cuota_membresia (
    id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    miembro_id       uuid REFERENCES public.miembro(id)              ON DELETE CASCADE NOT NULL,
    configuracion_id uuid REFERENCES public.configuracion_cuotas(id) ON DELETE SET NULL,
    periodo          text NOT NULL,
    monto_esperado   numeric(12,2) NOT NULL DEFAULT 150
                         CONSTRAINT chk_cuota_monto_positivo CHECK (monto_esperado > 0),
    estado           text DEFAULT 'pendiente'
                         CONSTRAINT chk_cuota_estado CHECK (estado IN ('pendiente', 'pagado')),
    ingreso_id       uuid REFERENCES public.ingreso(id) ON DELETE SET NULL,
    creacion         timestamptz DEFAULT now(),
    -- Previene cuotas duplicadas por período para el mismo miembro (anti race-condition)
    CONSTRAINT uq_cuota_miembro_periodo UNIQUE (miembro_id, periodo)
);


-- =====================================================================
-- 3. FUNCIONES Y TRIGGERS (Automatización)
-- Todas las tablas ya están creadas en este punto.
-- =====================================================================

-- ── Actualización de estado de actividad según fecha ─────────────────
-- Protege los estados finales 'cancelado' y 'finalizado' (asignados manualmente).
-- Solo se recalcula cuando cambia la columna 'fecha' para evitar ejecuciones innecesarias.
CREATE OR REPLACE FUNCTION public.update_academico_status()
RETURNS trigger AS $$
BEGIN
    -- No sobreescribir estados finales establecidos manualmente
    IF NEW.estado IN ('cancelado', 'finalizado') THEN
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
    BEFORE INSERT OR UPDATE OF fecha ON public.actividad
    FOR EACH ROW EXECUTE FUNCTION public.update_academico_status();

-- ── Gestión de cupos al inscribirse/cancelar ──────────────────────────
-- Al insertar una inscripción confirmada: descuenta 1 cupo.
-- Al eliminar o cancelar: devuelve 1 cupo.
CREATE OR REPLACE FUNCTION public.gestionar_cupos()
RETURNS trigger AS $$
BEGIN
    -- INSERT de inscripción confirmada: descontar cupo
    IF TG_OP = 'INSERT' AND NEW.estado = 'confirmado' AND NEW.actividad_id IS NOT NULL THEN
        UPDATE public.actividad
        SET cupos = cupos - 1
        WHERE id = NEW.actividad_id AND cupos > 0;

    -- DELETE de inscripción confirmada: devolver cupo
    ELSIF TG_OP = 'DELETE' AND OLD.estado = 'confirmado' AND OLD.actividad_id IS NOT NULL THEN
        UPDATE public.actividad
        SET cupos = cupos + 1
        WHERE id = OLD.actividad_id;

    -- UPDATE: inscripción pasa de confirmado a cancelado → devolver cupo
    ELSIF TG_OP = 'UPDATE' AND OLD.estado = 'confirmado' AND NEW.estado = 'cancelado' AND NEW.actividad_id IS NOT NULL THEN
        UPDATE public.actividad
        SET cupos = cupos + 1
        WHERE id = NEW.actividad_id;

    -- UPDATE: inscripción pasa de cancelado a confirmado → descontar cupo
    ELSIF TG_OP = 'UPDATE' AND OLD.estado = 'cancelado' AND NEW.estado = 'confirmado' AND NEW.actividad_id IS NOT NULL THEN
        UPDATE public.actividad
        SET cupos = cupos - 1
        WHERE id = NEW.actividad_id AND cupos > 0;
    END IF;

    -- Para DELETE devolvemos OLD; para INSERT/UPDATE devolvemos NEW
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_gestionar_cupos ON public.inscripcion;
CREATE TRIGGER tr_gestionar_cupos
    AFTER INSERT OR UPDATE OF estado OR DELETE ON public.inscripcion
    FOR EACH ROW EXECUTE FUNCTION public.gestionar_cupos();

-- ── Gestión de saldo de activos (egreso vinculado) ────────────────────
-- Al registrar un egreso vinculado a un activo: reducir saldo_pendiente.
-- Al eliminar un egreso vinculado: restaurar saldo_pendiente.
-- Al actualizar el monto: ajustar la diferencia.
CREATE OR REPLACE FUNCTION public.gestionar_activo_saldo()
RETURNS trigger AS $$
BEGIN
    -- INSERT: descontar del saldo pendiente del activo
    IF TG_OP = 'INSERT' AND NEW.activo_id IS NOT NULL THEN
        UPDATE public.activos
        SET saldo_pendiente = GREATEST(saldo_pendiente - NEW.monto, 0)
        WHERE id = NEW.activo_id;

        UPDATE public.activos
        SET estado = 'pagado'
        WHERE id = NEW.activo_id AND saldo_pendiente <= 0;

    -- DELETE: devolver el monto al saldo pendiente del activo
    ELSIF TG_OP = 'DELETE' AND OLD.activo_id IS NOT NULL THEN
        UPDATE public.activos
        SET saldo_pendiente = saldo_pendiente + OLD.monto,
            estado = CASE
                WHEN saldo_pendiente + OLD.monto > 0 THEN 'deuda'
                ELSE estado
            END
        WHERE id = OLD.activo_id;

    -- UPDATE: si cambia el monto o el activo, ajustar la diferencia
    ELSIF TG_OP = 'UPDATE' THEN
        -- Revertir efecto sobre el activo anterior (si existía)
        IF OLD.activo_id IS NOT NULL THEN
            UPDATE public.activos
            SET saldo_pendiente = saldo_pendiente + OLD.monto,
                estado = CASE
                    WHEN saldo_pendiente + OLD.monto > 0 THEN 'deuda'
                    ELSE estado
                END
            WHERE id = OLD.activo_id;
        END IF;
        -- Aplicar efecto sobre el nuevo activo (si existe)
        IF NEW.activo_id IS NOT NULL THEN
            UPDATE public.activos
            SET saldo_pendiente = GREATEST(saldo_pendiente - NEW.monto, 0)
            WHERE id = NEW.activo_id;

            UPDATE public.activos
            SET estado = 'pagado'
            WHERE id = NEW.activo_id AND saldo_pendiente <= 0;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_gestionar_activo_saldo ON public.egreso;
CREATE TRIGGER tr_gestionar_activo_saldo
    AFTER INSERT OR UPDATE OF monto, activo_id OR DELETE ON public.egreso
    FOR EACH ROW EXECUTE FUNCTION public.gestionar_activo_saldo();

-- ── Notificación al asignar jurado ───────────────────────────────────
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

-- ── Creación de miembro al registrar usuario (Auth) ───────────────────
-- Todas las tablas referenciadas ya existen en este punto del script.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_count            integer;
    v_rol              text;
    v_frecuencia       text;
    v_monto            numeric;
    v_monto_inscripcion numeric;
    v_interval         interval;
BEGIN
    -- Primer usuario → admin; el resto → rol del metadata o 'socio'
    SELECT count(*) INTO v_count FROM public.miembro;
    IF v_count = 0 THEN
        v_rol := 'admin';
    ELSE
        v_rol := COALESCE(new.raw_user_meta_data->>'rol', 'socio');
    END IF;

    -- Obtener frecuencia y monto de cuota de la configuración activa
    SELECT frecuencia, monto_cuota
    INTO v_frecuencia, v_monto
    FROM public.configuracion_cuotas
    ORDER BY creacion DESC LIMIT 1;

    v_frecuencia := COALESCE(v_frecuencia, 'mes');

    -- Monto de inscripción desde metadata o defecto 150
    v_monto_inscripcion := COALESCE((new.raw_user_meta_data->>'monto_inscripcion')::numeric, 150);

    -- Calcular intervalo de la próxima cuota según frecuencia
    v_interval := CASE v_frecuencia
        WHEN '1_minuto'   THEN INTERVAL '1 minute'
        WHEN '3_minutos'  THEN INTERVAL '3 minutes'
        WHEN '5_minutos'  THEN INTERVAL '5 minutes'
        WHEN '1_dia'      THEN INTERVAL '1 day'
        WHEN '2_dias'     THEN INTERVAL '2 days'
        WHEN '3_dias'     THEN INTERVAL '3 days'
        WHEN 'semana'     THEN INTERVAL '1 week'
        WHEN 'trimestre'  THEN INTERVAL '3 months'
        ELSE                   INTERVAL '1 month'
    END;

    INSERT INTO public.miembro (id, nombre, "correoElectronico", rol, fecha_proxima_cuota, monto_inscripcion, ci)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        v_rol,
        now() + v_interval,
        v_monto_inscripcion,
        new.raw_user_meta_data->>'ci'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Cuota de bienvenida (inscripción)
    INSERT INTO public.cuota_membresia (miembro_id, periodo, monto_esperado, estado)
    VALUES (
        new.id,
        CASE
            WHEN v_frecuencia = '3_minutos' THEN 'Inscripción (3 min)'
            WHEN v_frecuencia = '1_dia'     THEN 'Inscripción (Día)'
            ELSE 'Inscripción ' || TO_CHAR(now(), 'YYYY-MM')
        END,
        v_monto_inscripcion,
        'pendiente'
    );

    -- Notificación de bienvenida
    INSERT INTO public.notificacion (miembro_id, titulo, descripcion)
    VALUES (
        new.id,
        '¡Bienvenido!',
        'Tu cuenta ha sido creada. ¡Te damos una cordial bienvenida a la institución!'
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Gestión de pausa/reanudación de cuotas por estado del miembro ─────
ALTER TABLE public.miembro ALTER COLUMN dias_pausados TYPE numeric;

CREATE OR REPLACE FUNCTION public.gestionar_pausa_miembro()
RETURNS trigger AS $$
DECLARE
    v_frecuencia text;
    v_interval   interval;
BEGIN
    -- activo → inactivo: congelar tiempo restante de cuota
    IF OLD.estado = 'activo' AND NEW.estado = 'inactivo' THEN
        NEW.fecha_pausa := now();
        IF OLD.fecha_proxima_cuota IS NOT NULL THEN
            NEW.tiempo_restante_cuota := OLD.fecha_proxima_cuota - now();
            NEW.fecha_proxima_cuota   := NULL;
        END IF;

    -- inactivo → activo: acumular días pausados y restablecer fecha de cuota
    ELSIF OLD.estado = 'inactivo' AND NEW.estado = 'activo' THEN
        IF OLD.fecha_pausa IS NOT NULL THEN
            NEW.dias_pausados := COALESCE(OLD.dias_pausados, 0)
                                 + (EXTRACT(EPOCH FROM (now() - OLD.fecha_pausa)) / 86400.0);
            NEW.fecha_pausa   := NULL;
        END IF;

        -- Si el frontend reinicia (tiempo_restante_cuota = NULL en NEW): nueva cuota desde ahora
        IF NEW.tiempo_restante_cuota IS NULL THEN
            SELECT frecuencia INTO v_frecuencia
            FROM public.configuracion_cuotas ORDER BY creacion DESC LIMIT 1;

            v_frecuencia := COALESCE(v_frecuencia, 'mes');

            v_interval := CASE v_frecuencia
                WHEN '1_minuto'  THEN INTERVAL '1 minute'
                WHEN '3_minutos' THEN INTERVAL '3 minutes'
                WHEN '5_minutos' THEN INTERVAL '5 minutes'
                WHEN '1_dia'     THEN INTERVAL '1 day'
                WHEN '2_dias'    THEN INTERVAL '2 days'
                WHEN '3_dias'    THEN INTERVAL '3 days'
                WHEN 'semana'    THEN INTERVAL '1 week'
                WHEN 'trimestre' THEN INTERVAL '3 months'
                ELSE                  INTERVAL '1 month'
            END;

            NEW.fecha_proxima_cuota := now() + v_interval;
        ELSE
            -- Reanudar desde donde se pausó
            NEW.fecha_proxima_cuota   := now() + NEW.tiempo_restante_cuota;
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

-- ── Actualización de timestamp en configuracion_cuotas ───────────────
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

-- ── Limpieza de notificaciones antiguas (> 100 días) ─────────────────
-- Optimización: solo ejecuta el DELETE si realmente existe alguna notificación
-- mayor a 100 días, evitando locks innecesarios en cada INSERT.
CREATE OR REPLACE FUNCTION public.limpiar_notificaciones_antiguas()
RETURNS trigger AS $$
BEGIN
    -- Verificación barata antes del DELETE masivo
    IF EXISTS (
        SELECT 1 FROM public.notificacion
        WHERE creacion < NOW() - INTERVAL '100 days'
        LIMIT 1
    ) THEN
        DELETE FROM public.notificacion
        WHERE creacion < NOW() - INTERVAL '100 days';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_limpiar_notificaciones_excedentes ON public.notificacion;
CREATE TRIGGER tr_limpiar_notificaciones_excedentes
    AFTER INSERT ON public.notificacion
    FOR EACH ROW
    EXECUTE FUNCTION public.limpiar_notificaciones_antiguas();

-- Limpieza inicial de registros antiguos existentes
DELETE FROM public.notificacion
WHERE creacion < NOW() - INTERVAL '100 days';


-- =====================================================================
-- 4. ÍNDICES DE OPTIMIZACIÓN
-- =====================================================================

-- Claves foráneas: aceleran JOINs y consultas relacionadas
CREATE INDEX IF NOT EXISTS idx_actividad_tipo          ON public.actividad(tipo_actividad_id);
CREATE INDEX IF NOT EXISTS idx_actividad_miembro       ON public.actividad(miembro_id);
CREATE INDEX IF NOT EXISTS idx_inscripcion_miembro     ON public.inscripcion(miembro_id);
CREATE INDEX IF NOT EXISTS idx_inscripcion_actividad   ON public.inscripcion(actividad_id);
CREATE INDEX IF NOT EXISTS idx_activos_miembro         ON public.activos(miembro_id);
CREATE INDEX IF NOT EXISTS idx_activos_tipo            ON public.activos(tipo_activo_id);
CREATE INDEX IF NOT EXISTS idx_ingreso_miembro         ON public.ingreso(miembro_id);
CREATE INDEX IF NOT EXISTS idx_ingreso_tipo            ON public.ingreso(tipo_ingreso_id);
CREATE INDEX IF NOT EXISTS idx_ingreso_inscripcion     ON public.ingreso(inscripcion_id) WHERE inscripcion_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_egreso_miembro          ON public.egreso(miembro_id);
CREATE INDEX IF NOT EXISTS idx_egreso_tipo             ON public.egreso(tipo_egreso_id);
CREATE INDEX IF NOT EXISTS idx_egreso_activo           ON public.egreso(activo_id) WHERE activo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_detalles_egreso         ON public.detalles(egreso_id);
CREATE INDEX IF NOT EXISTS idx_detalles_fecha          ON public.detalles(fecha);
CREATE INDEX IF NOT EXISTS idx_notificacion_miembro    ON public.notificacion(miembro_id);
CREATE INDEX IF NOT EXISTS idx_jurado_actividad        ON public.jurado(actividad_id);
CREATE INDEX IF NOT EXISTS idx_jurado_miembro          ON public.jurado(miembro_id);
CREATE INDEX IF NOT EXISTS idx_plan_amortizacion_activo ON public.plan_amortizacion(activo_id);
CREATE INDEX IF NOT EXISTS idx_cuota_membresia_miembro ON public.cuota_membresia(miembro_id);

-- Archivos adjuntos
CREATE INDEX IF NOT EXISTS idx_archivo_egreso          ON public.archivo(egreso_id);
CREATE INDEX IF NOT EXISTS idx_archivo_ingreso         ON public.archivo(ingreso_id);
CREATE INDEX IF NOT EXISTS idx_archivo_activo          ON public.archivo(activo_id);
CREATE INDEX IF NOT EXISTS idx_archivo_actividad       ON public.archivo(actividad_id);
CREATE INDEX IF NOT EXISTS idx_archivo_miembro         ON public.archivo(miembro_id);

-- Columnas de filtro frecuente
CREATE INDEX IF NOT EXISTS idx_miembro_estado          ON public.miembro(estado);
CREATE INDEX IF NOT EXISTS idx_miembro_rol             ON public.miembro(rol);
CREATE INDEX IF NOT EXISTS idx_actividad_fecha_estado  ON public.actividad(fecha, estado, publicado);
CREATE INDEX IF NOT EXISTS idx_ingreso_fecha_estado    ON public.ingreso(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_egreso_fecha            ON public.egreso(fecha);

-- Compuestos de alta demanda
CREATE INDEX IF NOT EXISTS idx_notificacion_miembro_estado   ON public.notificacion(miembro_id, estado);
CREATE INDEX IF NOT EXISTS idx_cuota_membresia_miembro_estado ON public.cuota_membresia(miembro_id, estado);

-- Trigramas GIN para búsquedas de texto (ILIKE)
CREATE INDEX IF NOT EXISTS idx_miembro_nombre_trgm     ON public.miembro  USING gin (nombre      gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_actividad_titulo_trgm   ON public.actividad USING gin (titulo      gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ingreso_desc_trgm       ON public.ingreso   USING gin (descripcion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_egreso_concepto_trgm    ON public.egreso    USING gin (concepto    gin_trgm_ops);


-- =====================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.miembro             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacion        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_actividad      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividad           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_ingreso        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_egreso         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingreso             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egreso              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archivo             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_activo         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripcion         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_amortizacion   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurado              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuota_membresia     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_pago             ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
-- FUNCIÓN HELPER: obtiene el rol del usuario autenticado actual
-- Usada por todas las policies para no repetir la subconsulta
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.miembro WHERE id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────
-- LIMPIAR POLÍTICAS ANTIGUAS (idempotente)
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso total"                    ON public.miembro;
DROP POLICY IF EXISTS "Acceso total"                    ON public.notificacion;
DROP POLICY IF EXISTS "Acceso total"                    ON public.tipo_actividad;
DROP POLICY IF EXISTS "Acceso total"                    ON public.actividad;
DROP POLICY IF EXISTS "Acceso total"                    ON public.tipo_ingreso;
DROP POLICY IF EXISTS "Acceso total"                    ON public.tipo_egreso;
DROP POLICY IF EXISTS "Acceso total"                    ON public.ingreso;
DROP POLICY IF EXISTS "Acceso total"                    ON public.egreso;
DROP POLICY IF EXISTS "Acceso total"                    ON public.activos;
DROP POLICY IF EXISTS "Acceso total"                    ON public.detalles;
DROP POLICY IF EXISTS "Acceso total"                    ON public.archivo;
DROP POLICY IF EXISTS "Acceso total"                    ON public.inscripcion;
DROP POLICY IF EXISTS "Acceso total"                    ON public.tipo_activo;
DROP POLICY IF EXISTS "Acceso total"                    ON public.configuracion_cuotas;
DROP POLICY IF EXISTS "Acceso total"                    ON public.plan_amortizacion;
DROP POLICY IF EXISTS "Acceso total"                    ON public.jurado;
DROP POLICY IF EXISTS "Acceso total"                    ON public.cuota_membresia;

DROP POLICY IF EXISTS "ver_propio"                      ON public.miembro;
DROP POLICY IF EXISTS "ver_todos_admin_sec"             ON public.miembro;
DROP POLICY IF EXISTS "actualizar_propio"               ON public.miembro;
DROP POLICY IF EXISTS "actualizar_admin"                ON public.miembro;
DROP POLICY IF EXISTS "insertar_trigger"                ON public.miembro;

DROP POLICY IF EXISTS "ver_propia_notificacion"         ON public.notificacion;
DROP POLICY IF EXISTS "ver_todas_admin"                 ON public.notificacion;
DROP POLICY IF EXISTS "marcar_leida"                    ON public.notificacion;
DROP POLICY IF EXISTS "insertar_notificacion"           ON public.notificacion;
DROP POLICY IF EXISTS "eliminar_notificacion"           ON public.notificacion;

DROP POLICY IF EXISTS "ver_ingreso_propio"              ON public.ingreso;
DROP POLICY IF EXISTS "ver_todos_ingresos"              ON public.ingreso;
DROP POLICY IF EXISTS "insertar_ingreso"                ON public.ingreso;
DROP POLICY IF EXISTS "actualizar_ingreso"              ON public.ingreso;
DROP POLICY IF EXISTS "eliminar_ingreso"                ON public.ingreso;

DROP POLICY IF EXISTS "ver_egresos"                     ON public.egreso;
DROP POLICY IF EXISTS "insertar_egreso"                 ON public.egreso;
DROP POLICY IF EXISTS "actualizar_egreso"               ON public.egreso;
DROP POLICY IF EXISTS "eliminar_egreso"                 ON public.egreso;

DROP POLICY IF EXISTS "ver_cuota_propia"                ON public.cuota_membresia;
DROP POLICY IF EXISTS "ver_todas_cuotas"                ON public.cuota_membresia;
DROP POLICY IF EXISTS "gestionar_cuotas"                ON public.cuota_membresia;

DROP POLICY IF EXISTS "ver_inscripcion_propia"          ON public.inscripcion;
DROP POLICY IF EXISTS "ver_todas_inscripciones"         ON public.inscripcion;
DROP POLICY IF EXISTS "inscribirse"                     ON public.inscripcion;
DROP POLICY IF EXISTS "gestionar_inscripciones"         ON public.inscripcion;

DROP POLICY IF EXISTS "ver_activo"                      ON public.activos;
DROP POLICY IF EXISTS "gestionar_activos"               ON public.activos;

DROP POLICY IF EXISTS "ver_plan_amortizacion"           ON public.plan_amortizacion;
DROP POLICY IF EXISTS "gestionar_plan_amortizacion"     ON public.plan_amortizacion;

DROP POLICY IF EXISTS "ver_config_cuotas"               ON public.configuracion_cuotas;
DROP POLICY IF EXISTS "gestionar_config_cuotas"         ON public.configuracion_cuotas;

DROP POLICY IF EXISTS "ver_archivo"                     ON public.archivo;
DROP POLICY IF EXISTS "insertar_archivo"                ON public.archivo;
DROP POLICY IF EXISTS "eliminar_archivo"                ON public.archivo;

DROP POLICY IF EXISTS "ver_qr_pago"                     ON public.qr_pago;
DROP POLICY IF EXISTS "gestionar_qr_pago"               ON public.qr_pago;

DROP POLICY IF EXISTS "ver_detalles"                    ON public.detalles;
DROP POLICY IF EXISTS "gestionar_detalles"              ON public.detalles;

DROP POLICY IF EXISTS "ver_catalogo"                    ON public.tipo_actividad;
DROP POLICY IF EXISTS "gestionar_tipo_actividad"        ON public.tipo_actividad;
DROP POLICY IF EXISTS "ver_actividad"                   ON public.actividad;
DROP POLICY IF EXISTS "gestionar_actividad"             ON public.actividad;
DROP POLICY IF EXISTS "ver_tipo_ingreso"                ON public.tipo_ingreso;
DROP POLICY IF EXISTS "gestionar_tipo_ingreso"          ON public.tipo_ingreso;
DROP POLICY IF EXISTS "ver_tipo_egreso"                 ON public.tipo_egreso;
DROP POLICY IF EXISTS "gestionar_tipo_egreso"           ON public.tipo_egreso;
DROP POLICY IF EXISTS "ver_tipo_activo"                 ON public.tipo_activo;
DROP POLICY IF EXISTS "gestionar_tipo_activo"           ON public.tipo_activo;
DROP POLICY IF EXISTS "ver_jurado"                      ON public.jurado;
DROP POLICY IF EXISTS "gestionar_jurado"                ON public.jurado;

-- Políticas antiguas de lectura pública
DROP POLICY IF EXISTS "Lectura publica de miembros"       ON public.miembro;
DROP POLICY IF EXISTS "Lectura publica de tipo_actividad" ON public.tipo_actividad;
DROP POLICY IF EXISTS "Lectura publica de actividad"      ON public.actividad;
DROP POLICY IF EXISTS "Lectura publica de archivo"        ON public.archivo;
DROP POLICY IF EXISTS "Lectura publica de jurado"         ON public.jurado;
DROP POLICY IF EXISTS "Lectura publica de ingresos"       ON public.ingreso;

-- ─────────────────────────────────────────────────────────────────────
-- POLÍTICAS RLS — DIFERENCIADAS POR ROL
-- ─────────────────────────────────────────────────────────────────────

-- ── miembro ───────────────────────────────────────────────────────────
-- El socio solo ve su propia fila; admin/secretario ven todos
CREATE POLICY "ver_propio" ON public.miembro
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR
    public.current_user_rol() IN ('admin', 'secretario')
  );

-- El trigger handle_new_user necesita insertar sin sesión (SECURITY DEFINER)
-- Para el formulario de creación manual, el admin llama al backend que usa service_role
-- Los socios no deben poder crear miembros directamente
CREATE POLICY "insertar_trigger" ON public.miembro
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_rol() = 'admin');

-- El socio actualiza SU fila PERO NO puede cambiar su rol ni su estado
-- El admin puede actualizar cualquier fila
CREATE POLICY "actualizar_propio" ON public.miembro
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND public.current_user_rol() = 'socio')
  WITH CHECK (
    id = auth.uid() AND
    public.current_user_rol() = 'socio' AND
    rol = 'socio' AND
    estado = (SELECT estado FROM public.miembro WHERE id = auth.uid())
  );

CREATE POLICY "actualizar_admin" ON public.miembro
  FOR UPDATE TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'))
  WITH CHECK (public.current_user_rol() IN ('admin', 'secretario'));

-- Solo admin puede eliminar miembros (en la práctica está deshabilitado en UI)
CREATE POLICY "eliminar_miembro" ON public.miembro
  FOR DELETE TO authenticated
  USING (public.current_user_rol() = 'admin');

-- ── notificacion ──────────────────────────────────────────────────────
-- Cada miembro solo ve sus propias notificaciones; admin ve todas
CREATE POLICY "ver_propia_notificacion" ON public.notificacion
  FOR SELECT TO authenticated
  USING (
    miembro_id = auth.uid() OR
    public.current_user_rol() = 'admin'
  );

CREATE POLICY "insertar_notificacion" ON public.notificacion
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_rol() IN ('admin', 'secretario'));

-- El miembro puede marcar sus notificaciones como leídas
CREATE POLICY "marcar_leida" ON public.notificacion
  FOR UPDATE TO authenticated
  USING (
    miembro_id = auth.uid() OR
    public.current_user_rol() IN ('admin', 'secretario')
  );

CREATE POLICY "eliminar_notificacion" ON public.notificacion
  FOR DELETE TO authenticated
  USING (public.current_user_rol() = 'admin');

-- ── ingreso ───────────────────────────────────────────────────────────
-- SEC-5: SIN lectura pública — datos financieros privados
-- El socio solo ve sus propios ingresos; admin/secretario ven todos
CREATE POLICY "ver_ingreso_propio" ON public.ingreso
  FOR SELECT TO authenticated
  USING (
    miembro_id = auth.uid() OR
    public.current_user_rol() IN ('admin', 'secretario')
  );

CREATE POLICY "insertar_ingreso" ON public.ingreso
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_rol() IN ('admin', 'secretario') OR
    (public.current_user_rol() = 'socio' AND miembro_id = auth.uid() AND estado = 'pendiente')
  );

CREATE POLICY "actualizar_ingreso" ON public.ingreso
  FOR UPDATE TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'));

CREATE POLICY "eliminar_ingreso" ON public.ingreso
  FOR DELETE TO authenticated
  USING (public.current_user_rol() = 'admin');

-- ── egreso ────────────────────────────────────────────────────────────
-- Solo admin/secretario: los socios no tienen acceso a los egresos institucionales
CREATE POLICY "ver_egresos" ON public.egreso
  FOR SELECT TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'));

CREATE POLICY "insertar_egreso" ON public.egreso
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_rol() IN ('admin', 'secretario'));

CREATE POLICY "actualizar_egreso" ON public.egreso
  FOR UPDATE TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'));

CREATE POLICY "eliminar_egreso" ON public.egreso
  FOR DELETE TO authenticated
  USING (public.current_user_rol() = 'admin');

-- ── cuota_membresia ───────────────────────────────────────────────────
CREATE POLICY "ver_cuota_propia" ON public.cuota_membresia
  FOR SELECT TO authenticated
  USING (
    miembro_id = auth.uid() OR
    public.current_user_rol() IN ('admin', 'secretario')
  );

CREATE POLICY "gestionar_cuotas" ON public.cuota_membresia
  FOR ALL TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'))
  WITH CHECK (public.current_user_rol() IN ('admin', 'secretario'));

-- ── inscripcion ───────────────────────────────────────────────────────
CREATE POLICY "ver_inscripcion_propia" ON public.inscripcion
  FOR SELECT TO authenticated
  USING (
    miembro_id = auth.uid() OR
    public.current_user_rol() IN ('admin', 'secretario')
  );

-- Los socios pueden inscribirse a sí mismos en actividades
CREATE POLICY "inscribirse" ON public.inscripcion
  FOR INSERT TO authenticated
  WITH CHECK (
    miembro_id = auth.uid() OR
    public.current_user_rol() IN ('admin', 'secretario')
  );

CREATE POLICY "gestionar_inscripciones" ON public.inscripcion
  FOR ALL TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'))
  WITH CHECK (public.current_user_rol() IN ('admin', 'secretario'));

-- ── activos ───────────────────────────────────────────────────────────
-- Solo admin/secretario gestionan patrimonio institucional
CREATE POLICY "ver_activo" ON public.activos
  FOR SELECT TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'));

CREATE POLICY "gestionar_activos" ON public.activos
  FOR ALL TO authenticated
  USING (public.current_user_rol() = 'admin')
  WITH CHECK (public.current_user_rol() = 'admin');

-- ── plan_amortizacion ─────────────────────────────────────────────────
CREATE POLICY "ver_plan_amortizacion" ON public.plan_amortizacion
  FOR SELECT TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'));

CREATE POLICY "gestionar_plan_amortizacion" ON public.plan_amortizacion
  FOR ALL TO authenticated
  USING (public.current_user_rol() = 'admin')
  WITH CHECK (public.current_user_rol() = 'admin');

-- ── configuracion_cuotas ─────────────────────────────────────────────
-- SEC-8: Solo admin puede modificar la configuración de cuotas
CREATE POLICY "ver_config_cuotas" ON public.configuracion_cuotas
  FOR SELECT TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'));

CREATE POLICY "gestionar_config_cuotas" ON public.configuracion_cuotas
  FOR ALL TO authenticated
  USING (public.current_user_rol() = 'admin')
  WITH CHECK (public.current_user_rol() = 'admin');

-- ── archivo ───────────────────────────────────────────────────────────
-- SEC-6: SIN lectura pública (comprobantes son datos privados)
-- El socio ve archivos vinculados a él o a actividades públicas
CREATE POLICY "ver_archivo" ON public.archivo
  FOR SELECT TO authenticated
  USING (
    miembro_id = auth.uid() OR
    ingreso_id IN (SELECT id FROM public.ingreso WHERE miembro_id = auth.uid()) OR
    public.current_user_rol() IN ('admin', 'secretario') OR
    actividad_id IS NOT NULL OR  -- archivos de actividades son semi-públicos
    qr_id IS NOT NULL            -- archivos de QR son públicos para usuarios autenticados
  );

-- Lectura pública solo para archivos de actividades (no comprobantes financieros)
CREATE POLICY "lectura_publica_actividad_archivo" ON public.archivo
  FOR SELECT TO anon
  USING (actividad_id IS NOT NULL AND miembro_id IS NULL AND egreso_id IS NULL AND ingreso_id IS NULL AND qr_id IS NULL);

CREATE POLICY "insertar_archivo" ON public.archivo
  FOR INSERT TO authenticated
  WITH CHECK (
    miembro_id = auth.uid() OR
    public.current_user_rol() IN ('admin', 'secretario') OR
    (public.current_user_rol() = 'socio' AND ingreso_id IS NOT NULL AND (
      SELECT i.miembro_id FROM public.ingreso i WHERE i.id = ingreso_id
    ) = auth.uid())
  );

CREATE POLICY "eliminar_archivo" ON public.archivo
  FOR DELETE TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'));

-- ── qr_pago ──────────────────────────────────────────────────────────
CREATE POLICY "ver_qr_pago" ON public.qr_pago
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "gestionar_qr_pago" ON public.qr_pago
  FOR ALL TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'))
  WITH CHECK (public.current_user_rol() IN ('admin', 'secretario'));

-- ── detalles (de egreso) ──────────────────────────────────────────────
CREATE POLICY "ver_detalles" ON public.detalles
  FOR SELECT TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'));

CREATE POLICY "gestionar_detalles" ON public.detalles
  FOR ALL TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'))
  WITH CHECK (public.current_user_rol() IN ('admin', 'secretario'));

-- ── tipos (catálogos de solo lectura para socios) ─────────────────────
CREATE POLICY "ver_catalogo" ON public.tipo_actividad
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestionar_tipo_actividad" ON public.tipo_actividad
  FOR ALL TO authenticated
  USING (public.current_user_rol() = 'admin')
  WITH CHECK (public.current_user_rol() = 'admin');

CREATE POLICY "ver_tipo_ingreso" ON public.tipo_ingreso
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestionar_tipo_ingreso" ON public.tipo_ingreso
  FOR ALL TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'))
  WITH CHECK (public.current_user_rol() IN ('admin', 'secretario'));

CREATE POLICY "ver_tipo_egreso" ON public.tipo_egreso
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestionar_tipo_egreso" ON public.tipo_egreso
  FOR ALL TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'))
  WITH CHECK (public.current_user_rol() IN ('admin', 'secretario'));

CREATE POLICY "ver_tipo_activo" ON public.tipo_activo
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestionar_tipo_activo" ON public.tipo_activo
  FOR ALL TO authenticated
  USING (public.current_user_rol() = 'admin')
  WITH CHECK (public.current_user_rol() = 'admin');

-- ── actividad (pública para todos, gestionada por admin/secretario) ───
CREATE POLICY "ver_actividad" ON public.actividad
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ver_actividad_publica" ON public.actividad
  FOR SELECT TO anon USING (publicado = true);
CREATE POLICY "gestionar_actividad" ON public.actividad
  FOR ALL TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'))
  WITH CHECK (public.current_user_rol() IN ('admin', 'secretario'));

-- ── jurado ────────────────────────────────────────────────────────────
CREATE POLICY "ver_jurado" ON public.jurado
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestionar_jurado" ON public.jurado
  FOR ALL TO authenticated
  USING (public.current_user_rol() IN ('admin', 'secretario'))
  WITH CHECK (public.current_user_rol() IN ('admin', 'secretario'));


-- =====================================================================
-- 6. REALTIME
-- =====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'miembro'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.miembro;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notificacion'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacion;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'plan_amortizacion'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_amortizacion;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cuota_membresia'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cuota_membresia;
    END IF;
END $$;

-- Recargar caché del schema en PostgREST
NOTIFY pgrst, 'reload schema';
-- ── Desplazamiento automático de fechas de próxima cuota al reanudar facturación ──
CREATE OR REPLACE FUNCTION public.gestionar_unpause_global()
RETURNS trigger AS $$
DECLARE
    v_duracion interval;
BEGIN
    IF OLD.pausado = true AND NEW.pausado = false THEN
        IF OLD.fecha_pausa IS NOT NULL THEN
            v_duracion := now() - OLD.fecha_pausa;
            UPDATE public.miembro 
            SET fecha_proxima_cuota = fecha_proxima_cuota + v_duracion
            WHERE fecha_proxima_cuota IS NOT NULL AND estado = 'activo';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gestionar_unpause_global ON public.configuracion_cuotas;
CREATE TRIGGER trg_gestionar_unpause_global
    BEFORE UPDATE OF pausado ON public.configuracion_cuotas
    FOR EACH ROW
    EXECUTE FUNCTION public.gestionar_unpause_global();


-- =====================================================================
-- 7. FUNCIONES DE ADMINISTRACIÓN RPC (SIN BACKEND EXTERNO)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.crear_usuario_admin(
    p_email text,
    p_password text,
    p_nombre text,
    p_rol text,
    p_telefono text,
    p_apellido_paterno text,
    p_apellido_materno text,
    p_monto_inscripcion numeric,
    p_ci text
)
RETURNS json AS $$
DECLARE
    v_user_id uuid;
    v_encrypted_pw text;
BEGIN
    IF public.current_user_rol() != 'admin' THEN
        RAISE EXCEPTION 'Acceso denegado: solo los administradores pueden crear usuarios.';
    END IF;

    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'El correo electrónico ya está registrado.';
    END IF;

    v_user_id := gen_random_uuid();
    v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf', 10));
    
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        role,
        aud,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        v_encrypted_pw,
        now(),
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        jsonb_build_object(
            'rol', p_rol, 
            'full_name', trim(concat(p_nombre, ' ', p_apellido_paterno, ' ', p_apellido_materno)),
            'monto_inscripcion', p_monto_inscripcion,
            'ci', p_ci
        ),
        now(),
        now(),
        'authenticated',
        'authenticated',
        '',
        '',
        '',
        ''
    );

    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', p_email),
        'email',
        v_user_id::text,
        now(),
        now(),
        now()
    );

    UPDATE public.miembro
    SET 
        telefono = p_telefono,
        "apellidoPaterno" = p_apellido_paterno,
        "apellidoMaterno" = p_apellido_materno,
        monto_inscripcion = p_monto_inscripcion,
        ci = p_ci
    WHERE id = v_user_id;

    RETURN json_build_object('id', v_user_id, 'email', p_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.actualizar_auth_admin(
    p_user_id uuid,
    p_email text,
    p_rol text,
    p_nombre text
)
RETURNS json AS $$
BEGIN
    IF public.current_user_rol() != 'admin' THEN
        RAISE EXCEPTION 'Acceso denegado: solo administradores pueden actualizar datos de Auth.';
    END IF;

    UPDATE auth.users
    SET 
        email = COALESCE(p_email, email),
        raw_user_meta_data = raw_user_meta_data 
            || CASE WHEN p_rol IS NOT NULL THEN jsonb_build_object('rol', p_rol) ELSE '{}'::jsonb END
            || CASE WHEN p_nombre IS NOT NULL THEN jsonb_build_object('full_name', p_nombre) ELSE '{}'::jsonb END,
        updated_at = now()
    WHERE id = p_user_id;

    IF p_email IS NOT NULL THEN
        UPDATE auth.identities
        SET 
            identity_data = identity_data || jsonb_build_object('email', p_email),
            updated_at = now()
        WHERE user_id = p_user_id AND provider = 'email';
    END IF;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.actualizar_password_admin(
    p_user_id uuid,
    p_new_password text
)
RETURNS json AS $$
DECLARE
    v_encrypted_pw text;
BEGIN
    IF public.current_user_rol() != 'admin' AND auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Acceso denegado: no tienes permisos para cambiar esta contraseña.';
    END IF;

    v_encrypted_pw := extensions.crypt(p_new_password, extensions.gen_salt('bf', 10));

    UPDATE auth.users
    SET 
        encrypted_password = v_encrypted_pw,
        updated_at = now()
    WHERE id = p_user_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── Migración para agregar tipo_ingreso_id a qr_pago ──
ALTER TABLE public.qr_pago 
  ADD COLUMN IF NOT EXISTS tipo_ingreso_id uuid REFERENCES public.tipo_ingreso(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qr_pago_tipo_ingreso ON public.qr_pago(tipo_ingreso_id);

