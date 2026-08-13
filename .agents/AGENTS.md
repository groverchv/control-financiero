# Reglas del Agente - Proyecto Control Financiero

Este documento establece las reglas de arquitectura, tecnología, flujos de trabajo y convenciones para cualquier agente de IA que interactúe con el repositorio "Control Financiero". 

Las siguientes reglas DEBEN respetarse estrictamente para garantizar la consistencia, escalabilidad y calidad del proyecto.

---

## 1. Contexto General del Proyecto

"Control Financiero" es una aplicación web dividida en un entorno frontend principal (React) apoyado en un backend compuesto de servicios de Supabase (Base de Datos + Autenticación) y funciones Serverless alojadas en Netlify.

### Organización del Repositorio (Monorepo Lógico)
- **`/frontend/`**: Aplicación React compilada con Vite.
- **`/frontend/netlify/functions/`**: Funciones Serverless de Netlify para lógica backend (ej. Admin, Envío de emails con Brevo).
- **`/QA/`**: Matrices de cumplimiento y planes de pruebas (`MATRIZ_CUMPLIMIENTO.md`, `PLAN_DE_PRUEBAS.md`, `test/run-tests.js`).
- **Raíz (`/`)**: Archivos de configuración de despliegue (`netlify.toml`, `.gitignore`).

---

## 2. Stack Tecnológico (Tech Stack)

Bajo ninguna circunstancia se deben introducir nuevas librerías que dupliquen la funcionalidad de las siguientes, a menos que el usuario lo apruebe explícitamente:

### Frontend
- **Librería Core**: React 19 (`react`, `react-dom`).
- **Enrutamiento**: React Router v7 (`react-router-dom`).
- **Construcción y Servidor Dev**: Vite v8.
- **Estilos**: TailwindCSS v3 (utilizando Vanilla CSS en `index.css` con utilidades de Tailwind).
- **Gestor de Estado Global**: Zustand (`zustand`).
- **Iconografía**: Lucide React (`lucide-react`).
- **Manejo de Mapas**: Leaflet y React Leaflet.
- **Manejo de Archivos/Documentos**: `jspdf` (y `jspdf-autotable`) para PDFs, `xlsx` para hojas de cálculo.
- **Notificaciones UI**: React Toastify (`react-toastify`).

### Backend y Servicios
- **Base de Datos y Autenticación**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`).
- **Serverless (Edge Functions/Backend API)**: Netlify Functions (JS/Node).
- **Envío de Correos**: Brevo (vía SDK `@getbrevo/brevo` en Netlify Functions y servicio `brevo.js`).
- **Gestión de Multimedia**: Cloudinary (API configurada en el frontend).

---

## 3. Arquitectura del Frontend: Feature-Sliced Design

El proyecto utiliza una estructura orientada a dominios ("Features"). Cada área del negocio es una "feature" completamente autocontenida ubicada en `src/features/`.

### Dominios Actuales
- `academico`
- `administracion`
- `auditoria`
- `auth`
- `finanzas`
- `patrimonio`

### Estructura Interna de una Feature
Al crear o modificar una feature, SE DEBE mantener la siguiente estructura interna estricta:
```
src/features/[nombre-feature]/
 ├── api/          # Funciones que interactúan con Supabase, Netlify Functions u otras APIs (ej. index.js)
 ├── components/   # Componentes UI de React específicos de esta feature
 ├── hooks/        # Custom React Hooks que encapsulan la lógica de negocio y llamadas a la API de esta feature
 ├── pages/        # Componentes de página completos que serán ruteados
 └── types/        # Definiciones de constantes, schemas de validación, etc.
```

### Reglas Arquitectónicas Adicionales
1. **Rutas (`src/routes/`)**: Los componentes de la carpeta `pages/` de cada feature se importan y enrutan aquí (ej. `AppRouter.jsx`).
2. **Layouts (`src/layouts/`)**: Plantillas que engloban las páginas (ej. `PublicLayout.jsx`, `AdminLayout.jsx`). Toda página debe montarse sobre su layout correspondiente.
3. **Componentes Globales (`src/components/`)**: Elementos UI genéricos y reutilizables en múltiples features (ej. tablas, inputs personalizados, botones).
4. **Estado Global (`src/store/`)**: Uso exclusivo de Zustand para estados que deben persistir entre múltiples features (ej. `authStore.js`).

---

## 4. Reglas de Codificación (Coding Guidelines)

### Componentes y Hooks
- Usar **exclusivamente Componentes Funcionales (Functional Components)** con React Hooks. Cero uso de componentes de clase.
- Promover la composición: separar los componentes UI complejos en subcomponentes más pequeños.
- Los Hooks personalizados (`src/features/.../hooks/`) deben manejar toda la lógica pesada de la vista, manteniendo los componentes en `pages/` limpios (foco en UI).

### Integración API e Inicialización
- La configuración de clientes API centralizados está en `src/services/` (ej. `supabase.js`, `brevo.js`, `cloudinary.js`). 
- Nunca quemar (hard-code) URLs, claves públicas o strings secretos. Utilizar siempre variables de entorno.
- En el cliente (Vite), usar `import.meta.env.VITE_VARIABLE_NAME`. En Netlify Functions, usar `process.env.VARIABLE_NAME`.

### Estilización (TailwindCSS)
- Usar clases utilitarias de Tailwind. 
- Evitar crear CSS personalizado a menos que sea estrictamente necesario para animaciones complejas o directivas de configuración en `index.css`.
- Los componentes deben ser responsivos, implementando prefijos `sm:`, `md:`, `lg:` según convenga.

---

## 5. Infraestructura, DevOps y Netlify

### Netlify Functions
- Los endpoints del backend se encuentran en `/frontend/netlify/functions/`.
- **Despliegue y Rutas (netlify.toml)**: El archivo `netlify.toml` en la raíz configura el enrutamiento. 
  - Todo llamado a `/api/...` se redirige internamente a `/.netlify/functions/...` con un status 200.
  - La SPA (Single Page Application) rutea todo lo que no sea función hacia `/index.html` (comportamiento de React Router).
- **Seguridad**: El `netlify.toml` maneja estrictamente el `Content-Security-Policy` (CSP). Al agregar nuevos dominios de imágenes (ej. Cloudinary, Supabase) o fuentes, se debe actualizar la política en ese archivo.

---

## 6. Calidad, Testing (QA) y Auditoría

La calidad es un aspecto principal del proyecto y debe validarse en la carpeta `/QA/`.

- **Planes y Matrices**: Respeta las reglas dispuestas en `QA/PLAN_DE_PRUEBAS.md` y `QA/MATRIZ_CUMPLIMIENTO.md`.
- **Ejecución de Pruebas**: Cualquier script de prueba funcional y lógico debe ejecutarse utilizando `node QA/test/run-tests.js` (u otra configuración de pruebas existente que el equipo utilice).
- **Auditoría**: Acciones de modificación en la base de datos que correspondan a eventos sensibles deben seguir las prácticas de la feature `auditoria`, si corresponde.

---

## 7. Estándares de Calidad de Software (7 Pilares)

Cualquier propuesta o modificación de código debe ser auditada rigurosamente bajo los siguientes estándares:
1. **Correctitud (Correctness):** El código debe cumplir exactamente con la lógica de negocio requerida sin dejar casos límite sin manejar.
2. **Fiabilidad (Reliability):** Implementar manejo de excepciones (`try/catch`), comprobar valores nulos/indefinidos y recuperarse grácilmente de fallos.
3. **Seguridad (Security):** Sanitizar entradas, evitar inyecciones, no usar Base64 para almacenar multimedia y jamás exponer credenciales críticas (como `SERVICE_ROLE_KEY`) al frontend.
4. **Portabilidad (Portability):** Todo entorno debe parametrizarse mediante variables de entorno de Vite o Netlify, evitando rutas físicas absolutas o URLs quemadas.
5. **Mantenibilidad (Maintainability):** Aplicar SOLID, DRY (evitar duplicación) y KISS (mantenerlo simple). Nombres descriptivos y auto-explicativos.
6. **Eficiencia (Efficiency):** Minimizar re-renders en React (uso controlado de hooks de memorización) y evitar consultas N+1 a bases de datos.
7. **Usabilidad (Usabilidad de Código):** Mantener firmas de funciones y props de componentes limpias, intuitivas y bien documentadas.

---

## 8. Directrices de Arquitectura

- **Aislamiento de Features:** Quedan prohibidos los acoplamientos cruzados (*Cross-Feature imports*). Las características deben comunicarse a través de servicios globales o stores de Zustand.
- **Evaluación de Dependencias:** No agregues librerías redundantes si el problema se puede solucionar nativamente con React, Zustand, Tailwind o Supabase.

---

> **Nota para la IA:** Antes de proponer cambios, lee el contenido local de los archivos y respeta los patrones ya establecidos en este documento.
