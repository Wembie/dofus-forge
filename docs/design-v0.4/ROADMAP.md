# Roadmap de diseño e implementación — 0.4.0

La versión 0.4.0 se publica cuando la migración completa pase sus criterios, no al terminar una lámina. Esta entrega corresponde a la fase de diseño y al prototipo del constructor.

| Fase | Estado | Entregable | Criterio de salida |
|---|---|---|---|
| D0 · Inventario | Inventario y contratos revisados | 290 fuentes inventariadas; 94 TSX y 495 nodos con eventos/destinos; auditoría de datos, controles y Forjadora | Completar comprobación manual de estados secundarios y autenticados |
| D1 · Identidad | Propuesta creada | Sello vectorial, exploración de marca, paleta, tipografía | Validar símbolo a 16/24/32 px, temas y exportaciones |
| D2 · Biblioteca | Base creada | 67 variables, 8 estilos, 44 variantes | Completar componentes de dominio, tema Tinta y pruebas visuales |
| D3 · Experiencia | En curso | 14 pantallas en Figma; revisión local 3 con visor, store/historial del producto, Forjadora funcional y ficha agrupada | Sincronizar Figma con el prototipo; validar pantallas y estados |
| D4 · Validación con personas | Pendiente | Tareas en móvil/escritorio, observaciones y ajustes | Resolver errores críticos de orientación y lectura |
| I1 · Fundamentos en producto | Pendiente | Tokens, fuentes locales, marca, foco, temas, UI base | Consistencia de componentes e i18n sin cambiar cálculos |
| I2 · Constructor | Pendiente | Visor central + equipo + ficha + navegación móvil | Personaje preservado, 17 espacios, 73 campos, sin scroll en ficha de referencia |
| I3 · Decisiones de equipo | Pendiente | Catálogo, runas, panoplias, características, hechizos, pasivos, comparación | Paridad funcional y teclado/toque en todos los flujos |
| I4 · Forjadora | Pendiente | Configuración, progreso/cancelación, resultados y explicación | Conservar restricciones, runas y aplicación atómica reversible |
| I5 · Comunidad y contenido | Pendiente | Explorar, detalle, colecciones, perfiles, guías y conjuntos | Todas las 19 rutas migradas, estados y cuatro idiomas |
| I6 · Cuenta y operaciones | Pendiente | Auth, cuenta, moderación, notificaciones, administración | Paridad de permisos y errores recuperables |
| R0 · Lanzamiento | Pendiente | QA, capturas, changelog, versión y publicación | Criterios de release completos |

## Secuencia técnica

1. Crear adaptador de tokens hacia los nombres actuales de CSS. Mantenerlo temporalmente para migrar por componente; retirar alias al cerrar todas las rutas.
2. Migrar `src/ui` y shell compartido. Sustituir logo mediante `src/data/brand.ts`; preparar favicons, OG y exportación en los cuatro idiomas.
3. Extraer la composición de `EquipmentGrid` sin alterar `buildStore`. Mantener un visor activo y sus monturas/mascotas. Slots y canvas conservan identidad al cambiar el viewport.
4. Crear `StatsOverview` y `StatsSheet` como consumidores de `StatBlock`. Compartir descriptor de estadísticas con comparación y exportaciones; no duplicar etiquetas ni fórmulas.
5. Reorganizar navegación móvil y catálogo. Conservar virtualización y carga de datos existente. Los prototipos estáticos de Figma no reemplazan este trabajo.
6. Integrar los flujos de la matriz, uno por cambio revisable. Mantener undo/redo, enlaces, SSR/prerender y variantes de idioma.
7. Crear y validar Code Connect cuando las interfaces definitivas de componentes existan. Los IDs de Figma registrados hoy no equivalen a un mapeo publicado.
8. Probar todas las rutas y estados. Actualizar `VERSION`, `package.json` y ambos changelogs únicamente al preparar la release real.

## Bloqueo de Figma y continuación

El límite de llamadas Starter impidió la última auditoría visual y el cambio del personaje central. Pendientes concretos:

- Reemplazar el constructor `3:861` y el móvil `3:1383` por la composición actual `prototype/`; usar su paleta y tipografía revisadas.
- Ajustar el catálogo y sus enlaces de móvil para permanecer dentro del flujo móvil.
- Revisar alturas de Forjadora, tabla de comparación, build pública, guía y ficha completa; los frames no cuentan con revisión final.
- Corregir los colores elementales oscuros para mantener distinción semántica.
- Alinear cifras ilustrativas entre las pantallas o capturar valores calculados del prototipo.
- Añadir componentes completos de objeto, etapa del personaje, navegación, selector, panoplia, hechizo, tooltip, diálogo y notificación.
- Crear specimen de variantes, verificar bindings y exportar capturas finales.

## Criterios de release

- [ ] Personaje, animaciones, efectos, ocho orientaciones, mascotas/monturas y fallback conservados.
- [ ] Todas las rutas de `COVERAGE.md` migradas, incluidos accesos restringidos.
- [ ] Los 73 campos actuales y cualquier nuevo campo del motor tienen representación; nunca se omiten efectos desconocidos.
- [ ] Ficha completa sin scroll a 1366×900 y 1440×900; reflow accesible a tamaños menores y zoom.
- [ ] Control de equipo accesible por teclado y toque, nombres completos y contextos persistentes.
- [ ] Contraste AA medido, foco visible, formularios móviles 16 px y áreas táctiles 44 px.
- [ ] Cuatro idiomas completos, texto largo y formatos numéricos locales.
- [ ] Motor, pasivos, condiciones, equipo y optimizador con regresiones existentes en verde.
- [ ] Carga inicial y coste del visor medidos respecto a la versión anterior; recursos del juego sin duplicación innecesaria.
- [ ] Marca y exportaciones terminadas, metadatos y páginas legales conservados.
- [ ] QA de Figma y validación con personas completadas.
