---
name: backend-y-datos
description: Administra las consultas de Supabase y la creación de funciones serverless en Netlify.
---
# Habilidad: Backend y Datos

## Cuándo usar este skill
- Al diseñar o modificar endpoints y API Serverless (`netlify/functions/`).
- Para consultar o persistir datos en Supabase (Auth, Base de Datos, Storage).

## Inputs necesarios
1) Acción de datos a realizar (ej. consulta de base de datos) o endpoint a crear.

## Workflow
1) **Definición de Capa:** Identifica si la lógica va al Frontend (cliente de Supabase público) o al Backend (Netlify Functions con `SERVICE_ROLE` seguro).
2) **Estructura Serverless:** Si es un endpoint, crea el handler en `frontend/netlify/functions/` con cabeceras CORS y enlázalo en `netlify.toml`.
3) **Lógica de Consultas:** Utiliza la API encadenada de Supabase e implementa validación del objeto `error` obligatoriamente.
4) **Seguridad:** Aplica variables de entorno (`process.env` o `import.meta.env`) y comprueba que las tablas usen RLS en Supabase.

## Reglas de calidad
- Prohibido el Base64 para almacenar multimedia; usa Cloudinary mediante su servicio y guarda solo la URL.
- Asegura que no se expongan llaves maestras al cliente de React.

## Output (formato exacto)
Devuelve siempre:
1) Código fuente completo del handler o consulta.
2) Configuración de redirección de Netlify (si se creó un endpoint).
