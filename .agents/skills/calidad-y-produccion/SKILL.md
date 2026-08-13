---
name: calidad-y-produccion
description: Ejecuta pruebas de calidad (QA), corre ESLint, compila para producción y limpia la aplicación para su entrega.
---
# Habilidad: Calidad y Producción (QA, Lint, Build & Fix)

## Cuándo usar este skill
- Antes de entregar una tarea, hacer commit o publicar cambios.
- Para diagnosticar errores de sintaxis, pruebas rotas o fallos de renderizado.
- Para verificar responsividad y optimizar código.

## Inputs necesarios
1) Archivos o vistas a auditar.

## Workflow
1) **Linter:** Ejecuta `npm run lint` en el frontend y soluciona errores automáticos con `npx eslint . --fix`.
2) **Pruebas QA:** Ejecuta `node QA/test/run-tests.js` en la raíz e interpreta los fallos contrastándolos con el plan de pruebas.
3) **Compilación:** Ejecuta `npm run build` en el frontend para asegurar que compile en producción sin romper Vite.
4) **Modo Producción:** Haz una revisión final visual/funcional (rutas rotas, responsive móvil, placeholders como lorem ipsum) y aplica arreglos mínimos.

## Reglas de calidad
- Toda falla en el build o en los tests debe ser reportada y resuelta antes de marcar la tarea como lista.

## Output (formato exacto)
Devuelve siempre:
1) Resultados de las pruebas de QA y estado de ESLint.
2) Estado final de compilación del frontend.
3) Lista de correcciones menores aplicadas para dejar la app lista para publicar.
