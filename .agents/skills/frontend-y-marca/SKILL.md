---
name: frontend-y-marca
description: Diseña interfaces, crea nuevas features y redacta copys consistentes con la marca de Control Financiero.
---
# Habilidad: Frontend y Marca (FSD & Diseño)

## Cuándo usar este skill
- Al maquetar nuevas interfaces de usuario, componentes de React o vistas completas.
- Cuando el usuario solicite crear una nueva Feature en el frontend.
- Al redactar textos visuales (titulares, botones, modales, alertas, CTAs).

## Inputs necesarios
1) Nombre de la Feature a crear (si aplica).
2) Objetivo de la pantalla o elemento visual.

## Workflow
1) **Definición Estructural:** Si es una nueva Feature, crea las subcarpetas obligatorias: `api/`, `components/`, `hooks/`, `pages/`, `types/` en `frontend/src/features/[nombre]`.
2) **Consistencia de Estilos:** Lee `recursos/estilo-visual.json` para aplicar la paleta (recuerda que en este proyecto la clase `blue` de Tailwind pinta verde financiero) y espaciados correctos.
3) **Tono de Comunicación:** Lee `recursos/guia-de-textos.md` para redactar copys e interfaces claras, humanas y cortas en español.
4) **Responsividad y UX:** Aplica prefijos responsivos en Tailwind y asegura que los botones tengan cursores correctos.

## Reglas de calidad
- Soporta siempre modo oscuro usando la clase `.dark`.
- Mantén el aislamiento absoluto de features (nada de Cross-Feature imports).

## Output (formato exacto)
Devuelve siempre:
1) Lista de componentes creados y su estructura de archivos.
2) Explicación del copy utilizado en base a la guía de textos.
