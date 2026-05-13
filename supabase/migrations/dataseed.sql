-- ==========================================
-- SCRIPT DE POBLACIÓN DE DATOS (DATA SEEDING)
-- SQL ESTÁTICO (Sin bucles PL/pgSQL para compatibilidad total con Supabase)
-- ==========================================

-- 1. MIEMBROS
INSERT INTO public.miembro (id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", contrasena, telefono, profesion, rol, estado) VALUES
('24c1c5db-ebea-49b3-83d6-7b35267640eb', 'Jorge', 'Morales', 'Castillo', 'usuario0_574@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '78437671', 'Medico', 'admin', 'activo'),
('b512f045-76c7-402f-88d5-c9be930fd8a5', 'Carlos', 'Rios', 'Perez', 'usuario1_567@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '75011831', 'Disenador', 'secretario', 'activo'),
('c244f37b-567b-49e6-b224-ae37a75298f2', 'Paula', 'Perez', 'Perez', 'usuario2_938@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '77980722', 'Ingeniero', 'socio', 'activo'),
('d9dd246a-e56e-42a8-8b8b-5b98aafd1303', 'Luis', 'Lopez', 'Vargas', 'usuario3_887@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '75716447', 'Arquitecto', 'socio', 'activo'),
('840c927d-7573-451a-9e59-22a3647f8359', 'Sofia', 'Torres', 'Gomez', 'usuario4_812@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '74295931', 'Disenador', 'socio', 'activo'),
('15589848-8ffd-4b8d-997d-b03634e02216', 'Miguel', 'Torres', 'Gomez', 'usuario5_763@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '73252383', 'Desarrollador', 'socio', 'activo'),
('04c47319-1ca6-4b3e-ae97-9c46cf3189f3', 'Roberto', 'Suarez', 'Martinez', 'usuario6_709@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '76709223', 'Administrador', 'socio', 'activo'),
('85a6da30-e6a3-4066-91fa-1c63d4dd31b5', 'Andres', 'Cruz', 'Fernandez', 'usuario7_21@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '71959754', 'Administrador', 'socio', 'activo'),
('ed0fb4c3-6435-4d55-9654-85d5b1bdbd60', 'Roberto', 'Garcia', 'Diaz', 'usuario8_214@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '78491197', 'Contador', 'socio', 'activo'),
('d965a71e-b7f4-428a-bff2-2c025c0201b2', 'Pedro', 'Cruz', 'Garcia', 'usuario9_242@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '78107909', 'Ingeniero', 'socio', 'activo'),
('dd42db92-1040-4591-8412-592b6c27fb1d', 'Roberto', 'Perez', 'Torres', 'usuario10_202@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '71762776', 'Abogado', 'socio', 'activo'),
('53dbd038-125d-484b-bd0c-1b51980918fd', 'Lucia', 'Morales', 'Torres', 'usuario11_222@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '75931894', 'Abogado', 'socio', 'activo'),
('3c503b27-de88-4f81-a759-192e801859da', 'Maria', 'Castillo', 'Romero', 'usuario12_140@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '71113600', 'Administrador', 'socio', 'activo'),
('c9d9df36-c6a5-4ef8-bb6d-8a1855caccb9', 'Luis', 'Sanchez', 'Rodriguez', 'usuario13_312@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '73030863', 'Disenador', 'socio', 'activo'),
('579e5132-a2c8-4d77-b4b8-9e5e3a7e58ab', 'Jorge', 'Cruz', 'Vargas', 'usuario14_350@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '76066155', 'Abogado', 'socio', 'activo'),
('7763b5ce-36ef-49a5-8452-54bdfd43aa93', 'Patricia', 'Martinez', 'Cruz', 'usuario15_560@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '78261633', 'Disenador', 'socio', 'activo'),
('ea4b181e-bfff-4030-809b-e8bed9765ae7', 'Jose', 'Lopez', 'Rios', 'usuario16_551@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '78091702', 'Desarrollador', 'socio', 'activo'),
('4041edb9-447c-46b0-b6a7-fe637d629466', 'Miguel', 'Sanchez', 'Cruz', 'usuario17_439@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '79109241', 'Profesor', 'socio', 'activo'),
('3d203862-ca3e-4335-968f-daa278c3c0b4', 'Miguel', 'Suarez', 'Torres', 'usuario18_621@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '72092371', 'Disenador', 'socio', 'activo'),
('8fb0e155-ea96-40f9-938d-140662d33137', 'Laura', 'Garcia', 'Rodriguez', 'usuario19_15@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '72817949', 'Disenador', 'socio', 'activo'),
('49657619-63f4-483d-9cfd-90821dedf849', 'Lucia', 'Castillo', 'Sanchez', 'usuario20_548@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '75615219', 'Desarrollador', 'socio', 'activo'),
('c48cb492-9526-47a8-951b-ca96c17c3ca4', 'Pedro', 'Martinez', 'Fernandez', 'usuario21_548@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '71557119', 'Abogado', 'socio', 'activo'),
('7e469c34-f139-45e9-abed-156ae09f4bb1', 'Diego', 'Diaz', 'Vargas', 'usuario22_557@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '75019301', 'Ingeniero', 'socio', 'activo'),
('09f89006-4794-4501-9ce7-3f4588922e23', 'Maria', 'Torres', 'Vargas', 'usuario23_29@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '75188646', 'Contador', 'socio', 'activo'),
('8be45976-566e-4fd2-8acb-36ecfd8eafce', 'Carlos', 'Romero', 'Rodriguez', 'usuario24_112@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '72765802', 'Medico', 'socio', 'activo'),
('4f5503c5-e167-467b-8840-c4c157ffdda2', 'Paula', 'Suarez', 'Fernandez', 'usuario25_539@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '77231015', 'Administrador', 'socio', 'activo'),
('96d42ffe-bf8a-49e8-9dac-c2bd78b4b8e8', 'Diego', 'Martinez', 'Fernandez', 'usuario26_304@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '74739065', 'Contador', 'socio', 'activo'),
('930b9085-a345-40ec-8abc-eae4ce61dd59', 'Elena', 'Castillo', 'Diaz', 'usuario27_275@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '71942754', 'Contador', 'socio', 'activo'),
('2c05099d-f009-4aaf-84e0-6cc697dee1d1', 'Jose', 'Gomez', 'Morales', 'usuario28_29@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '72754261', 'Consultor', 'socio', 'activo'),
('a8f0aa24-934b-43f8-8ab5-a93dfa4515aa', 'Lucia', 'Suarez', 'Romero', 'usuario29_585@institucion.com', '$2a$10$abcdefghijklmnopqrstuv', '72934244', 'Contador', 'socio', 'activo');

-- 2. NOTIFICACIONES
INSERT INTO public.notificacion (miembro_id, titulo, descripcion, estado) VALUES
('579e5132-a2c8-4d77-b4b8-9e5e3a7e58ab', 'Aviso Institucional 1', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('ed0fb4c3-6435-4d55-9654-85d5b1bdbd60', 'Aviso Institucional 2', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('3c503b27-de88-4f81-a759-192e801859da', 'Aviso Institucional 3', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('15589848-8ffd-4b8d-997d-b03634e02216', 'Aviso Institucional 4', 'Notificación de sistema generada automáticamente.', 'leida'),
('85a6da30-e6a3-4066-91fa-1c63d4dd31b5', 'Aviso Institucional 5', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('840c927d-7573-451a-9e59-22a3647f8359', 'Aviso Institucional 6', 'Notificación de sistema generada automáticamente.', 'leida'),
('a8f0aa24-934b-43f8-8ab5-a93dfa4515aa', 'Aviso Institucional 7', 'Notificación de sistema generada automáticamente.', 'leida'),
('d965a71e-b7f4-428a-bff2-2c025c0201b2', 'Aviso Institucional 8', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('2c05099d-f009-4aaf-84e0-6cc697dee1d1', 'Aviso Institucional 9', 'Notificación de sistema generada automáticamente.', 'leida'),
('4041edb9-447c-46b0-b6a7-fe637d629466', 'Aviso Institucional 10', 'Notificación de sistema generada automáticamente.', 'leida'),
('7e469c34-f139-45e9-abed-156ae09f4bb1', 'Aviso Institucional 11', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('04c47319-1ca6-4b3e-ae97-9c46cf3189f3', 'Aviso Institucional 12', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('840c927d-7573-451a-9e59-22a3647f8359', 'Aviso Institucional 13', 'Notificación de sistema generada automáticamente.', 'leida'),
('c244f37b-567b-49e6-b224-ae37a75298f2', 'Aviso Institucional 14', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('8fb0e155-ea96-40f9-938d-140662d33137', 'Aviso Institucional 15', 'Notificación de sistema generada automáticamente.', 'leida'),
('09f89006-4794-4501-9ce7-3f4588922e23', 'Aviso Institucional 16', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('840c927d-7573-451a-9e59-22a3647f8359', 'Aviso Institucional 17', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('579e5132-a2c8-4d77-b4b8-9e5e3a7e58ab', 'Aviso Institucional 18', 'Notificación de sistema generada automáticamente.', 'leida'),
('579e5132-a2c8-4d77-b4b8-9e5e3a7e58ab', 'Aviso Institucional 19', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('579e5132-a2c8-4d77-b4b8-9e5e3a7e58ab', 'Aviso Institucional 20', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('15589848-8ffd-4b8d-997d-b03634e02216', 'Aviso Institucional 21', 'Notificación de sistema generada automáticamente.', 'leida'),
('96d42ffe-bf8a-49e8-9dac-c2bd78b4b8e8', 'Aviso Institucional 22', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('24c1c5db-ebea-49b3-83d6-7b35267640eb', 'Aviso Institucional 23', 'Notificación de sistema generada automáticamente.', 'leida'),
('4041edb9-447c-46b0-b6a7-fe637d629466', 'Aviso Institucional 24', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('3c503b27-de88-4f81-a759-192e801859da', 'Aviso Institucional 25', 'Notificación de sistema generada automáticamente.', 'leida'),
('7763b5ce-36ef-49a5-8452-54bdfd43aa93', 'Aviso Institucional 26', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('04c47319-1ca6-4b3e-ae97-9c46cf3189f3', 'Aviso Institucional 27', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('a8f0aa24-934b-43f8-8ab5-a93dfa4515aa', 'Aviso Institucional 28', 'Notificación de sistema generada automáticamente.', 'pendiente'),
('09f89006-4794-4501-9ce7-3f4588922e23', 'Aviso Institucional 29', 'Notificación de sistema generada automáticamente.', 'leida'),
('840c927d-7573-451a-9e59-22a3647f8359', 'Aviso Institucional 30', 'Notificación de sistema generada automáticamente.', 'leida');

-- 3. TIPOS DE ACTIVIDAD
INSERT INTO public.tipo_actividad (id, nombre, descripcion) VALUES
('fde2a6ec-8ca6-4e8a-8e0f-72d378af41a4', 'Taller', 'Descripción para tipo de actividad 1'),
('da3925a9-e230-4688-8b0a-00ca4463ab16', 'Seminario', 'Descripción para tipo de actividad 2'),
('fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Curso', 'Descripción para tipo de actividad 3'),
('01bdc2bc-8bd9-4496-8329-c1f5dbad4e2d', 'Asamblea', 'Descripción para tipo de actividad 4'),
('ca85fdf7-07ce-4ca1-a81b-8c1deae9e7a9', 'Deportivo', 'Descripción para tipo de actividad 5');

-- 4. ACTIVIDADES
INSERT INTO public.actividad (id, miembro_id, tipo_actividad_id, titulo, descripcion, fecha, hora, cupos, costo, estado) VALUES
('e58b9198-0dca-4eda-8f45-bed1e5cf1ede', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Actividad 1', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '29 days', '14:00:00', 57, 25, 'programado'),
('6cc3bd14-b2b1-4a8c-96f3-c35b50e8bf74', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Actividad 2', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '-16 days', '14:00:00', 45, 103, 'programado'),
('7508e3ad-a98d-4c15-96d4-a7d0100c5c42', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'ca85fdf7-07ce-4ca1-a81b-8c1deae9e7a9', 'Actividad 3', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '-8 days', '14:00:00', 27, 100, 'programado'),
('39f214c4-0746-4b4f-9575-9f47ae8771ce', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fde2a6ec-8ca6-4e8a-8e0f-72d378af41a4', 'Actividad 4', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '19 days', '14:00:00', 23, 151, 'finalizado'),
('9375cb37-372e-40d1-b4eb-dab8a567ef7b', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb6cf944-7040-4f06-bf84-0f0cd69bf0e2', 'Actividad 5', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '-13 days', '14:00:00', 56, 156, 'programado'),
('f50d84e8-ea41-42f0-ae78-e709cdbff419', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'da3925a9-e230-4688-8b0a-00ca4463ab16', 'Actividad 6', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '27 days', '14:00:00', 24, 99, 'programado'),
('8486d3a2-5844-44b4-a424-1598f6f0ccfc', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '01bdc2bc-8bd9-4496-8329-c1f5dbad4e2d', 'Actividad 7', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '-30 days', '14:00:00', 41, 118, 'programado'),
('cff8a67c-cfef-4b21-a80b-7d2bc2d2d58e', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '01bdc2bc-8bd9-4496-8329-c1f5dbad4e2d', 'Actividad 8', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '19 days', '14:00:00', 25, 184, 'programado'),
('6d14de02-76b7-4108-ab31-96c1b6947381', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fde2a6ec-8ca6-4e8a-8e0f-72d378af41a4', 'Actividad 9', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '-2 days', '14:00:00', 50, 102, 'finalizado'),
('c498dd99-58a9-4cfa-ae08-8198f8bffa80', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '01bdc2bc-8bd9-4496-8329-c1f5dbad4e2d', 'Actividad 10', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '28 days', '14:00:00', 51, 27, 'programado'),
('edb05d72-0fe3-45e9-b438-ac07f6bb36be', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '01bdc2bc-8bd9-4496-8329-c1f5dbad4e2d', 'Actividad 11', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '8 days', '14:00:00', 57, 59, 'programado'),
('d6d21213-165f-4010-89da-93db56b07531', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '01bdc2bc-8bd9-4496-8329-c1f5dbad4e2d', 'Actividad 12', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '-2 days', '14:00:00', 43, 40, 'programado'),
('65d200e4-7304-41ec-9744-e44bb83ed0a4', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '01bdc2bc-8bd9-4496-8329-c1f5dbad4e2d', 'Actividad 13', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '-20 days', '14:00:00', 59, 98, 'programado'),
('20f8fc8a-040d-45d0-b5e0-0f98ae54525d', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '01bdc2bc-8bd9-4496-8329-c1f5dbad4e2d', 'Actividad 14', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '24 days', '14:00:00', 13, 129, 'programado'),
('344159fc-979a-481b-80f9-183c833e2fc5', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '01bdc2bc-8bd9-4496-8329-c1f5dbad4e2d', 'Actividad 15', 'Detalles extensos de la actividad.', CURRENT_DATE + interval '2 days', '14:00:00', 56, 6, 'programado');

-- 5. INSCRIPCIONES
INSERT INTO public.inscripcion (miembro_id, actividad_id, estado) VALUES
('c48cb492-9526-47a8-951b-ca96c17c3ca4', 'c498dd99-58a9-4cfa-ae08-8198f8bffa80', 'confirmado'),
('b512f045-76c7-402f-88d5-c9be930fd8a5', '8486d3a2-5844-44b4-a424-1598f6f0ccfc', 'confirmado'),
('579e5132-a2c8-4d77-b4b8-9e5e3a7e58ab', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado'),
('3d203862-ca3e-4335-968f-daa278c3c0b4', '20f8fc8a-040d-45d0-b5e0-0f98ae54525d', 'confirmado'),
('c244f37b-567b-49e6-b224-ae37a75298f2', 'f50d84e8-ea41-42f0-ae78-e709cdbff419', 'confirmado'),
('a8f0aa24-934b-43f8-8ab5-a93dfa4515aa', '6cc3bd14-b2b1-4a8c-96f3-c35b50e8bf74', 'confirmado'),
('53dbd038-125d-484b-bd0c-1b51980918fd', 'cff8a67c-cfef-4b21-a80b-7d2bc2d2d58e', 'confirmado'),
('96d42ffe-bf8a-49e8-9dac-c2bd78b4b8e8', '6cc3bd14-b2b1-4a8c-96f3-c35b50e8bf74', 'confirmado'),
('09f89006-4794-4501-9ce7-3f4588922e23', '344159fc-979a-481b-80f9-183c833e2fc5', 'confirmado'),
('7763b5ce-36ef-49a5-8452-54bdfd43aa93', '6d14de02-76b7-4108-ab31-96c1b6947381', 'confirmado'),
('2c05099d-f009-4aaf-84e0-6cc697dee1d1', '9375cb37-372e-40d1-b4eb-dab8a567ef7b', 'confirmado'),
('7763b5ce-36ef-49a5-8452-54bdfd43aa93', 'cff8a67c-cfef-4b21-a80b-7d2bc2d2d58e', 'confirmado'),
('579e5132-a2c8-4d77-b4b8-9e5e3a7e58ab', 'cff8a67c-cfef-4b21-a80b-7d2bc2d2d58e', 'confirmado'),
('b512f045-76c7-402f-88d5-c9be930fd8a5', '7508e3ad-a98d-4c15-96d4-a7d0100c5c42', 'confirmado'),
('3d203862-ca3e-4335-968f-daa278c3c0b4', '7508e3ad-a98d-4c15-96d4-a7d0100c5c42', 'confirmado'),
('ea4b181e-bfff-4030-809b-e8bed9765ae7', '344159fc-979a-481b-80f9-183c833e2fc5', 'confirmado'),
('d9dd246a-e56e-42a8-8b8b-5b98aafd1303', 'c498dd99-58a9-4cfa-ae08-8198f8bffa80', 'confirmado'),
('7763b5ce-36ef-49a5-8452-54bdfd43aa93', '9375cb37-372e-40d1-b4eb-dab8a567ef7b', 'confirmado'),
('ea4b181e-bfff-4030-809b-e8bed9765ae7', 'd6d21213-165f-4010-89da-93db56b07531', 'confirmado'),
('c244f37b-567b-49e6-b224-ae37a75298f2', '8486d3a2-5844-44b4-a424-1598f6f0ccfc', 'confirmado'),
('ed0fb4c3-6435-4d55-9654-85d5b1bdbd60', '9375cb37-372e-40d1-b4eb-dab8a567ef7b', 'confirmado'),
('49657619-63f4-483d-9cfd-90821dedf849', 'edb05d72-0fe3-45e9-b438-ac07f6bb36be', 'confirmado'),
('53dbd038-125d-484b-bd0c-1b51980918fd', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),
('85a6da30-e6a3-4066-91fa-1c63d4dd31b5', 'c498dd99-58a9-4cfa-ae08-8198f8bffa80', 'confirmado'),
('85a6da30-e6a3-4066-91fa-1c63d4dd31b5', '9375cb37-372e-40d1-b4eb-dab8a567ef7b', 'confirmado'),
('49657619-63f4-483d-9cfd-90821dedf849', '6cc3bd14-b2b1-4a8c-96f3-c35b50e8bf74', 'confirmado'),
('4f5503c5-e167-467b-8840-c4c157ffdda2', 'c498dd99-58a9-4cfa-ae08-8198f8bffa80', 'confirmado'),
('c244f37b-567b-49e6-b224-ae37a75298f2', '39f214c4-0746-4b4f-9575-9f47ae8771ce', 'confirmado'),
('b512f045-76c7-402f-88d5-c9be930fd8a5', 'f50d84e8-ea41-42f0-ae78-e709cdbff419', 'confirmado'),
('c9d9df36-c6a5-4ef8-bb6d-8a1855caccb9', '65d200e4-7304-41ec-9744-e44bb83ed0a4', 'confirmado'),
('a8f0aa24-934b-43f8-8ab5-a93dfa4515aa', '9375cb37-372e-40d1-b4eb-dab8a567ef7b', 'confirmado'),
('930b9085-a345-40ec-8abc-eae4ce61dd59', '20f8fc8a-040d-45d0-b5e0-0f98ae54525d', 'confirmado'),
('4041edb9-447c-46b0-b6a7-fe637d629466', 'd6d21213-165f-4010-89da-93db56b07531', 'confirmado'),
('ea4b181e-bfff-4030-809b-e8bed9765ae7', 'cff8a67c-cfef-4b21-a80b-7d2bc2d2d58e', 'confirmado'),
('09f89006-4794-4501-9ce7-3f4588922e23', 'd6d21213-165f-4010-89da-93db56b07531', 'confirmado'),
('7763b5ce-36ef-49a5-8452-54bdfd43aa93', 'c498dd99-58a9-4cfa-ae08-8198f8bffa80', 'confirmado'),
('b512f045-76c7-402f-88d5-c9be930fd8a5', 'd6d21213-165f-4010-89da-93db56b07531', 'confirmado'),
('53dbd038-125d-484b-bd0c-1b51980918fd', '6d14de02-76b7-4108-ab31-96c1b6947381', 'confirmado'),
('d9dd246a-e56e-42a8-8b8b-5b98aafd1303', '7508e3ad-a98d-4c15-96d4-a7d0100c5c42', 'confirmado'),
('a8f0aa24-934b-43f8-8ab5-a93dfa4515aa', 'e58b9198-0dca-4eda-8f45-bed1e5cf1ede', 'confirmado') ON CONFLICT DO NOTHING;

-- 6. TIPOS DE INGRESO
INSERT INTO public.tipo_ingreso (id, nombre, descripcion) VALUES
('fb06aeef-2529-425b-b131-ff09466a0a83', 'Cuota Mensual', 'Categoría de ingreso 1'),
('6968c28b-d79f-4cfa-86ef-b1674b93ac8e', 'Inscripción Nuevo Socio', 'Categoría de ingreso 2'),
('1c9bfe20-53c4-4e94-be62-afacd17d457b', 'Multa por Atraso', 'Categoría de ingreso 3'),
('d26423ba-8289-40dd-9dc8-e8d98a455ca8', 'Donación', 'Categoría de ingreso 4');

-- 7. TIPOS DE EGRESO
INSERT INTO public.tipo_egreso (id, nombre, descripcion) VALUES
('1c1be97f-cea9-4bf9-a3f2-e90f7f59505c', 'Mantenimiento', 'Categoría operativa 1'),
('68538642-6da3-40cd-9072-ff5480bd830c', 'Servicios Básicos', 'Categoría operativa 2'),
('e21205e7-df67-44f8-9095-56953b4c1388', 'Material de Oficina', 'Categoría operativa 3'),
('ba281040-975a-4c7f-9295-4beb120fe0f0', 'Pago de Activo', 'Categoría operativa 4'),
('5db0192c-e253-481a-83c0-3b197cb5c579', 'Eventos', 'Categoría operativa 5');

-- 8. TIPOS DE ACTIVO
INSERT INTO public.tipo_activo (id, nombre, descripcion) VALUES
('a4c7ee5c-de0b-430c-8b4d-0f459c68b512', 'Mobiliario', 'Categoría patrimonial 1'),
('c330c74b-dfc8-4bc5-b030-69c80cab3b2d', 'Equipo Informático', 'Categoría patrimonial 2'),
('7054699b-59f5-49a6-9848-6243923ef825', 'Vehículo', 'Categoría patrimonial 3'),
('0712948e-b9b1-483c-913b-6ad853a49395', 'Inmueble', 'Categoría patrimonial 4');

-- 9. ACTIVOS PATRIMONIALES
INSERT INTO public.activos (id, miembro_id, tipo_activo_id, nombre, descripcion, costo_total, saldo_pendiente, estado, "fechaAdquisicion") VALUES
('6808fe6e-45a5-46cf-9a4c-0926e4e5e1d6', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '7054699b-59f5-49a6-9848-6243923ef825', 'Bien Patrimonial 1', 'Descripción del activo.', 5613, 0, 'pagado', CURRENT_DATE - interval '107 days'),
('0d15a42b-48b5-4a65-ab54-f15ea9254b71', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'a4c7ee5c-de0b-430c-8b4d-0f459c68b512', 'Bien Patrimonial 2', 'Descripción del activo.', 3202, 0, 'pagado', CURRENT_DATE - interval '2 days'),
('59f8741d-630b-4247-979a-8b0618539d3d', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'c330c74b-dfc8-4bc5-b030-69c80cab3b2d', 'Bien Patrimonial 3', 'Descripción del activo.', 4694, 734, 'deuda', CURRENT_DATE - interval '158 days'),
('604da797-ff13-4ca4-9753-872cde5993b5', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '7054699b-59f5-49a6-9848-6243923ef825', 'Bien Patrimonial 4', 'Descripción del activo.', 1396, 0, 'pagado', CURRENT_DATE - interval '166 days'),
('4ebe97bb-ca70-4eaf-a2c1-677bb1746e31', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'c330c74b-dfc8-4bc5-b030-69c80cab3b2d', 'Bien Patrimonial 5', 'Descripción del activo.', 2473, 0, 'pagado', CURRENT_DATE - interval '170 days'),
('74ee6ba7-7adf-4bae-af4f-db32da6f9732', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '7054699b-59f5-49a6-9848-6243923ef825', 'Bien Patrimonial 6', 'Descripción del activo.', 4245, 0, 'pagado', CURRENT_DATE - interval '112 days'),
('a0bb3e64-31af-423e-8a17-d41250ddf450', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'a4c7ee5c-de0b-430c-8b4d-0f459c68b512', 'Bien Patrimonial 7', 'Descripción del activo.', 4280, 0, 'pagado', CURRENT_DATE - interval '227 days'),
('3882b6ed-18bd-45af-be0e-47959433fa5f', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'c330c74b-dfc8-4bc5-b030-69c80cab3b2d', 'Bien Patrimonial 8', 'Descripción del activo.', 5889, 0, 'pagado', CURRENT_DATE - interval '60 days'),
('69f3ae1a-3392-4336-bb7b-13928552916d', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'c330c74b-dfc8-4bc5-b030-69c80cab3b2d', 'Bien Patrimonial 9', 'Descripción del activo.', 3784, 0, 'pagado', CURRENT_DATE - interval '95 days'),
('7057ec82-3cd2-4968-a7f5-f0dc70bc5c90', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '7054699b-59f5-49a6-9848-6243923ef825', 'Bien Patrimonial 10', 'Descripción del activo.', 4526, 0, 'pagado', CURRENT_DATE - interval '207 days');

-- 10. INGRESOS FINANCIEROS
INSERT INTO public.ingreso (id, miembro_id, registrado_por, tipo_ingreso_id, monto, fecha, descripcion, estado) VALUES
('3aa4e662-1b82-4890-a635-73efbeb3adaa', '7763b5ce-36ef-49a5-8452-54bdfd43aa93', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'd26423ba-8289-40dd-9dc8-e8d98a455ca8', 190, CURRENT_DATE - interval '36 days', 'Pago de cuota/multa.', 'pagada'),
('0cbcc9d9-6f00-4280-815b-d18df12f4c4d', '4f5503c5-e167-467b-8840-c4c157ffdda2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'd26423ba-8289-40dd-9dc8-e8d98a455ca8', 222, CURRENT_DATE - interval '34 days', 'Pago de cuota/multa.', 'vencida'),
('e35edd0f-4cdb-43af-a82c-a9fe418373e3', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'd26423ba-8289-40dd-9dc8-e8d98a455ca8', 270, CURRENT_DATE - interval '44 days', 'Pago de cuota/multa.', 'pagada'),
('8a922a5d-24c0-4cf9-a2ae-338abb1b92cd', '85a6da30-e6a3-4066-91fa-1c63d4dd31b5', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 345, CURRENT_DATE - interval '36 days', 'Pago de cuota/multa.', 'pagada'),
('90d67810-280f-4e98-90b2-2df851a54aac', '53dbd038-125d-484b-bd0c-1b51980918fd', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 367, CURRENT_DATE - interval '9 days', 'Pago de cuota/multa.', 'pagada'),
('c42cbbf9-f559-40cd-be3c-7afb57385184', 'c48cb492-9526-47a8-951b-ca96c17c3ca4', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '1c9bfe20-53c4-4e94-be62-afacd17d457b', 51, CURRENT_DATE - interval '13 days', 'Pago de cuota/multa.', 'en_mora'),
('fe47438b-9f58-46c8-97f2-f96394c5664d', 'c9d9df36-c6a5-4ef8-bb6d-8a1855caccb9', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '6968c28b-d79f-4cfa-86ef-b1674b93ac8e', 251, CURRENT_DATE - interval '14 days', 'Pago de cuota/multa.', 'pagada'),
('dbb8bd45-35b7-40f4-82d3-a2f0b0d01288', '4f5503c5-e167-467b-8840-c4c157ffdda2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'd26423ba-8289-40dd-9dc8-e8d98a455ca8', 124, CURRENT_DATE - interval '37 days', 'Pago de cuota/multa.', 'pagada'),
('f2f15c13-7b1d-4dd8-b373-a4bc992564dc', '09f89006-4794-4501-9ce7-3f4588922e23', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'd26423ba-8289-40dd-9dc8-e8d98a455ca8', 414, CURRENT_DATE - interval '23 days', 'Pago de cuota/multa.', 'pagada'),
('9ea58b12-c999-411d-9b19-f8edf74b7607', '49657619-63f4-483d-9cfd-90821dedf849', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '6968c28b-d79f-4cfa-86ef-b1674b93ac8e', 376, CURRENT_DATE - interval '41 days', 'Pago de cuota/multa.', 'en_mora'),
('88316f83-8dde-4e42-9f61-e130d7321e89', 'c244f37b-567b-49e6-b224-ae37a75298f2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '1c9bfe20-53c4-4e94-be62-afacd17d457b', 406, CURRENT_DATE - interval '51 days', 'Pago de cuota/multa.', 'pagada'),
('927b0e65-d3d6-4b33-a3ab-f06ca72c2a2a', '8be45976-566e-4fd2-8acb-36ecfd8eafce', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '1c9bfe20-53c4-4e94-be62-afacd17d457b', 103, CURRENT_DATE - interval '57 days', 'Pago de cuota/multa.', 'pagada'),
('939378ac-f7b8-4888-a2ea-d60bb4272576', '49657619-63f4-483d-9cfd-90821dedf849', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '6968c28b-d79f-4cfa-86ef-b1674b93ac8e', 429, CURRENT_DATE - interval '7 days', 'Pago de cuota/multa.', 'pagada'),
('431ff05f-79fa-4ed0-bf28-dfa136d766e7', '85a6da30-e6a3-4066-91fa-1c63d4dd31b5', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '1c9bfe20-53c4-4e94-be62-afacd17d457b', 159, CURRENT_DATE - interval '50 days', 'Pago de cuota/multa.', 'vencida'),
('2b012686-0c26-45b4-a1c4-3e82c2b6ffbe', '840c927d-7573-451a-9e59-22a3647f8359', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '1c9bfe20-53c4-4e94-be62-afacd17d457b', 263, CURRENT_DATE - interval '39 days', 'Pago de cuota/multa.', 'pagada'),
('9238bf15-604c-47de-87ff-959c0cabc6fa', 'd965a71e-b7f4-428a-bff2-2c025c0201b2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'd26423ba-8289-40dd-9dc8-e8d98a455ca8', 255, CURRENT_DATE - interval '52 days', 'Pago de cuota/multa.', 'pagada'),
('f7f85f6d-cf01-4e48-8629-e2c17cb6bf2d', '85a6da30-e6a3-4066-91fa-1c63d4dd31b5', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '6968c28b-d79f-4cfa-86ef-b1674b93ac8e', 368, CURRENT_DATE - interval '57 days', 'Pago de cuota/multa.', 'pagada'),
('f0784140-49f9-4b7f-9843-57bc417272f7', '579e5132-a2c8-4d77-b4b8-9e5e3a7e58ab', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '6968c28b-d79f-4cfa-86ef-b1674b93ac8e', 369, CURRENT_DATE - interval '55 days', 'Pago de cuota/multa.', 'pagada'),
('61713d1d-f746-4208-a3a5-3b688e2ba559', '04c47319-1ca6-4b3e-ae97-9c46cf3189f3', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '6968c28b-d79f-4cfa-86ef-b1674b93ac8e', 419, CURRENT_DATE - interval '49 days', 'Pago de cuota/multa.', 'pagada'),
('a3c97309-0649-4d57-95bf-2a06043c2365', 'c244f37b-567b-49e6-b224-ae37a75298f2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 75, CURRENT_DATE - interval '25 days', 'Pago de cuota/multa.', 'pagada'),
('1e9d7c3f-d564-409e-b1ea-d9f1d7269bc2', '4041edb9-447c-46b0-b6a7-fe637d629466', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'd26423ba-8289-40dd-9dc8-e8d98a455ca8', 364, CURRENT_DATE - interval '29 days', 'Pago de cuota/multa.', 'pagada'),
('43ec64a7-d23e-478e-ba42-acd14f8ffc44', '96d42ffe-bf8a-49e8-9dac-c2bd78b4b8e8', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '6968c28b-d79f-4cfa-86ef-b1674b93ac8e', 100, CURRENT_DATE - interval '12 days', 'Pago de cuota/multa.', 'vencida'),
('3d292c0c-0f2e-4b2f-8625-8493a7518fd8', 'c9d9df36-c6a5-4ef8-bb6d-8a1855caccb9', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 438, CURRENT_DATE - interval '11 days', 'Pago de cuota/multa.', 'pagada'),
('271cd0e3-8f92-489f-b357-b4f23f831c44', '09f89006-4794-4501-9ce7-3f4588922e23', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'd26423ba-8289-40dd-9dc8-e8d98a455ca8', 176, CURRENT_DATE - interval '37 days', 'Pago de cuota/multa.', 'pagada'),
('9d6eabd6-8157-4668-bdee-0230330513ec', '8fb0e155-ea96-40f9-938d-140662d33137', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 426, CURRENT_DATE - interval '14 days', 'Pago de cuota/multa.', 'pagada'),
('68d21b36-fbfc-4882-aa08-dede631981e1', 'd965a71e-b7f4-428a-bff2-2c025c0201b2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'd26423ba-8289-40dd-9dc8-e8d98a455ca8', 230, CURRENT_DATE - interval '5 days', 'Pago de cuota/multa.', 'en_mora'),
('5c42d7c2-138d-4d38-b454-5a6fb15edb14', 'c244f37b-567b-49e6-b224-ae37a75298f2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '6968c28b-d79f-4cfa-86ef-b1674b93ac8e', 330, CURRENT_DATE - interval '34 days', 'Pago de cuota/multa.', 'pagada'),
('ec042ef5-90bb-4750-a4cd-e6d16f42c40d', '4f5503c5-e167-467b-8840-c4c157ffdda2', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'd26423ba-8289-40dd-9dc8-e8d98a455ca8', 332, CURRENT_DATE - interval '45 days', 'Pago de cuota/multa.', 'pagada'),
('020445a4-b8f2-4c59-9c96-833037636c43', '2c05099d-f009-4aaf-84e0-6cc697dee1d1', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'fb06aeef-2529-425b-b131-ff09466a0a83', 336, CURRENT_DATE - interval '29 days', 'Pago de cuota/multa.', 'pagada'),
('356985e6-ba39-489f-8f35-008649a229c2', '04c47319-1ca6-4b3e-ae97-9c46cf3189f3', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '6968c28b-d79f-4cfa-86ef-b1674b93ac8e', 273, CURRENT_DATE - interval '5 days', 'Pago de cuota/multa.', 'pagada');

-- 11. EGRESOS FINANCIEROS
INSERT INTO public.egreso (id, miembro_id, tipo_egreso_id, activo_id, monto, fecha, concepto, descripcion) VALUES
('898084bb-cb14-490a-9c5a-35e4475b5168', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '1c1be97f-cea9-4bf9-a3f2-e90f7f59505c', NULL, 1017, CURRENT_DATE - interval '7 days', 'Pago a proveedor 1', 'Gasto justificado.'),
('f9f3689c-828f-4343-b5da-9dcac39c6836', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'e21205e7-df67-44f8-9095-56953b4c1388', NULL, 831, CURRENT_DATE - interval '14 days', 'Pago a proveedor 2', 'Gasto justificado.'),
('b3f87761-d74e-49e6-8df2-6a08373bf021', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'ba281040-975a-4c7f-9295-4beb120fe0f0', NULL, 990, CURRENT_DATE - interval '18 days', 'Pago a proveedor 3', 'Gasto justificado.'),
('34f1a3b3-944c-4b79-9ea7-d2b534a02109', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '5db0192c-e253-481a-83c0-3b197cb5c579', '74ee6ba7-7adf-4bae-af4f-db32da6f9732', 353, CURRENT_DATE - interval '37 days', 'Pago a proveedor 4', 'Gasto justificado.'),
('94bbf0c7-0e2c-4175-b1a9-3b6b10314dc5', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'e21205e7-df67-44f8-9095-56953b4c1388', NULL, 897, CURRENT_DATE - interval '35 days', 'Pago a proveedor 5', 'Gasto justificado.'),
('ce506a39-6473-4a8c-a163-a6f01b55dc47', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'ba281040-975a-4c7f-9295-4beb120fe0f0', NULL, 960, CURRENT_DATE - interval '22 days', 'Pago a proveedor 6', 'Gasto justificado.'),
('65b57954-3991-428b-80f6-29213955d39e', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '68538642-6da3-40cd-9072-ff5480bd830c', '74ee6ba7-7adf-4bae-af4f-db32da6f9732', 370, CURRENT_DATE - interval '47 days', 'Pago a proveedor 7', 'Gasto justificado.'),
('66a76c94-e32b-4ea6-9557-fcfccdee417d', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '5db0192c-e253-481a-83c0-3b197cb5c579', NULL, 527, CURRENT_DATE - interval '21 days', 'Pago a proveedor 8', 'Gasto justificado.'),
('5a7e6416-a9c7-423c-8673-c3f3442ab816', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '5db0192c-e253-481a-83c0-3b197cb5c579', '0d15a42b-48b5-4a65-ab54-f15ea9254b71', 472, CURRENT_DATE - interval '28 days', 'Pago a proveedor 9', 'Gasto justificado.'),
('2d30bf25-5a6f-4abc-9e08-a327198f2d3e', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '68538642-6da3-40cd-9072-ff5480bd830c', '3882b6ed-18bd-45af-be0e-47959433fa5f', 1062, CURRENT_DATE - interval '27 days', 'Pago a proveedor 10', 'Gasto justificado.'),
('32710cdc-c820-4e73-9833-6cf1850114ee', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'e21205e7-df67-44f8-9095-56953b4c1388', '69f3ae1a-3392-4336-bb7b-13928552916d', 222, CURRENT_DATE - interval '13 days', 'Pago a proveedor 11', 'Gasto justificado.'),
('91b89092-ba44-423f-b737-528081e19373', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '5db0192c-e253-481a-83c0-3b197cb5c579', NULL, 296, CURRENT_DATE - interval '40 days', 'Pago a proveedor 12', 'Gasto justificado.'),
('22d7cd45-3972-4510-8912-238480acc735', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'ba281040-975a-4c7f-9295-4beb120fe0f0', NULL, 1010, CURRENT_DATE - interval '11 days', 'Pago a proveedor 13', 'Gasto justificado.'),
('78681ae0-da32-48f6-b402-553ada2f0c7e', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '68538642-6da3-40cd-9072-ff5480bd830c', NULL, 199, CURRENT_DATE - interval '50 days', 'Pago a proveedor 14', 'Gasto justificado.'),
('ba3f48a2-997c-4350-913e-c53e2b21d013', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'ba281040-975a-4c7f-9295-4beb120fe0f0', NULL, 1019, CURRENT_DATE - interval '44 days', 'Pago a proveedor 15', 'Gasto justificado.'),
('8866af3c-c0c7-4d90-bd45-6052dabc351b', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '68538642-6da3-40cd-9072-ff5480bd830c', '4ebe97bb-ca70-4eaf-a2c1-677bb1746e31', 616, CURRENT_DATE - interval '42 days', 'Pago a proveedor 16', 'Gasto justificado.'),
('f5568b4c-b16c-4145-a503-36078344b246', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'ba281040-975a-4c7f-9295-4beb120fe0f0', NULL, 442, CURRENT_DATE - interval '51 days', 'Pago a proveedor 17', 'Gasto justificado.'),
('554878d9-f1eb-4e99-a88c-cad574ff95d7', '24c1c5db-ebea-49b3-83d6-7b35267640eb', 'e21205e7-df67-44f8-9095-56953b4c1388', '0d15a42b-48b5-4a65-ab54-f15ea9254b71', 1080, CURRENT_DATE - interval '24 days', 'Pago a proveedor 18', 'Gasto justificado.'),
('a18960a6-d119-4e0a-beab-07ddace894b4', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '1c1be97f-cea9-4bf9-a3f2-e90f7f59505c', NULL, 177, CURRENT_DATE - interval '14 days', 'Pago a proveedor 19', 'Gasto justificado.'),
('4d7f31f5-a183-458e-b44f-032cc56ff60c', '24c1c5db-ebea-49b3-83d6-7b35267640eb', '5db0192c-e253-481a-83c0-3b197cb5c579', NULL, 122, CURRENT_DATE - interval '24 days', 'Pago a proveedor 20', 'Gasto justificado.');

-- 12. DETALLES DE EGRESO
INSERT INTO public.detalles (egreso_id, nombre, fecha, descripcion) VALUES
('2d30bf25-5a6f-4abc-9e08-a327198f2d3e', 'Item de factura 1', CURRENT_DATE - interval '23 days', 'Compra de material de limpieza.'),
('78681ae0-da32-48f6-b402-553ada2f0c7e', 'Item de factura 2', CURRENT_DATE - interval '2 days', 'Compra de material de limpieza.'),
('8866af3c-c0c7-4d90-bd45-6052dabc351b', 'Item de factura 3', CURRENT_DATE - interval '18 days', 'Compra de material de limpieza.'),
('5a7e6416-a9c7-423c-8673-c3f3442ab816', 'Item de factura 4', CURRENT_DATE - interval '49 days', 'Compra de material de limpieza.'),
('78681ae0-da32-48f6-b402-553ada2f0c7e', 'Item de factura 5', CURRENT_DATE - interval '25 days', 'Compra de material de limpieza.'),
('f5568b4c-b16c-4145-a503-36078344b246', 'Item de factura 6', CURRENT_DATE - interval '30 days', 'Compra de material de limpieza.'),
('ce506a39-6473-4a8c-a163-a6f01b55dc47', 'Item de factura 7', CURRENT_DATE - interval '28 days', 'Compra de material de limpieza.'),
('554878d9-f1eb-4e99-a88c-cad574ff95d7', 'Item de factura 8', CURRENT_DATE - interval '11 days', 'Compra de material de limpieza.'),
('ce506a39-6473-4a8c-a163-a6f01b55dc47', 'Item de factura 9', CURRENT_DATE - interval '58 days', 'Compra de material de limpieza.'),
('5a7e6416-a9c7-423c-8673-c3f3442ab816', 'Item de factura 10', CURRENT_DATE - interval '58 days', 'Compra de material de limpieza.'),
('554878d9-f1eb-4e99-a88c-cad574ff95d7', 'Item de factura 11', CURRENT_DATE - interval '17 days', 'Compra de material de limpieza.'),
('b3f87761-d74e-49e6-8df2-6a08373bf021', 'Item de factura 12', CURRENT_DATE - interval '53 days', 'Compra de material de limpieza.'),
('2d30bf25-5a6f-4abc-9e08-a327198f2d3e', 'Item de factura 13', CURRENT_DATE - interval '15 days', 'Compra de material de limpieza.'),
('78681ae0-da32-48f6-b402-553ada2f0c7e', 'Item de factura 14', CURRENT_DATE - interval '23 days', 'Compra de material de limpieza.'),
('4d7f31f5-a183-458e-b44f-032cc56ff60c', 'Item de factura 15', CURRENT_DATE - interval '11 days', 'Compra de material de limpieza.'),
('66a76c94-e32b-4ea6-9557-fcfccdee417d', 'Item de factura 16', CURRENT_DATE - interval '34 days', 'Compra de material de limpieza.'),
('ba3f48a2-997c-4350-913e-c53e2b21d013', 'Item de factura 17', CURRENT_DATE - interval '41 days', 'Compra de material de limpieza.'),
('f9f3689c-828f-4343-b5da-9dcac39c6836', 'Item de factura 18', CURRENT_DATE - interval '43 days', 'Compra de material de limpieza.'),
('a18960a6-d119-4e0a-beab-07ddace894b4', 'Item de factura 19', CURRENT_DATE - interval '19 days', 'Compra de material de limpieza.'),
('a18960a6-d119-4e0a-beab-07ddace894b4', 'Item de factura 20', CURRENT_DATE - interval '35 days', 'Compra de material de limpieza.'),
('5a7e6416-a9c7-423c-8673-c3f3442ab816', 'Item de factura 21', CURRENT_DATE - interval '34 days', 'Compra de material de limpieza.'),
('94bbf0c7-0e2c-4175-b1a9-3b6b10314dc5', 'Item de factura 22', CURRENT_DATE - interval '11 days', 'Compra de material de limpieza.'),
('f5568b4c-b16c-4145-a503-36078344b246', 'Item de factura 23', CURRENT_DATE - interval '0 days', 'Compra de material de limpieza.'),
('ce506a39-6473-4a8c-a163-a6f01b55dc47', 'Item de factura 24', CURRENT_DATE - interval '35 days', 'Compra de material de limpieza.'),
('ce506a39-6473-4a8c-a163-a6f01b55dc47', 'Item de factura 25', CURRENT_DATE - interval '54 days', 'Compra de material de limpieza.');

-- 13. ARCHIVOS / COMPROBANTES
INSERT INTO public.archivo (ingreso_id, egreso_id, url, tipo) VALUES
('88316f83-8dde-4e42-9f61-e130d7321e89', NULL, 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
('90d67810-280f-4e98-90b2-2df851a54aac', NULL, 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
('43ec64a7-d23e-478e-ba42-acd14f8ffc44', NULL, 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
('9ea58b12-c999-411d-9b19-f8edf74b7607', NULL, 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
(NULL, '65b57954-3991-428b-80f6-29213955d39e', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
(NULL, 'b3f87761-d74e-49e6-8df2-6a08373bf021', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
(NULL, '898084bb-cb14-490a-9c5a-35e4475b5168', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
(NULL, '2d30bf25-5a6f-4abc-9e08-a327198f2d3e', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
(NULL, '8866af3c-c0c7-4d90-bd45-6052dabc351b', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
('88316f83-8dde-4e42-9f61-e130d7321e89', NULL, 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
('88316f83-8dde-4e42-9f61-e130d7321e89', NULL, 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
(NULL, '898084bb-cb14-490a-9c5a-35e4475b5168', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
('68d21b36-fbfc-4882-aa08-dede631981e1', NULL, 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
(NULL, 'a18960a6-d119-4e0a-beab-07ddace894b4', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen'),
(NULL, 'b3f87761-d74e-49e6-8df2-6a08373bf021', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'imagen');

