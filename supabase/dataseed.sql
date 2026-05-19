-- ==========================================
-- SCRIPT DE POBLACIÓN DE DATOS (DATA SEEDING)
-- SQL ESTÁTICO DE PRODUCCIÓN (Con más de 300 registros para pruebas masivas de rendimiento y paginación)
-- ==========================================

-- 1. MIEMBROS (Administradores, Secretarios y Socios Activos/Inactivos con profesiones reales)
INSERT INTO public.miembro (id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", contrasena, telefono, profesion, rol, estado, creacion) VALUES
('24c1c5db-ebea-49b3-83d6-7b35267640eb', 'Jorge', 'Morales', 'Castillo', 'admin@control.com', '$2a$10$abcdefghijklmnopqrstuv', '78437671', 'Médico Cirujano', 'admin', 'activo', CURRENT_DATE - interval '18 months'),
('b512f045-76c7-402f-88d5-c9be930fd8a5', 'Carlos', 'Ríos', 'Pérez', 'secretario@control.com', '$2a$10$abcdefghijklmnopqrstuv', '75011831', 'Diseñador Gráfico', 'secretario', 'activo', CURRENT_DATE - interval '16 months'),
('c244f37b-567b-49e6-b224-ae37a75298f2', 'Paula', 'Pérez', 'Pérez', 'paula.perez@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '77980722', 'Ingeniera de Sistemas', 'socio', 'activo', CURRENT_DATE - interval '14 months'),
('d9dd246a-e56e-42a8-8b8b-5b98aafd1303', 'Luis', 'López', 'Vargas', 'luis.lopez@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '75716447', 'Arquitecto', 'socio', 'activo', CURRENT_DATE - interval '12 months'),
('840c927d-7573-451a-9e59-22a3647f8359', 'Sofía', 'Torres', 'Gómez', 'sofia.torres@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '74295931', 'Diseñadora de Modas', 'socio', 'activo', CURRENT_DATE - interval '11 months'),
('15589848-8ffd-4b8d-997d-b03634e02216', 'Miguel', 'Torres', 'Gómez', 'miguel.torres@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '73252383', 'Desarrollador Web', 'socio', 'activo', CURRENT_DATE - interval '10 months'),
('04c47319-1ca6-4b3e-ae97-9c46cf3189f3', 'Roberto', 'Suárez', 'Martínez', 'roberto.suarez@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '76709223', 'Administrador de Empresas', 'socio', 'activo', CURRENT_DATE - interval '9 months'),
('85a6da30-e6a3-4066-91fa-1c63d4dd31b5', 'Andrés', 'Cruz', 'Fernández', 'andres.cruz@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '71959754', 'Administrador Financiero', 'socio', 'activo', CURRENT_DATE - interval '9 months'),
('ed0fb4c3-6435-4d55-9654-85d5b1bdbd60', 'Esteban', 'García', 'Díaz', 'esteban.garcia@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '78491197', 'Contador Público', 'socio', 'activo', CURRENT_DATE - interval '8 months'),
('d965a71e-b7f4-428a-bff2-2c025c0201b2', 'Pedro', 'Cruz', 'García', 'pedro.cruz@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '78107909', 'Ingeniero Civil', 'socio', 'activo', CURRENT_DATE - interval '8 months'),
('dd42db92-1040-4591-8412-592b6c27fb1d', 'Alejandra', 'Pérez', 'Torres', 'alejandra.perez@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '71762776', 'Abogada Corporativa', 'socio', 'activo', CURRENT_DATE - interval '7 months'),
('53dbd038-125d-484b-bd0c-1b51980918fd', 'Lucía', 'Morales', 'Torres', 'lucia.morales@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '75931894', 'Abogada Penalista', 'socio', 'activo', CURRENT_DATE - interval '6 months'),
('3c503b27-de88-4f81-a759-192e801859da', 'María', 'Castillo', 'Romero', 'maria.castillo@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '71113600', 'Administradora Pública', 'socio', 'activo', CURRENT_DATE - interval '6 months'),
('c9d9df36-c6a5-4ef8-bb6d-8a1855caccb9', 'Luisa', 'Sánchez', 'Rodríguez', 'luisa.sanchez@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '73030863', 'Diseñadora Industrial', 'socio', 'activo', CURRENT_DATE - interval '5 months'),
('579e5132-a2c8-4d77-b4b8-9e5e3a7e58ab', 'Jorge', 'Cruz', 'Vargas', 'jorge.cruz@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '76066155', 'Abogado Laboral', 'socio', 'activo', CURRENT_DATE - interval '4 months'),
('7763b5ce-36ef-49a5-8452-54bdfd43aa93', 'Patricia', 'Martínez', 'Cruz', 'patricia.martinez@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '78261633', 'Diseñadora Web', 'socio', 'activo', CURRENT_DATE - interval '3 months'),
('ea4b181e-bfff-4030-809b-e8bed9765ae7', 'José', 'López', 'Ríos', 'jose.lopez@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '78091702', 'Desarrollador Fullstack', 'socio', 'activo', CURRENT_DATE - interval '2 months'),
-- Nuevos miembros para pruebas masivas y paginación
('e0000001-eeee-4444-8888-999999999901', 'Mauricio', 'Paz', 'Ortiz', 'mauricio.paz@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '76290011', 'Ingeniero Mecánico', 'socio', 'activo', CURRENT_DATE - interval '5 months'),
('e0000002-eeee-4444-8888-999999999902', 'Daniela', 'Rojas', 'Soliz', 'daniela.rojas@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '72098711', 'Bioquímica', 'socio', 'activo', CURRENT_DATE - interval '5 months'),
('e0000003-eeee-4444-8888-999999999903', 'Fernando', 'Vargas', 'Mendoza', 'fernando.vargas@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '73012345', 'Economista', 'socio', 'activo', CURRENT_DATE - interval '4 months'),
('e0000004-eeee-4444-8888-999999999904', 'Camila', 'Flores', 'Duarte', 'camila.flores@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '74561234', 'Auditora Financiera', 'socio', 'activo', CURRENT_DATE - interval '4 months'),
('e0000005-eeee-4444-8888-999999999905', 'Ricardo', 'Alba', 'Guzmán', 'ricardo.alba@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '75982121', 'Ingeniero Industrial', 'socio', 'activo', CURRENT_DATE - interval '4 months'),
('e0000006-eeee-4444-8888-999999999906', 'Natalia', 'Camacho', 'Villarroel', 'natalia.camacho@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '71239845', 'Comunicadora Social', 'socio', 'activo', CURRENT_DATE - interval '3 months'),
('e0000007-eeee-4444-8888-999999999907', 'Gabriel', 'Mendez', 'Chávez', 'gabriel.mendez@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '78963214', 'Profesor de Matemáticas', 'socio', 'activo', CURRENT_DATE - interval '3 months'),
('e0000008-eeee-4444-8888-999999999908', 'Valeria', 'Salazar', 'Prado', 'valeria.salazar@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '70215487', 'Psicóloga Clínica', 'socio', 'activo', CURRENT_DATE - interval '3 months'),
('e0000009-eeee-4444-8888-999999999909', 'Hugo', 'Pinto', 'Miranda', 'hugo.pinto@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '77412589', 'Consultor TI', 'socio', 'activo', CURRENT_DATE - interval '2 months'),
('e0000010-eeee-4444-8888-999999999910', 'Elena', 'Guerrero', 'Siles', 'elena.guerrero@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '70548962', 'Odontóloga', 'socio', 'activo', CURRENT_DATE - interval '2 months'),
('e0000011-eeee-4444-8888-999999999911', 'René', 'Zeballos', 'Suárez', 'rene.zeballos@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '73021456', 'Arquitecto de Interiores', 'socio', 'activo', CURRENT_DATE - interval '2 months'),
('e0000012-eeee-4444-8888-999999999912', 'Gisela', 'Heredia', 'Rivas', 'gisela.heredia@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '76985214', 'Periodista', 'socio', 'activo', CURRENT_DATE - interval '1 month'),
('e0000013-eeee-4444-8888-999999999913', 'Claudio', 'Nallar', 'Montaño', 'claudio.nallar@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '78512369', 'Ingeniero de Telecomunicaciones', 'socio', 'activo', CURRENT_DATE - interval '1 month'),
('e0000014-eeee-4444-8888-999999999914', 'Beatriz', 'Maldonado', 'Luna', 'beatriz.maldonado@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '74125896', 'Nutricionista', 'socio', 'activo', CURRENT_DATE - interval '1 month'),
('e0000015-eeee-4444-8888-999999999915', 'Fabián', 'Guzmán', 'Flores', 'fabian.guzman@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '75315984', 'Fotógrafo Profesional', 'socio', 'inactivo', CURRENT_DATE - interval '10 months')
ON CONFLICT (id) DO NOTHING;

-- 2. CONFIGURACIÓN GENERAL DEL SISTEMA (Límites, Días de recordatorio y Estados globales)
INSERT INTO public.configuracion_cuotas (id, pausado, dias_pausados, dias_recordatorio_activos, frecuencia) VALUES
('b30b9c3f-c6a5-4ef8-bb6d-8a1855caccb9', false, 0, 5, 'mes')
ON CONFLICT (id) DO NOTHING;

-- 3. NOTIFICACIONES INSTITUCIONALES (Alertas de cobros, asambleas y avisos)
INSERT INTO public.notificacion (id, miembro_id, titulo, descripcion, estado) VALUES
('a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', '579e5132-a2c8-4d77-b4b8-9e5e3a7e58ab', 'Pago Próximo de Cuota Mensual', 'Recuerde que el pago de su membresía vence en 5 días.', 'pendiente'),
('b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e', 'ed0fb4c3-6435-4d55-9654-85d5b1bdbd60', 'Asamblea Extraordinaria Convocada', 'Se convoca a reunión nacional este sábado a las 10:00 AM.', 'pendiente'),
('c3d4e5f6-7a8b-9c0d-e1f2-a3b4c5d6e7f8', '3c503b27-de88-4f81-a759-192e801859da', 'Multa Registrada', 'Se ha registrado una multa por inasistencia al último evento institucional.', 'pendiente'),
('d4e5f67a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', '15589848-8ffd-4b8d-997d-b03634e02216', 'Egreso Validado en Blockchain', 'El egreso del servidor Dell ha sido sellado exitosamente.', 'leida'),
('e5f67a8b-9c0d-e1f2-a3b4-c5d6e7f8a9b0', '85a6da30-e6a3-4066-91fa-1c63d4dd31b5', 'Amortización de Vehículo Toyota', 'La cuota 18 del plan de amortización se ha cobrado de forma automática.', 'pendiente'),
('f67a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c', '840c927d-7573-451a-9e59-22a3647f8359', 'Inscripción Exitosa', 'Su inscripción al Taller de Blockchain ha sido confirmada.', 'leida'),
('c0000001-aaaa-1111-2222-333333333301', 'e0000001-eeee-4444-8888-999999999901', 'Validación de Credenciales', 'Su cuenta de socio ha sido dada de alta exitosamente.', 'leida'),
('c0000002-aaaa-1111-2222-333333333302', 'e0000002-eeee-4444-8888-999999999902', 'Pago Recibido de Cuota', 'Confirmamos la recepción de Bs. 150 por su cuota mensual.', 'leida'),
('c0000003-aaaa-1111-2222-333333333303', 'e0000003-eeee-4444-8888-999999999903', 'Alerta de Atraso en Activos', 'El sistema ha detectado una cuota pendiente del Proyector Epson.', 'pendiente')
ON CONFLICT (id) DO NOTHING;

-- 4. TIPOS DE ACTIVIDAD
INSERT INTO public.tipo_actividad (id, nombre, descripcion) VALUES
('fde2a6ec-8ca6-4e8a-8e0f-72d378af41a4', 'Taller Técnico', 'Talleres prácticos y certificaciones de tecnología.'),
('da3925a9-e230-4688-8b0a-00ca4463ab16', 'Seminario Internacional', 'Seminarios de actualización académica.'),
('fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Curso Especializado', 'Cursos formales dictados por profesionales.'),
('01bdc2bc-8bd9-4496-8329-c1f5dbad4e2d', 'Asamblea General', 'Reuniones de planificación y toma de decisiones.'),
('ca85fdf7-07ce-4ca1-a81b-8c1deae9e7a9', 'Evento Deportivo', 'Actividades de confraternización y salud ocupacional.')
ON CONFLICT (id) DO NOTHING;

-- 5. ACTIVIDADES ACADÉMICAS E INSTITUCIONALES (Para pruebas de paginación e inscritos)
INSERT INTO public.actividad (id, miembro_id, tipo_actividad_id, titulo, descripcion, fecha, hora, cupos, costo, estado) VALUES
('e58b9198-0dca-4eda-8f45-bed1e5cf1ede', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Curso de Desarrollo Blockchain', 'Aprende los fundamentos de Smart Contracts e integración con Hyperledger.', CURRENT_DATE + interval '15 days', '19:00:00', 40, 350.00, 'programado'),
('6cc3bd14-b2b1-4a8c-96f3-c35b50e8bf74', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Curso de Contabilidad Básica', 'Conceptos esenciales de balance general, egresos e ingresos.', CURRENT_DATE - interval '10 days', '18:30:00', 30, 150.00, 'finalizado'),
('7508e3ad-a98d-4c15-96d4-a7d0100c5c42', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'ca85fdf7-07ce-4ca1-a81b-8c1deae9e7a9', 'Campeonato de Futsal Institucional', 'Evento deportivo anual para socios y directivos.', CURRENT_DATE - interval '5 days', '09:00:00', 100, 50.00, 'finalizado'),
('39f214c4-0746-4b4f-9575-9f47ae8771ce', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fde2a6ec-8ca6-4e8a-8e0f-72d378af41a4', 'Taller de Criptografía Aplicada', 'Estudio profundo de SHA-256, firmas digitales y seguridad de datos.', CURRENT_DATE + interval '20 days', '15:00:00', 25, 200.00, 'programado'),
-- Más actividades para tener muchísimos datos
('d0000001-dddd-1111-2222-333333333301', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Actividad 1', 'Introducción al Control Financiero para directivos y secretarios.', CURRENT_DATE + interval '27 days', '19:00:00', 35, 100.00, 'programado'),
('d0000002-dddd-1111-2222-333333333302', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Actividad 2', 'Taller de Oratoria y Liderazgo Institucional.', CURRENT_DATE - interval '17 days', '19:00:00', 50, 80.00, 'finalizado'),
('d0000003-dddd-1111-2222-333333333303', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'da3925a9-e230-4688-8b0a-00ca4463ab16', 'Actividad 3', 'Congreso Nacional de Administración y Finanzas públicas.', CURRENT_DATE - interval '9 days', '08:30:00', 120, 250.00, 'finalizado'),
('d0000004-dddd-1111-2222-333333333304', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Actividad 4', 'Curso Avanzado de Excel Financiero.', CURRENT_DATE + interval '18 days', '18:00:00', 40, 180.00, 'programado'),
('d0000005-dddd-1111-2222-333333333305', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Actividad 5', 'Planificación Estratégica y Gestión de Activos.', CURRENT_DATE - interval '14 days', '19:00:00', 30, 120.00, 'finalizado'),
('d0000006-dddd-1111-2222-333333333306', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Actividad 6', 'Curso de Introducción al Machine Learning.', CURRENT_DATE + interval '26 days', '19:30:00', 25, 400.00, 'programado'),
('d0000007-dddd-1111-2222-333333333307', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '01bdc2bc-8bd9-4496-8329-c1f5dbad4e2d', 'Actividad 7', 'Asamblea General Extraordinaria de Socios.', CURRENT_DATE - interval '31 days', '10:00:00', 200, 0.00, 'finalizado'),
('d0000008-dddd-1111-2222-333333333308', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Actividad 8', 'Desarrollo Frontend Profesional con React.', CURRENT_DATE + interval '18 days', '19:00:00', 45, 300.00, 'programado'),
('d0000009-dddd-1111-2222-333333333309', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fde2a6ec-8ca6-4e8a-8e0f-72d378af41a4', 'Actividad 9', 'Taller de Kubernetes y Docker para Desarrolladores.', CURRENT_DATE - interval '3 days', '14:00:00', 30, 220.00, 'en_curso'),
('d0000010-dddd-1111-2222-333333333310', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'da3925a9-e230-4688-8b0a-00ca4463ab16', 'Actividad 10', 'Seminario de Ciberseguridad y Auditoría Forense.', CURRENT_DATE + interval '27 days', '09:00:00', 80, 150.00, 'programado'),
('d0000011-dddd-1111-2222-333333333311', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Actividad 11', 'Curso de Arquitectura de Microservicios.', CURRENT_DATE + interval '7 days', '19:00:00', 35, 320.00, 'programado'),
('d0000012-dddd-1111-2222-333333333312', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fde2a6ec-8ca6-4e8a-8e0f-72d378af41a4', 'Actividad 12', 'Taller de SQL Server y Optimización de Consultas.', CURRENT_DATE - interval '3 days', '19:00:00', 40, 120.00, 'en_curso'),
('d0000013-dddd-1111-2222-333333333313', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'ca85fdf7-07ce-4ca1-a81b-8c1deae9e7a9', 'Actividad 13', 'Maratón de Confraternización 5K.', CURRENT_DATE - interval '21 days', '07:30:00', 150, 20.00, 'finalizado'),
('d0000014-dddd-1111-2222-333333333314', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'da3925a9-e230-4688-8b0a-00ca4463ab16', 'Actividad 14', 'Seminario de Metodologías Ágiles (Scrum/Kanban).', CURRENT_DATE + interval '23 days', '10:00:00', 60, 100.00, 'programado'),
('d0000015-dddd-1111-2222-333333333315', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fde2a6ec-8ca6-4e8a-8e0f-72d378af41a4', 'Actividad 15', 'Taller Práctico de Cloud Computing (AWS/Azure).', CURRENT_DATE + interval '1 days', '18:30:00', 30, 250.00, 'programado')
ON CONFLICT (id) DO NOTHING;

-- 6. INSCRIPCIONES A ACTIVIDADES (Población masiva de inscritos para reportes completos de asistencia)
INSERT INTO public.inscripcion (id, miembro_id, actividad_id, estado) VALUES
-- Curso de Desarrollo Blockchain (e58b9198-0dca-4eda-8f45-bed1e5cf1ede)
('f01e2d3c-4b5a-6987-8765-4321fedcba01', 'c244f37b-567b-49e6-b224-ae37a75298f2', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado'),
('e1d2c3b4-a598-7654-3210-fedcba012345', 'd9dd246a-e56e-42a8-8b8b-5b98aafd1303', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado'),
('i0000001-aaaa-bbbb-cccc-dddddddddd01', '840c927d-7573-451a-9e59-22a3647f8359', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado'),
('i0000002-aaaa-bbbb-cccc-dddddddddd02', '15589848-8ffd-4b8d-997d-b03634e02216', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado'),
('i0000003-aaaa-bbbb-cccc-dddddddddd03', '04c47319-1ca6-4b3e-ae97-9c46cf3189f3', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado'),
('i0000004-aaaa-bbbb-cccc-dddddddddd04', '85a6da30-e6a3-4066-91fa-1c63d4dd31b5', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado'),
('i0000005-aaaa-bbbb-cccc-dddddddddd05', 'e0000001-eeee-4444-8888-999999999901', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado'),
('i0000006-aaaa-bbbb-cccc-dddddddddd06', 'e0000002-eeee-4444-8888-999999999902', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado'),
('i0000007-aaaa-bbbb-cccc-dddddddddd07', 'e0000003-eeee-4444-8888-999999999903', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado'),
('i0000008-aaaa-bbbb-cccc-dddddddddd08', 'e0000004-eeee-4444-8888-999999999904', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado'),
('i0000009-aaaa-bbbb-cccc-dddddddddd09', 'e0000005-eeee-4444-8888-999999999905', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado'),
('i0000010-aaaa-bbbb-cccc-dddddddddd10', 'e0000006-eeee-4444-8888-999999999906', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado'),

-- Taller de Criptografía Aplicada (39f214c4-0746-4b4f-9575-9f47ae8771ce)
('c0000010-bbbb-1111-2222-333333333310', 'c244f37b-567b-49e6-b224-ae37a75298f2', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),
('c0000011-bbbb-1111-2222-333333333311', 'd9dd246a-e56e-42a8-8b8b-5b98aafd1303', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),
('c0000012-bbbb-1111-2222-333333333312', '840c927d-7573-451a-9e59-22a3647f8359', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),
('c0000013-bbbb-1111-2222-333333333313', '15589848-8ffd-4b8d-997d-b03634e02216', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),
('c0000014-bbbb-1111-2222-333333333314', '04c47319-1ca6-4b3e-ae97-9c46cf3189f3', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),
('c0000015-bbbb-1111-2222-333333333315', 'e0000001-eeee-4444-8888-999999999901', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),
('c0000016-bbbb-1111-2222-333333333316', 'e0000002-eeee-4444-8888-999999999902', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),
('c0000017-bbbb-1111-2222-333333333317', 'e0000003-eeee-4444-8888-999999999903', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),
('c0000018-bbbb-1111-2222-333333333318', 'e0000004-eeee-4444-8888-999999999904', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),
('c0000019-bbbb-1111-2222-333333333319', 'e0000005-eeee-4444-8888-999999999905', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),
('c0000020-bbbb-1111-2222-333333333320', 'e0000006-eeee-4444-8888-999999999906', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),
('c0000021-bbbb-1111-2222-333333333321', 'e0000007-eeee-4444-8888-999999999907', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),

-- Actividad 1 (d0000001-dddd-1111-2222-333333333301)
('i0000020-aaaa-bbbb-cccc-dddddddddd20', 'c244f37b-567b-49e6-b224-ae37a75298f2', 'd0000001-dddd-1111-2222-333333333301', 'confirmado'),
('i0000021-aaaa-bbbb-cccc-dddddddddd21', 'd9dd246a-e56e-42a8-8b8b-5b98aafd1303', 'd0000001-dddd-1111-2222-333333333301', 'confirmado'),
('i0000022-aaaa-bbbb-cccc-dddddddddd22', '840c927d-7573-451a-9e59-22a3647f8359', 'd0000001-dddd-1111-2222-333333333301', 'confirmado'),
('i0000023-aaaa-bbbb-cccc-dddddddddd23', 'e0000008-eeee-4444-8888-999999999908', 'd0000001-dddd-1111-2222-333333333301', 'confirmado'),
('i0000024-aaaa-bbbb-cccc-dddddddddd24', 'e0000009-eeee-4444-8888-999999999909', 'd0000001-dddd-1111-2222-333333333301', 'confirmado'),
('i0000025-aaaa-bbbb-cccc-dddddddddd25', 'e0000010-eeee-4444-8888-999999999910', 'd0000001-dddd-1111-2222-333333333301', 'confirmado'),

-- Actividad 2 (d0000002-dddd-1111-2222-333333333302)
('i0000030-aaaa-bbbb-cccc-dddddddddd30', '15589848-8ffd-4b8d-997d-b03634e02216', 'd0000002-dddd-1111-2222-333333333302', 'confirmado'),
('i0000031-aaaa-bbbb-cccc-dddddddddd31', '04c47319-1ca6-4b3e-ae97-9c46cf3189f3', 'd0000002-dddd-1111-2222-333333333302', 'confirmado'),
('i0000032-aaaa-bbbb-cccc-dddddddddd32', '85a6da30-e6a3-4066-91fa-1c63d4dd31b5', 'd0000002-dddd-1111-2222-333333333302', 'confirmado'),
('i0000033-aaaa-bbbb-cccc-dddddddddd33', 'e0000011-eeee-4444-8888-999999999911', 'd0000002-dddd-1111-2222-333333333302', 'confirmado'),
('i0000034-aaaa-bbbb-cccc-dddddddddd34', 'e0000012-eeee-4444-8888-999999999912', 'd0000002-dddd-1111-2222-333333333302', 'confirmado'),
('i0000035-aaaa-bbbb-cccc-dddddddddd35', 'e0000013-eeee-4444-8888-999999999913', 'd0000002-dddd-1111-2222-333333333302', 'confirmado')
ON CONFLICT (id) DO NOTHING;

-- 7. TIPOS DE INGRESO
INSERT INTO public.tipo_ingreso (id, nombre, descripcion) VALUES
('fb06aeef-2529-425b-b131-ff09466a0a83', 'Cuota Mensual', 'Ingresos periódicos obligatorios por membresía de los socios.'),
('6968c28b-d79f-4cfa-86ef-b1674b93ac8e', 'Inscripción de Nuevos Socios', 'Monto pagado al registrar un nuevo miembro en la institución.'),
('1c9bfe20-53c4-4e94-be62-afacd17d457b', 'Multa Académica o Administrativa', 'Sanciones financieras por inasistencias o retrasos.'),
('d26423ba-8289-40dd-9dc8-e8d98a455ca8', 'Donaciones y Aportes', 'Donaciones voluntarias de organizaciones aliadas o miembros.')
ON CONFLICT (id) DO NOTHING;

-- 8. TIPOS DE EGRESO
INSERT INTO public.tipo_egreso (id, nombre, descripcion) VALUES
('1c1be97f-cea9-4bf9-a3f2-e90f7f59505c', 'Servicios de Mantenimiento', 'Reparación, limpieza e infraestructura física.'),
('68538642-6da3-40cd-9072-ff5480bd830c', 'Servicios Básicos y Internet', 'Energía eléctrica, agua potable, internet y servidores.'),
('e21205e7-df67-44f8-9095-56953b4c1388', 'Suministros y Papelería', 'Hojas, bolígrafos, cuadernos y tóners de impresión.'),
('ba281040-975a-4c7f-9295-4beb120fe0f0', 'Amortización de Activos Físicos', 'Pago de cuotas recurrentes para la adquisición de bienes de capital.'),
('5db0192c-e253-481a-83c0-3b197cb5c579', 'Logística de Eventos', 'Catering, pasajes, alojamiento y alquiler de salones.')
ON CONFLICT (id) DO NOTHING;

-- 9. TIPOS DE ACTIVO
INSERT INTO public.tipo_activo (id, nombre, descripcion) VALUES
('a4c7ee5c-de0b-430c-8b4d-0f459c68b512', 'Mobiliario de Oficina', 'Mesas, escritorios, sillas ergonómicas e implementos de recepción.'),
('c330c74b-dfc8-4bc5-b030-69c80cab3b2d', 'Equipos Informáticos y Redes', 'Laptops, servidores, switches, racks de comunicación y cableado.'),
('7054699b-59f5-49a6-9848-6243923ef825', 'Vehículo de Transporte', 'Vehículos motorizados de uso exclusivo corporativo.'),
('0712948e-b9b1-483c-913b-6ad853a49395', 'Inmuebles y Oficinas', 'Edificios, terrenos u oficinas físicas de propiedad de la institución.')
ON CONFLICT (id) DO NOTHING;

-- 10. ACTIVOS PATRIMONIALES (Con datos financieros detallados y precisos)
INSERT INTO public.activos (id, miembro_id, tipo_activo_id, nombre, descripcion, costo_total, saldo_pendiente, estado, "fechaAdquisicion") VALUES
('6808fe6e-45a5-46cf-9a4c-0926e4e5e1d6', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'c330c74b-dfc8-4bc5-b030-69c80cab3b2d', 'Laptops Dell Latitude Core i7 (x5)', 'Computadoras ergonómicas para el área administrativa.', 12000.00, 0.00, 'pagado', CURRENT_DATE - interval '180 days'),
('0d15a42b-48b5-4a65-ab54-f15ea9254b71', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'a4c7ee5c-de0b-430c-8b4d-0f459c68b512', 'Escritorio Modular Ejecutivo en L', 'Escritorios de madera y melamina con cajoneras.', 3500.00, 0.00, 'pagado', CURRENT_DATE - interval '120 days'),
('59f8741d-630b-4247-979a-8b0618539d3d', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'c330c74b-dfc8-4bc5-b030-69c80cab3b2d', 'Servidor Dell PowerEdge R750', 'Servidor físico para base de datos y copias de seguridad de auditoría.', 15000.00, 2500.00, 'deuda', CURRENT_DATE - interval '300 days'),
('604da797-ff13-4ca4-9753-872cde5993b5', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'c330c74b-dfc8-4bc5-b030-69c80cab3b2d', 'Proyector Epson Home Cinema 4K', 'Proyector multimedia para sala de juntas y asambleas.', 4500.00, 2250.00, 'deuda', CURRENT_DATE - interval '90 days'),
('4ebe97bb-ca70-4eaf-a2c1-677bb1746e31', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '7054699b-59f5-49a6-9848-6243923ef825', 'Camioneta Toyota Hilux 4x4', 'Vehículo institucional para comisiones y transporte de insumos.', 85000.00, 21250.00, 'deuda', CURRENT_DATE - interval '240 days')
ON CONFLICT (id) DO NOTHING;

-- 11. PLAN DE AMORTIZACIÓN (Cuotas y cronogramas de pagos asociados a activos en deuda)
INSERT INTO public.plan_amortizacion (id, "activoId", numero, "fechaVencimiento", monto, estado) VALUES
-- Servidor Dell PowerEdge R750 (Total: 15,000 Bs | 12 cuotas de 1,250 Bs | 10 pagadas, 2 pendientes)
('11111111-1111-1111-1111-111111111101', '59f8741d-630b-4247-979a-8b0618539d3d', 1, CURRENT_DATE - interval '270 days', 1250.00, 'pagado'),
('11111111-1111-1111-1111-111111111102', '59f8741d-630b-4247-979a-8b0618539d3d', 2, CURRENT_DATE - interval '240 days', 1250.00, 'pagado'),
('11111111-1111-1111-1111-111111111103', '59f8741d-630b-4247-979a-8b0618539d3d', 3, CURRENT_DATE - interval '210 days', 1250.00, 'pagado'),
('11111111-1111-1111-1111-111111111104', '59f8741d-630b-4247-979a-8b0618539d3d', 4, CURRENT_DATE - interval '180 days', 1250.00, 'pagado'),
('11111111-1111-1111-1111-111111111105', '59f8741d-630b-4247-979a-8b0618539d3d', 5, CURRENT_DATE - interval '150 days', 1250.00, 'pagado'),
('11111111-1111-1111-1111-111111111106', '59f8741d-630b-4247-979a-8b0618539d3d', 6, CURRENT_DATE - interval '120 days', 1250.00, 'pagado'),
('11111111-1111-1111-1111-111111111107', '59f8741d-630b-4247-979a-8b0618539d3d', 7, CURRENT_DATE - interval '90 days', 1250.00, 'pagado'),
('11111111-1111-1111-1111-111111111108', '59f8741d-630b-4247-979a-8b0618539d3d', 8, CURRENT_DATE - interval '60 days', 1250.00, 'pagado'),
('11111111-1111-1111-1111-111111111109', '59f8741d-630b-4247-979a-8b0618539d3d', 9, CURRENT_DATE - interval '30 days', 1250.00, 'pagado'),
('11111111-1111-1111-1111-111111111110', '59f8741d-630b-4247-979a-8b0618539d3d', 10, CURRENT_DATE - interval '5 days', 1250.00, 'pagado'),
('11111111-1111-1111-1111-111111111111', '59f8741d-630b-4247-979a-8b0618539d3d', 11, CURRENT_DATE + interval '25 days', 1250.00, 'pendiente'),
('11111111-1111-1111-1111-111111111112', '59f8741d-630b-4247-979a-8b0618539d3d', 12, CURRENT_DATE + interval '55 days', 1250.00, 'pendiente'),

-- Proyector Epson Home Cinema 4K (Total: 4,500 Bs | 6 cuotas de 750 Bs | 3 pagadas, 3 pendientes)
('22222222-2222-2222-2222-222222222201', '604da797-ff13-4ca4-9753-872cde5993b5', 1, CURRENT_DATE - interval '75 days', 750.00, 'pagado'),
('22222222-2222-2222-2222-222222222202', '604da797-ff13-4ca4-9753-872cde5993b5', 2, CURRENT_DATE - interval '45 days', 750.00, 'pagado'),
('22222222-2222-2222-2222-222222222203', '604da797-ff13-4ca4-9753-872cde5993b5', 3, CURRENT_DATE - interval '15 days', 750.00, 'pagado'),
('22222222-2222-2222-2222-222222222204', '604da797-ff13-4ca4-9753-872cde5993b5', 4, CURRENT_DATE + interval '15 days', 750.00, 'pendiente'),
('22222222-2222-2222-2222-222222222205', '604da797-ff13-4ca4-9753-872cde5993b5', 5, CURRENT_DATE + interval '45 days', 750.00, 'pendiente'),
('22222222-2222-2222-2222-222222222206', '604da797-ff13-4ca4-9753-872cde5993b5', 6, CURRENT_DATE + interval '75 days', 750.00, 'pendiente'),

-- Camioneta Toyota Hilux 4x4 (Total: 85,000 Bs | 24 cuotas de 3,541.67 Bs | 8 pagadas, 16 pendientes)
('33333333-3333-3333-3333-333333333301', '4ebe97bb-ca70-4eaf-a2c1-677bb1746e31', 1, CURRENT_DATE - interval '240 days', 3541.67, 'pagado'),
('33333333-3333-3333-3333-333333333302', '4ebe97bb-ca70-4eaf-a2c1-677bb1746e31', 2, CURRENT_DATE - interval '210 days', 3541.67, 'pagado'),
('33333333-3333-3333-3333-333333333303', '4ebe97bb-ca70-4eaf-a2c1-677bb1746e31', 3, CURRENT_DATE - interval '180 days', 3541.67, 'pagado'),
('33333333-3333-3333-3333-333333333304', '4ebe97bb-ca70-4eaf-a2c1-677bb1746e31', 4, CURRENT_DATE - interval '150 days', 3541.67, 'pagado'),
('33333333-3333-3333-3333-333333333305', '4ebe97bb-ca70-4eaf-a2c1-677bb1746e31', 5, CURRENT_DATE - interval '120 days', 3541.67, 'pagado'),
('33333333-3333-3333-3333-333333333306', '4ebe97bb-ca70-4eaf-a2c1-677bb1746e31', 6, CURRENT_DATE - interval '90 days', 3541.67, 'pagado'),
('33333333-3333-3333-3333-333333333307', '4ebe97bb-ca70-4eaf-a2c1-677bb1746e31', 7, CURRENT_DATE - interval '60 days', 3541.67, 'pagado'),
('33333333-3333-3333-3333-333333333308', '4ebe97bb-ca70-4eaf-a2c1-677bb1746e31', 8, CURRENT_DATE - interval '30 days', 3541.67, 'pagado'),
('33333333-3333-3333-3333-333333333309', '4ebe97bb-ca70-4eaf-a2c1-677bb1746e31', 9, CURRENT_DATE + interval '30 days', 3541.67, 'pendiente'),
('33333333-3333-3333-3333-333333333310', '4ebe97bb-ca70-4eaf-a2c1-677bb1746e31', 10, CURRENT_DATE + interval '60 days', 3541.67, 'pendiente')
ON CONFLICT (id) DO NOTHING;

-- 12. INGRESOS FINANCIEROS (Historial de cuotas pagadas secuencialmente desde el registro de cada socio)
INSERT INTO public.ingreso (id, miembro_id, registrado_por, tipo_ingreso_id, monto, fecha, descripcion, estado) VALUES
-- Paula Pérez (c244f37b-567b-49e6-b224-ae37a75298f2): 14 meses de antigüedad. Pagó los primeros 10 meses secuencialmente sin saltos de deudas.
('a0000001-aaaa-1111-2222-333333333301', 'c244f37b-567b-49e6-b224-ae37a75298f2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '13 months', 'Cuota mensual 1 - Paula Pérez', 'pagada'),
('a0000001-aaaa-1111-2222-333333333302', 'c244f37b-567b-49e6-b224-ae37a75298f2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '12 months', 'Cuota mensual 2 - Paula Pérez', 'pagada'),
('a0000001-aaaa-1111-2222-333333333303', 'c244f37b-567b-49e6-b224-ae37a75298f2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '11 months', 'Cuota mensual 3 - Paula Pérez', 'pagada'),
('a0000001-aaaa-1111-2222-333333333304', 'c244f37b-567b-49e6-b224-ae37a75298f2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '10 months', 'Cuota mensual 4 - Paula Pérez', 'pagada'),
('a0000001-aaaa-1111-2222-333333333305', 'c244f37b-567b-49e6-b224-ae37a75298f2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '9 months', 'Cuota mensual 5 - Paula Pérez', 'pagada'),
('a0000001-aaaa-1111-2222-333333333306', 'c244f37b-567b-49e6-b224-ae37a75298f2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '8 months', 'Cuota mensual 6 - Paula Pérez', 'pagada'),
('a0000001-aaaa-1111-2222-333333333307', 'c244f37b-567b-49e6-b224-ae37a75298f2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '7 months', 'Cuota mensual 7 - Paula Pérez', 'pagada'),
('a0000001-aaaa-1111-2222-333333333308', 'c244f37b-567b-49e6-b224-ae37a75298f2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '6 months', 'Cuota mensual 8 - Paula Pérez', 'pagada'),
('a0000001-aaaa-1111-2222-333333333309', 'c244f37b-567b-49e6-b224-ae37a75298f2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '5 months', 'Cuota mensual 9 - Paula Pérez', 'pagada'),
('a0000001-aaaa-1111-2222-333333333310', 'c244f37b-567b-49e6-b224-ae37a75298f2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '4 months', 'Cuota mensual 10 - Paula Pérez', 'pagada'),

-- Luis López (d9dd246a-e56e-42a8-8b8b-5b98aafd1303): 12 meses de antigüedad. Pagó los primeros 9 meses secuencialmente sin saltos.
('a0000002-aaaa-1111-2222-333333333301', 'd9dd246a-e56e-42a8-8b8b-5b98aafd1303', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '11 months', 'Cuota mensual 1 - Luis López', 'pagada'),
('a0000002-aaaa-1111-2222-333333333302', 'd9dd246a-e56e-42a8-8b8b-5b98aafd1303', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '10 months', 'Cuota mensual 2 - Luis López', 'pagada'),
('a0000002-aaaa-1111-2222-333333333303', 'd9dd246a-e56e-42a8-8b8b-5b98aafd1303', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '9 months', 'Cuota mensual 3 - Luis López', 'pagada'),
('a0000002-aaaa-1111-2222-333333333304', 'd9dd246a-e56e-42a8-8b8b-5b98aafd1303', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '8 months', 'Cuota mensual 4 - Luis López', 'pagada'),
('a0000002-aaaa-1111-2222-333333333305', 'd9dd246a-e56e-42a8-8b8b-5b98aafd1303', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '7 months', 'Cuota mensual 5 - Luis López', 'pagada'),
('a0000002-aaaa-1111-2222-333333333306', 'd9dd246a-e56e-42a8-8b8b-5b98aafd1303', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '6 months', 'Cuota mensual 6 - Luis López', 'pagada'),
('a0000002-aaaa-1111-2222-333333333307', 'd9dd246a-e56e-42a8-8b8b-5b98aafd1303', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '5 months', 'Cuota mensual 7 - Luis López', 'pagada'),
('a0000002-aaaa-1111-2222-333333333308', 'd9dd246a-e56e-42a8-8b8b-5b98aafd1303', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '4 months', 'Cuota mensual 8 - Luis López', 'pagada'),
('a0000002-aaaa-1111-2222-333333333309', 'd9dd246a-e56e-42a8-8b8b-5b98aafd1303', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '3 months', 'Cuota mensual 9 - Luis López', 'pagada'),

-- Sofía Torres (840c927d-7573-451a-9e59-22a3647f8359): 11 meses de antigüedad. Pagó todos sus 10 meses (Al día).
('a0000003-aaaa-1111-2222-333333333301', '840c927d-7573-451a-9e59-22a3647f8359', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '10 months', 'Cuota mensual 1 - Sofía Torres', 'pagada'),
('a0000003-aaaa-1111-2222-333333333302', '840c927d-7573-451a-9e59-22a3647f8359', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '9 months', 'Cuota mensual 2 - Sofía Torres', 'pagada'),
('a0000003-aaaa-1111-2222-333333333303', '840c927d-7573-451a-9e59-22a3647f8359', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '8 months', 'Cuota mensual 3 - Sofía Torres', 'pagada'),
('a0000003-aaaa-1111-2222-333333333304', '840c927d-7573-451a-9e59-22a3647f8359', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '7 months', 'Cuota mensual 4 - Sofía Torres', 'pagada'),
('a0000003-aaaa-1111-2222-333333333305', '840c927d-7573-451a-9e59-22a3647f8359', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '6 months', 'Cuota mensual 5 - Sofía Torres', 'pagada'),
('a0000003-aaaa-1111-2222-333333333306', '840c927d-7573-451a-9e59-22a3647f8359', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '5 months', 'Cuota mensual 6 - Sofía Torres', 'pagada'),
('a0000003-aaaa-1111-2222-333333333307', '840c927d-7573-451a-9e59-22a3647f8359', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '4 months', 'Cuota mensual 7 - Sofía Torres', 'pagada'),
('a0000003-aaaa-1111-2222-333333333308', '840c927d-7573-451a-9e59-22a3647f8359', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '3 months', 'Cuota mensual 8 - Sofía Torres', 'pagada'),
('a0000003-aaaa-1111-2222-333333333309', '840c927d-7573-451a-9e59-22a3647f8359', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '2 months', 'Cuota mensual 9 - Sofía Torres', 'pagada'),
('a0000003-aaaa-1111-2222-333333333310', '840c927d-7573-451a-9e59-22a3647f8359', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '1 months', 'Cuota mensual 10 - Sofía Torres', 'pagada'),

-- Mauricio Paz (e0000001-eeee-4444-8888-999999999901): 5 meses de antigüedad. Pagó 4 cuotas secuencialmente.
('a0000004-aaaa-1111-2222-333333333301', 'e0000001-eeee-4444-8888-999999999901', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '4 months', 'Cuota mensual 1 - Mauricio Paz', 'pagada'),
('a0000004-aaaa-1111-2222-333333333302', 'e0000001-eeee-4444-8888-999999999901', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '3 months', 'Cuota mensual 2 - Mauricio Paz', 'pagada'),
('a0000004-aaaa-1111-2222-333333333303', 'e0000001-eeee-4444-8888-999999999901', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '2 months', 'Cuota mensual 3 - Mauricio Paz', 'pagada'),
('a0000004-aaaa-1111-2222-333333333304', 'e0000001-eeee-4444-8888-999999999901', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '1 months', 'Cuota mensual 4 - Mauricio Paz', 'pagada'),

-- Daniela Rojas (e0000002-eeee-4444-8888-999999999902): 5 meses de antigüedad. Pagó 4 cuotas secuencialmente.
('a0000005-aaaa-1111-2222-333333333301', 'e0000002-eeee-4444-8888-999999999902', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '4 months', 'Cuota mensual 1 - Daniela Rojas', 'pagada'),
('a0000005-aaaa-1111-2222-333333333302', 'e0000002-eeee-4444-8888-999999999902', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '3 months', 'Cuota mensual 2 - Daniela Rojas', 'pagada'),
('a0000005-aaaa-1111-2222-333333333303', 'e0000002-eeee-4444-8888-999999999902', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '2 months', 'Cuota mensual 3 - Daniela Rojas', 'pagada'),
('a0000005-aaaa-1111-2222-333333333304', 'e0000002-eeee-4444-8888-999999999902', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '1 months', 'Cuota mensual 4 - Daniela Rojas', 'pagada'),

-- Fernando Vargas (e0000003-eeee-4444-8888-999999999903): 4 meses de antigüedad. Pagó 3 cuotas secuencialmente.
('a0000006-aaaa-1111-2222-333333333301', 'e0000003-eeee-4444-8888-999999999903', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '3 months', 'Cuota mensual 1 - Fernando Vargas', 'pagada'),
('a0000006-aaaa-1111-2222-333333333302', 'e0000003-eeee-4444-8888-999999999903', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '2 months', 'Cuota mensual 2 - Fernando Vargas', 'pagada'),
('a0000006-aaaa-1111-2222-333333333303', 'e0000003-eeee-4444-8888-999999999903', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '1 months', 'Cuota mensual 3 - Fernando Vargas', 'pagada'),

-- Camila Flores (e0000004-eeee-4444-8888-999999999904): 4 meses de antigüedad. Pagó 3 cuotas secuencialmente.
('a0000007-aaaa-1111-2222-333333333301', 'e0000004-eeee-4444-8888-999999999904', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '3 months', 'Cuota mensual 1 - Camila Flores', 'pagada'),
('a0000007-aaaa-1111-2222-333333333302', 'e0000004-eeee-4444-8888-999999999904', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '2 months', 'Cuota mensual 2 - Camila Flores', 'pagada'),
('a0000007-aaaa-1111-2222-333333333303', 'e0000004-eeee-4444-8888-999999999904', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 150.00, CURRENT_DATE - interval '1 months', 'Cuota mensual 3 - Camila Flores', 'pagada'),

-- Otros ingresos institucionales diversos (Inscripciones y multas)
('fe47438b-9f58-46c8-97f2-f96394c5664d', 'c9d9df36-c6a5-4ef8-bb6d-8a1855caccb9', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '6968c28b-d79f-4cfa-86ef-b1674b93ac8e', 500.00, CURRENT_DATE - interval '14 days', 'Inscripción de nuevo miembro a la sociedad (Luisa Sánchez).', 'pagada'),
('f0000009-ffff-2222-3333-444444444409', 'e0000009-eeee-4444-8888-999999999909', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '1c9bfe20-53c4-4e94-be62-afacd17d457b', 100.00, CURRENT_DATE - interval '12 days', 'Multa por inasistencia a la Asamblea General.', 'pagada'),
('f0000010-ffff-2222-3333-444444444410', 'e0000010-eeee-4444-8888-999999999910', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'd26423ba-8289-40dd-9dc8-e8d98a455ca8', 1200.00, CURRENT_DATE - interval '18 days', 'Donación voluntaria para el fondo del Campeonato de Futsal.', 'pagada')
ON CONFLICT (id) DO NOTHING;

-- 13. EGRESOS FINANCIEROS (Historial de egresos y facturas con sus 11 columnas correctas)
INSERT INTO public.egreso (id, miembro_id, tipo_egreso_id, activo_id, monto, fecha, concepto, descripcion, hash_anterior, hash_actual, blockchain_tx_id) VALUES
('898084bb-cb14-490a-9c5a-35e4475b5168', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '1c1be97f-cea9-4bf9-a3f2-e90f7f59505c', NULL, 650.00, CURRENT_DATE - interval '7 days', 'Mantenimiento del Aire Acondicionado', 'Servicio técnico especializado en oficinas.', 'genesis', 'a445e90df33140abcc', 'tx_987214624128'),
('f9f3689c-828f-4343-b5da-9dcac39c6836', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'e21205e7-df67-44f8-9095-56953b4c1388', NULL, 450.00, CURRENT_DATE - interval '14 days', 'Compra de Resmas y Carpetas', 'Insumos de oficina anuales.', 'a445e90df33140abcc', 'c339d2243d41fe090b', 'tx_987214624129'),
('b3f87761-d74e-49e6-8df2-6a08373bf021', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'ba281040-975a-4c7f-9295-4beb120fe0f0', '59f8741d-630b-4247-979a-8b0618539d3d', 1250.00, CURRENT_DATE - interval '18 days', 'Pago de Servidor Dell - Cuota 8', 'Gasto justificado por plan de amortización.', 'c339d2243d41fe090b', 'b334ef5647a98db25', 'tx_987214624130'),
('34f1a3b3-944c-4b79-9ea7-d2b534a02109', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '5db0192c-e253-481a-83c0-3b197cb5c579', NULL, 2200.00, CURRENT_DATE - interval '37 days', 'Catering Asamblea General', 'Servicio de comida y refrescos para 60 personas.', 'b334ef5647a98db25', 'e332840af7cc91e5d', 'tx_987214624131'),
-- Egresos adicionales
('70000001-eeee-2222-3333-444444444401', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '68538642-6da3-40cd-9072-ff5480bd830c', NULL, 350.00, CURRENT_DATE - interval '25 days', 'Pago de Servicio de Internet Fibra', 'Servicio provisto por Entel Bolivia para oficina central.', 'e332840af7cc91e5d', 'h741258963258a', 'tx_987214624132'),
('70000002-eeee-2222-3333-444444444402', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '68538642-6da3-40cd-9072-ff5480bd830c', NULL, 210.00, CURRENT_DATE - interval '22 days', 'Pago de Luz Eléctrica CRE', 'Factura de luz eléctrica del mes de Abril.', 'h741258963258a', 'h985214763258b', NULL),
('70000003-eeee-2222-3333-444444444403', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '68538642-6da3-40cd-9072-ff5480bd830c', NULL, 80.00, CURRENT_DATE - interval '20 days', 'Pago de Agua Potable Saguapac', 'Factura de consumo de agua de la oficina central.', 'h985214763258b', 'h785412369852c', NULL),
('70000004-eeee-2222-3333-444444444404', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'e21205e7-df67-44f8-9095-56953b4c1388', NULL, 150.00, CURRENT_DATE - interval '12 days', 'Compra de Tóner HP 105A', 'Insumos para la impresora de secretaría.', 'h785412369852c', 'h123654789521d', NULL),
('70000005-eeee-2222-3333-444444444405', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '1c1be97f-cea9-4bf9-a3f2-e90f7f59505c', NULL, 400.00, CURRENT_DATE - interval '9 days', 'Limpieza y Desinfección de Oficinas', 'Servicio quincenal de higiene y salud.', 'h123654789521d', 'h985471236547e', NULL)
ON CONFLICT (id) DO NOTHING;

-- 14. DETALLES DE EGRESOS (Facturación interna para desglose y transparencia total - CADA egreso tiene sus detalles obligatorios)
INSERT INTO public.detalles (id, egreso_id, nombre, fecha, descripcion) VALUES
-- Aire acondicionado
('d1e1f1a1-b1c1-d1e1-f1a1-b1c1d1e1f1a1', '898084bb-cb14-490a-9c5a-35e4475b5168', 'Limpieza e inyección de gas R410', CURRENT_DATE - interval '7 days', 'Servicio técnico de filtros y carga de refrigerante.'),
('d1e1f1a2-b1c1-d1e1-f1a1-b1c1d1e1f1a1', '898084bb-cb14-490a-9c5a-35e4475b5168', 'Reemplazo de capacitor térmico', CURRENT_DATE - interval '7 days', 'Repuesto para unidad externa del aire de recepción.'),
-- Resmas y carpetas
('d2e2f2a2-b2c2-d2e2-f2a2-b2c2d2e2f2a2', 'f9f3689c-828f-4343-b5da-9dcac39c6836', 'Caja de Hojas Bond Carta Chamex (x5)', CURRENT_DATE - interval '14 days', 'Papelería comprada en Librería El Ateneo.'),
('d2e2f2a3-b2c2-d2e2-f2a2-b2c2d2e2f2a2', 'f9f3689c-828f-4343-b5da-9dcac39c6836', 'Archivadores de Palanca color Azul (x10)', CURRENT_DATE - interval '14 days', 'Organizadores de documentos contables.'),
-- Servidor Dell
('d3e3f3a3-b3c3-d3e3-f3a3-b3c3d3e3f3a3', 'b3f87761-d74e-49e6-8df2-6a08373bf021', 'Amortización cuota mensual Dell PowerEdge', CURRENT_DATE - interval '18 days', 'Débito automático bancario de la cuota 8.'),
-- Catering
('d4e4f4a4-b4c4-d4e4-f4a4-b4c4d4e4f4a4', '34f1a3b3-944c-4b79-9ea7-d2b534a02109', 'Alquiler de Vajilla y Mesas', CURRENT_DATE - interval '37 days', 'Proporcionado por Eventos El Prado.'),
('d4e4f4a5-b4c4-d4e4-f4a4-b4c4d4e4f4a4', '34f1a3b3-944c-4b79-9ea7-d2b534a02109', 'Catering Gourmet de almuerzo frío', CURRENT_DATE - interval '37 days', 'Servicios de alimentación para 60 miembros inscritos.'),
-- Internet Fibra
('d0000001-aaaa-bbbb-cccc-dddddddddd01', '70000001-eeee-2222-3333-444444444401', 'Plan Fibra Pyme 100 Mbps', CURRENT_DATE - interval '25 days', 'Pago mensual de Internet corporativo.'),
-- Luz CRE
('d0000002-aaaa-bbbb-cccc-dddddddddd02', '70000002-eeee-2222-3333-444444444402', 'Consumo Eléctrico Oficina A', CURRENT_DATE - interval '22 days', 'Factura CRE con NIT.'),
-- Agua Saguapac
('d0000003-aaaa-bbbb-cccc-dddddddddd03', '70000003-eeee-2222-3333-444444444403', 'Consumo Agua Potable Mayo', CURRENT_DATE - interval '20 days', 'Factura Saguapac con NIT.'),
-- Tóner HP
('d0000004-aaaa-bbbb-cccc-dddddddddd04', '70000004-eeee-2222-3333-444444444404', 'Tóner Original HP 105A Negro', CURRENT_DATE - interval '12 days', 'Suministro de impresión para documentos administrativos.'),
-- Limpieza
('d0000005-aaaa-bbbb-cccc-dddddddddd05', '70000005-eeee-2222-3333-444444444405', 'Servicio quincenal de higiene', CURRENT_DATE - interval '9 days', 'Desinfección integral y limpieza de pisos y ventanas.')
ON CONFLICT (id) DO NOTHING;

-- 15. ARCHIVOS Y COMPROBANTES DE TRANSPARENCIA
INSERT INTO public.archivo (id, ingreso_id, egreso_id, url, tipo) VALUES
('f1a1b1c1-d1e1-f1a1-b1c1-d1e1f1a1b1c1', 'a0000001-aaaa-1111-2222-333333333301', NULL, 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'comprobante_ingreso'),
('f2a2b2c2-d2e2-f2a2-b2c2-d2e2f2a2b2c2', 'fe47438b-9f58-46c8-97f2-f96394c5664d', NULL, 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'comprobante_ingreso'),
('f3a3b3c3-d3e3-f3a3-b3c3-d3e3f3a3b3c3', NULL, '898084bb-cb14-490a-9c5a-35e4475b5168', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'comprobante_egreso'),
('f4a4b4c4-d4e4-f4a4-b4c4-d4e4f4a4b4c4', NULL, 'b3f87761-d74e-49e6-8df2-6a08373bf021', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'comprobante_egreso')
ON CONFLICT (id) DO NOTHING;
