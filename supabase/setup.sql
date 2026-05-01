-- ==========================================
-- 1. LIMPIEZA INICIAL
-- ==========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP SEQUENCE IF EXISTS miembro_codigo_seq CASCADE;

-- ==========================================
-- 2. REPARACIÓN DE ESQUEMA Y PERMISOS
-- ==========================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role, authenticator;

-- ==========================================
-- 3. SECUENCIAS
-- ==========================================
CREATE SEQUENCE IF NOT EXISTS miembro_codigo_seq START 1;

-- ==========================================
-- 4. CREACIÓN DE TABLAS (RELACIONALES)
-- ==========================================

-- Tabla Base: Miembros
CREATE TABLE IF NOT EXISTS public.miembros (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo text UNIQUE,
  nombre text NOT NULL,
  email text UNIQUE,
  telefono text,
  rol text CHECK (rol IN ('admin', 'secretario', 'socio')) DEFAULT 'socio',
  estado text DEFAULT 'activo',
  created_at timestamptz DEFAULT now()
);

-- Módulo: Alertas
CREATE TABLE IF NOT EXISTS public.alertas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "usuarioId" uuid REFERENCES public.miembros(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  severidad text DEFAULT 'baja',
  fecha date DEFAULT current_date,
  leida boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Módulo: Finanzas (Cuotas)
CREATE TABLE IF NOT EXISTS public.cuotas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "miembroId" uuid REFERENCES public.miembros(id) ON DELETE CASCADE,
  monto numeric(12,2) NOT NULL,
  moneda text DEFAULT 'BS',
  fecha date NOT NULL,
  estado text DEFAULT 'pendiente',
  created_at timestamptz DEFAULT now()
);

-- Módulo: Finanzas (Egresos)
CREATE TABLE IF NOT EXISTS public.egresos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  concepto text NOT NULL,
  monto numeric(12,2) NOT NULL,
  fecha date NOT NULL,
  categoria text,
  "registradoPor" uuid REFERENCES public.miembros(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Módulo: Finanzas (Ingresos Extras)
CREATE TABLE IF NOT EXISTS public.ingresos_extras (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  concepto text NOT NULL,
  monto numeric(12,2) NOT NULL,
  fecha date NOT NULL,
  metodo text,
  "registradoPor" uuid REFERENCES public.miembros(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Módulo: Finanzas (Reportes)
CREATE TABLE IF NOT EXISTS public.reportes_financieros (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo text NOT NULL,
  "totalIngresos" numeric(12,2) DEFAULT 0,
  "totalEgresos" numeric(12,2) DEFAULT 0,
  saldo numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Módulo: Académico (Eventos)
CREATE TABLE IF NOT EXISTS public.eventos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  fecha date NOT NULL,
  asistentes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Módulo: Académico (Actividades)
CREATE TABLE IF NOT EXISTS public.actividades_academicas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "eventoId" uuid REFERENCES public.eventos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  tipo text,
  fecha date NOT NULL,
  responsable uuid REFERENCES public.miembros(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Módulo: Académico (Asignaciones de Jurado)
CREATE TABLE IF NOT EXISTS public.asignaciones_jurado (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "eventoId" uuid REFERENCES public.eventos(id) ON DELETE CASCADE,
  "juradoId" uuid REFERENCES public.miembros(id) ON DELETE CASCADE,
  rol text,
  estado text DEFAULT 'pendiente',
  fecha date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- Módulo: Académico (Talentos)
CREATE TABLE IF NOT EXISTS public.talentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  especialidad text,
  experiencia numeric DEFAULT 0,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Módulo: Patrimonio (Activos)
CREATE TABLE IF NOT EXISTS public.activos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  categoria text,
  "valorActual" numeric(12,2) DEFAULT 0,
  "fechaAdquisicion" date,
  created_at timestamptz DEFAULT now()
);

-- Módulo: Patrimonio (Adquisiciones)
CREATE TABLE IF NOT EXISTS public.adquisiciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "activoId" uuid REFERENCES public.activos(id) ON DELETE CASCADE,
  proveedor text,
  fecha date NOT NULL,
  costo numeric(12,2) NOT NULL,
  estado text DEFAULT 'registrado',
  created_at timestamptz DEFAULT now()
);

-- Módulo: Patrimonio (Auditorías)
CREATE TABLE IF NOT EXISTS public.auditorias_blockchain (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "activoId" uuid REFERENCES public.activos(id) ON DELETE CASCADE,
  hash text NOT NULL,
  fecha date DEFAULT current_date,
  estado text DEFAULT 'verificado',
  created_at timestamptz DEFAULT now()
);

-- Módulo: Patrimonio (Amortización)
CREATE TABLE IF NOT EXISTS public.plan_amortizacion (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "activoId" uuid REFERENCES public.activos(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  monto numeric(12,2) NOT NULL,
  saldo numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 5. FUNCIÓN TRIGGER PARA USUARIOS NUEVOS
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.miembros (id, nombre, email, rol, codigo)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email), 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'rol', 'socio'),
    'M-' || LPAD(nextval('public.miembro_codigo_seq')::text, 4, '0')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 6. RLS (SEGURIDAD DE FILAS)
-- ==========================================
-- Habilitamos RLS en todas las tablas
ALTER TABLE public.miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingresos_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes_financieros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades_academicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_jurado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adquisiciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditorias_blockchain ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_amortizacion ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso: Permitir a todos los usuarios autenticados leer y escribir (Ajustable a futuro)
DROP POLICY IF EXISTS "Acceso total autenticados" ON public.miembros;
CREATE POLICY "Acceso total autenticados" ON public.miembros FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total anonimo" ON public.miembros;
CREATE POLICY "Acceso total anonimo" ON public.miembros FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total" ON public.alertas;
CREATE POLICY "Acceso total" ON public.alertas FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total" ON public.cuotas;
CREATE POLICY "Acceso total" ON public.cuotas FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total" ON public.egresos;
CREATE POLICY "Acceso total" ON public.egresos FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total" ON public.ingresos_extras;
CREATE POLICY "Acceso total" ON public.ingresos_extras FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total" ON public.reportes_financieros;
CREATE POLICY "Acceso total" ON public.reportes_financieros FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total" ON public.eventos;
CREATE POLICY "Acceso total" ON public.eventos FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total" ON public.actividades_academicas;
CREATE POLICY "Acceso total" ON public.actividades_academicas FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total" ON public.asignaciones_jurado;
CREATE POLICY "Acceso total" ON public.asignaciones_jurado FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total" ON public.talentos;
CREATE POLICY "Acceso total" ON public.talentos FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total" ON public.activos;
CREATE POLICY "Acceso total" ON public.activos FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total" ON public.adquisiciones;
CREATE POLICY "Acceso total" ON public.adquisiciones FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total" ON public.auditorias_blockchain;
CREATE POLICY "Acceso total" ON public.auditorias_blockchain FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total" ON public.plan_amortizacion;
CREATE POLICY "Acceso total" ON public.plan_amortizacion FOR ALL TO public USING (true) WITH CHECK (true);

-- ==========================================
-- 7. SEMILLA DE DATOS (MÓDULOS RELACIONALES)
-- ==========================================
-- Inyectamos datos de prueba en los módulos (sin tocar auth.users)
DO $$
DECLARE
  v_admin_id uuid;
  v_socio_id uuid;
  v_evento_id uuid;
  v_activo_id uuid;
BEGIN
  -- Intentar obtener un admin y un socio para asignarles registros
  SELECT id INTO v_admin_id FROM public.miembros WHERE rol = 'admin' LIMIT 1;
  SELECT id INTO v_socio_id FROM public.miembros WHERE rol = 'socio' LIMIT 1;

  -- Módulo: Finanzas
  INSERT INTO public.egresos (concepto, monto, fecha, categoria, "registradoPor")
  VALUES 
    ('Alquiler de local', 1500, '2026-04-01', 'Operativo', v_admin_id),
    ('Material de oficina', 300, '2026-04-15', 'Administrativo', v_admin_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.ingresos_extras (concepto, monto, fecha, metodo, "registradoPor")
  VALUES 
    ('Donación anónima', 5000, '2026-04-10', 'Transferencia', v_admin_id)
  ON CONFLICT DO NOTHING;

  -- Si hay un socio, le creamos una cuota de prueba
  IF v_socio_id IS NOT NULL THEN
    INSERT INTO public.cuotas ("miembroId", monto, fecha, estado)
    VALUES (v_socio_id, 100.00, '2026-04-01', 'pagada')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Módulo: Académico
  INSERT INTO public.eventos (id, nombre, fecha, asistentes)
  VALUES (gen_random_uuid(), 'Conferencia Anual de Tecnología 2026', '2026-08-15', 120)
  RETURNING id INTO v_evento_id;

  INSERT INTO public.actividades_academicas ("eventoId", nombre, tipo, fecha, responsable)
  VALUES (v_evento_id, 'Taller de Blockchain', 'Taller', '2026-08-15', v_admin_id);

  -- Módulo: Patrimonio
  INSERT INTO public.activos (id, nombre, categoria, "valorActual", "fechaAdquisicion")
  VALUES (gen_random_uuid(), 'Laptop Dell XPS 15', 'Equipo de Computación', 1200, '2025-10-01')
  RETURNING id INTO v_activo_id;

  INSERT INTO public.activos (id, nombre, categoria, "valorActual", "fechaAdquisicion")
  VALUES (gen_random_uuid(), 'Proyector Epson', 'Audiovisual', 450, '2026-01-15');

  -- Adquisición del activo
  INSERT INTO public.adquisiciones ("activoId", proveedor, fecha, costo, estado)
  VALUES (v_activo_id, 'TechStore SRL', '2025-10-01', 1200, 'registrado');

END $$;

