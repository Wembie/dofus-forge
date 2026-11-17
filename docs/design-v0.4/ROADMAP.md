# Roadmap de diseño e implementación — 0.4.0

La versión 0.4.0 se publica cuando la migración completa pase sus criterios, no al terminar una lámina. Esta entrega corresponde a la fase de diseño y al prototipo del constructor.

| Fase | Estado | Entregable | Criterio de salida |
|---|---|---|---|
| D0 · Inventario | Inventario y contratos revisados | 290 fuentes inventariadas; 94 TSX y 495 nodos con eventos/destinos; auditoría de datos, controles y Forjadora | Completar comprobación manual de estados secundarios y autenticados |
| D1 · Identidad | Propuesta creada | Sello vectorial, exploración de marca, paleta, tipografía | Validar símbolo a 16/24/32 px, temas y exportaciones |
| D2 · Biblioteca | Base creada | 67 variables, 8 estilos, 44 variantes | Completar componentes de dominio, tema Tinta y pruebas visuales |
| D3 · Experiencia | En curso | Estudio local: taller, 19 rutas, 36 diálogos y 6 estados de vista sobre el store, el motor y la Forjadora del producto. Figma: 14 pantallas anteriores a esta revisión | Rediseñar las herramientas del taller que siguen en adaptación provisional (tabla siguiente); sincronizar Figma; validar pantallas y estados |
| D4 · Validación con personas | Pendiente | Tareas en móvil/escritorio, observaciones y ajustes | Resolver errores críticos de orientación y lectura |
| I1 · Fundamentos en producto | Pendiente | Tokens, fuentes locales, marca, foco, temas, UI base | Consistencia de componentes e i18n sin cambiar cálculos |
| I2 · Constructor | Pendiente | Visor central + equipo + ficha + navegación móvil | Personaje preservado, 17 espacios, 73 campos, sin scroll en ficha de referencia |
| I3 · Decisiones de equipo | Pendiente | Catálogo, runas, panoplias, características, hechizos, pasivos, comparación | Paridad funcional y teclado/toque en todos los flujos |
| I4 · Forjadora | Pendiente | Configuración, progreso/cancelación, resultados y explicación | Conservar restricciones, runas y aplicación atómica reversible |
| I5 · Comunidad y contenido | Pendiente | Explorar, detalle, colecciones, perfiles, guías y conjuntos | Todas las 19 rutas migradas, estados y cuatro idiomas |
| I6 · Cuenta y operaciones | Pendiente | Auth, cuenta, moderación, notificaciones, administración | Paridad de permisos y errores recuperables |
| R0 · Lanzamiento | Pendiente | QA, capturas, changelog, versión y publicación | Criterios de release completos |

## Estado del estudio local

«Rediseñado» significa composición nueva en el estudio que consume las reglas del producto. «Adaptación provisional» significa el componente de producción dentro del diálogo nuevo, con sus estilos adaptados: funciona, pero su estructura todavía es la anterior y no cuenta como diseño terminado.

| Superficie | Estado | Archivo del estudio |
|---|---|---|
| Taller: personaje, equipo, resumen y ficha de 73 campos | Rediseñado | `prototype/main.tsx` |
| Catálogo de objetos | Rediseñado | `prototype/Catalog.tsx` |
| Panoplias | Rediseñado con las funciones de producción: buscar, filtrar por nivel y piezas, ordenar, ver bonificaciones por tramo, equipar la panoplia entera en un paso, equipar o quitar una pieza suelta y abrir la página de la panoplia. Añade dónde va cada pieza y el cambio en la build | `prototype/Sets.tsx` |
| Compartir y exportar | Rediseñado | `prototype/SharePanel.tsx` |
| La Forjadora | Recompuesta, no rediseñada: el marco, el orden (objetivos primero, reglas al lado) y la navegación interna son nuevos; las tarjetas de objetivo, las reglas y las tarjetas de resultado siguen siendo `OptimizerModal` de producción con estilos adaptados | `prototype/ForgeModal.tsx`, `prototype/forge.css` |
| Tarjeta de build (Explorar, Mis builds, perfil, colección) | Rediseñado | `prototype/BuildSheet.tsx` |
| 19 rutas y 36 diálogos de cuenta, comunidad y administración | Rediseñado con ejemplos locales | `prototype/surfaces.tsx`, `prototype/SurfaceDialogs.tsx` |
| Distribuir características | Rediseñado con las funciones de producción: −/+ de uno en uno que repiten al mantener (Mayús ×5, Ctrl ×20), valor escrito, pergaminos uno a uno o todos, potencia y lo que suman los pasivos en vista de combate. Añade «Máx.» por característica | `prototype/Characteristics.tsx` |
| Forjamagia (runas y trascendencia) | Rediseñado con las funciones de producción: runas por sección con búsqueda, cantidades rápidas por tipo, valor libre ±1 que se suma a lo que ya lleva, quitar una o todas, runa de trascendencia con rangos permitidos o bloqueados por el peso de la línea, transformación elemental del arma (elemento y proporción, solo con daño neutro) y firma del forjamago. Reglas en `src/features/equipment/runeRules.ts` | `prototype/Runes.tsx` |
| Paleta de acciones (Ctrl+K) y acciones de la cabecera del taller | Rediseñado con las funciones de producción: las mismas acciones (herramientas, deshacer y rehacer, publicar, empezar de nuevo, páginas, administración solo para admins, preferencias, tema y sonido), búsqueda sin acentos, teclado y acciones no disponibles visibles. Agrupadas por tipo y abribles con un botón, también en móvil. La cabecera del taller recupera Rehacer, Publicar y Preferencias, que faltaban | `prototype/Palette.tsx` |
| Hechizos y arma | Rediseñado con las funciones de producción: grado automático o manual, filtro por elemento, ataque con arma (transformación, crítico y su bonus, dominio del arma con potencia normal y en crítico, robo con su cura, retirada de PM, total), y por hechizo: PA, alcance con el bonus de la build, crítico, usos por turno, filas normal y crítico con desglose al pasar el cursor, cura por robo, descarga, veneno, cargas, empuje con colisión, totales, grupos por condición, efectos de estado, efectos de tu equipo y descripción. Cada hechizo aparece junto a su variante. Reglas en `src/features/spells/spellView.ts` | `prototype/Spells.tsx` |
| Pasivos de combate y selector Equipo / En combate | Rediseñado con las funciones de producción, incluido el número de pasivos activos en el selector | `prototype/Passives.tsx` |
| Simular un combate | Rediseñado con todas las funciones de producción: resistencias del objetivo, tabla de daño normal y crítico de cada ataque, probabilidad de crítico y tirada de un golpe al azar | `prototype/Combat.tsx` |
| Comparar dos builds | Rediseñado con todas las funciones de producción: radar, barra enfrentada por estadística, piezas distintas, referencia desde builds de la cuenta, guardadas en el dispositivo, enlace `?b=`, enlace de build publicada o código, y enlace para compartir la comparación. Añade fijar la build actual como referencia y «Solo diferencias» | `prototype/Compare.tsx` |
| Bonificaciones de panoplia | Rediseñado con las funciones de producción, incluida abrir cada panoplia desde su sección. Añade el tramo siguiente y un estado vacío | `prototype/SetBonuses.tsx` |
| Novedades | Rediseñado; se abre desde el pie del taller | `prototype/SetBonuses.tsx` |
| Detalle de panoplia abierto desde un objeto o una página de panoplia | Rediseñado; abre Panoplias en esa panoplia | `prototype/Sets.tsx` |

Comprobaciones con el servidor del estudio abierto: `check-prototype`, `check-forge`, `check-workspace`, `check-design-flows` y `check-surfaces` (ambos temas) terminan sin desbordamiento, errores de JavaScript ni infracciones automáticas de accesibilidad. Solo cubren 1440×900 y 390×844 salvo `check-prototype`, que cubre cinco tamaños. `check-workspace --mineral` pasa: todas las herramientas del taller cumplen contraste en ambos temas.

### Prerrequisitos para terminar el rediseño

Las herramientas que siguen en adaptación provisional dependen de reglas que hoy viven dentro de componentes de producción. El estudio no las reescribe: duplicar reglas del juego contradice el contrato de `UX-SPEC.md`. Hace falta exportarlas sin cambiar su comportamiento (un `refactor` en `src/`, sin versión ni changelog):

| Regla | Dónde está | Desbloquea |
|---|---|---|
| Modelo de vista de la Forjadora: objetivos, reglas y resultados | `OptimizerModal.tsx` | Rediseño real de la Forjadora |

Regla de trabajo: el rediseño no quita funciones; solo cambia cómo se presentan. Para cumplirla sin tocar `src/`, cuatro piezas pequeñas están repetidas en el estudio tal como las escribe producción y deben exportarse al migrar en lugar de copiarse: el filtro de ataques que golpean a un objetivo sin condición y el crítico efectivo de un ataque (`Combat.tsx`, de `PvpArena`); la lectura de enlaces de build y el armado del enlace de comparación (`Compare.tsx`, de `ComparePanel`); y el encuadre de la escena del personaje con mascota o montura (`BuildSheet.tsx`, de `CharacterStage`).

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
