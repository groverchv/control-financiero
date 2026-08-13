# Reglas técnicas
Objetivo: mantener consistencia tecnológica y evitar mezclar frameworks no soportados.

- **Framework Core**: React 19 (JavaScript JSX).
- **Enrutamiento**: React Router v7.
- **Mapeo de Estilos**: TailwindCSS v3 (a través de utilidades CSS en clases del markup).
- **Gestión de Estado**: Zustand (`authStore.js` para la sesión y estado global).
- **Iconografía**: Lucide React.
- **Herramientas de exportación**: JSPDF / XLSX (SheetJS).
- **No Permitido**: Bootstrap, Material UI, jQuery u otras librerías que dupliquen funcionalidad del stack core.
