# Dofus Forge — Roadmap / MVPs

Track de mejoras UX/UI, fidelidad al juego y nuevas features.
Marcar con `[x]` cuando se complete.

---

## Completados ✅

- [x] **M01 — Iconos reales de stats** en CharacteristicsPanel (mapping correcto de IDs de imagen)
- [x] **M02 — CharacteristicsPanel rediseño game-faithful** — iconos reales, totales calculados junto a controles +/−, budget bar, sección de combat stats colapsable con tabla de elemento DMG|RES|RES%
- [x] **M03 — StatsPanel (columna derecha) rediseño game-faithful** — badges HP/AP/MP/Rango, tabla elemental DMG|RES|RES%, grid de stats de combate, secciones de steal y modificadores % (ocultas si son cero)
- [x] **M04 — ItemCatalog: stats con iconos y colores** — filtrado por `isIgnored()`, `fmtValue()` correcto (sin "80-0" ni "Exchangeable:")
- [x] **M05 — EquipmentGrid tooltip con stats** — hasta 12 stats con icono 12px + valor coloreado + label
- [x] **M06 — Filtros de elemento con nombre característica** — muestran "Fuerza/Inteligencia/Suerte/Agilidad" con icono en vez de "Tierra/Fuego/Agua/Aire"
- [x] **M07 — SetBonusesPanel** — panel de sets activos al pie de StatsPanel con progreso X/maxPiezas y bonuses por tier (activo/inactivo)

---

## Pendientes 🔧

### Sets
- [ ] **M08 — Set badge en filas del ItemCatalog** — mostrar nombre del set en gris pequeño bajo el nivel del ítem si pertenece a un set
- [ ] **M09 — Filtro por set en ItemCatalog** — botón "Set" en filtros, dropdown/search de sets, mostrar solo ítems de ese set
- [ ] **M10 — Vista de Set completo** — click en nombre del set en SetBonusesPanel → modal con todos los ítems del set, botón "equipar pieza" por slot, progreso visual

### Ítems & Equipamiento
- [ ] **M11 — Comparación de ítem mejorada** — en vez de solo delta vs equipado, overlay side-by-side con ítem actual vs candidato (todos los stats, no solo diferencias)
- [ ] **M12 — Filtro por stat específico en ItemCatalog** — buscar ítems que tengan X stat (ej: "Vitalidad > 100")
- [ ] **M13 — Slot "unequip" fácil** — botón ✕ en cada slot del EquipmentGrid para desequipar sin abrir el catálogo
- [ ] **M14 — Ítem favoritos / guardados** — marcar ítems como favoritos (localStorage), filtrar por favoritos en el catálogo

### Forjamagia / Magesmithy
- [ ] **M15 — Sistema Forjamagia** — panel por ítem equipado para agregar/quitar runas, runado básico (PA, PM, Vitalidad, stats principales), visualización del impacto en el StatBlock total

### Build
- [ ] **M16 — Guardar múltiples builds** — localStorage, lista de builds guardados con nombre, load/delete/duplicate
- [ ] **M17 — Undo/redo básico** — deshacer últimas acciones de equipamiento y asignación de puntos
- [ ] **M18 — Export build como imagen** — screenshot del personaje con stats para compartir en redes (canvas/html2canvas)
- [ ] **M19 — OG/meta preview card** — cuando se comparte la URL, generar preview card con clase, nivel y stats top

### Hechizos
- [ ] **M20 — Selector de nivel de hechizo** — en SpellsPanel, elegir nivel 1-6 por hechizo, ver daño calculado con los stats actuales del build
- [ ] **M21 — Daños calculados de hechizo** — mostrar daño estimado (mín/máx) por elemento según características allocadas + equipo

### UI / Polish
- [ ] **M22 — Layout mobile responsive** — la grilla de 3 columnas colapsa bien en móvil (tabs o acordeón), el ItemCatalog es usable en pantalla pequeña
- [ ] **M23 — Animaciones de equip/unequip** — transición suave al equipar un ítem en el EquipmentGrid
- [ ] **M24 — Tooltip de set en hover** — en el EquipmentGrid, hover sobre ítem con set → mini-card del set con piezas activas
- [ ] **M25 — Búsqueda global** — barra de búsqueda en header que busca ítems, sets, hechizos a la vez

---

## Ideas futuras 💡

- Simulador de combate básico (turno a turno con un enemigo dummy)
- Importar build desde Dofus client (clipboard de stats del personaje)
- Comparar dos builds en paralelo
- Modo "tier list" de ítems por slot y nivel
