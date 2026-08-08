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
- [x] **M08 — Set badge en filas del ItemCatalog** — nombre del set en gris pequeño bajo el nivel del ítem
- [x] **M09 — Filtro por set en ItemCatalog** — búsqueda de set inline en la barra de filtros, filtra ítems del set seleccionado
- [x] **M10 — Vista de Set completo** — modal con todos los ítems del set, bonuses activos/inactivos, botón "Equip" por ítem
- [x] **M11 — Comparación de ítem mejorada** — delta con iconos + label coloreado, hasta 6 diffs, filtra ignorados, primero los stats conocidos
- [x] **M12 — Filtro por stat específico en ItemCatalog** — búsqueda de stat con icono + color, filtra ítems que tengan ese stat
- [x] **M13 — Slot "unequip" fácil** — botón ✕ en hover de cada slot del EquipmentGrid para desequipar sin abrir catálogo
- [x] **M16 — Guardar múltiples builds** — localStorage, lista de builds guardados con nombre, load/delete (ShareBar → "My Builds")
- [x] **M17 — Undo/redo básico** — Ctrl+Z / Ctrl+Shift+Z, botones ↩↪ en header, historial de 40 estados
- [x] **M24 — Tooltip de set en hover** — en el EquipmentGrid, hover sobre ítem con set → mini-card del set con piezas activas y próximo bonus

---

## Pendientes 🔧

### Ítems & Equipamiento
- [x] **M14 — Ítem favoritos / guardados** — estrella ★ por ítem (localStorage), filtro "★ N" en barra, `useSyncExternalStore` reactivo

### Forjamagia / Magesmithy
- [ ] **M15 — Sistema Forjamagia** — panel por ítem equipado para agregar/quitar runas, runado básico (PA, PM, Vitalidad, stats principales), visualización del impacto en el StatBlock total

### Build
- [x] **M16 — Guardar múltiples builds** — localStorage, lista de builds guardados con nombre, load/delete (ShareBar → "My Builds")
- [x] **M17 — Undo/redo básico** — Ctrl+Z / Ctrl+Shift+Z, botones ↩↪ en header, historial de 40 estados
- [ ] **M18 — Export build como imagen** — screenshot del personaje con stats para compartir en redes (canvas/html2canvas)
- [ ] **M19 — OG/meta preview card** — cuando se comparte la URL, generar preview card con clase, nivel y stats top

### Hechizos
- [x] **M20 — Selector de nivel de hechizo** — botones 1-6 en header de SpellsPanel, auto-grade por nivel del build, reset ↺
- [x] **M21 — Daños calculados de hechizo** — fórmula (base+mastery)*(100+Power)/100+flat, preview inline en fila + expandido con indicador ★

### UI / Polish
- [ ] **M22 — Layout mobile responsive** — la grilla de 3 columnas colapsa bien en móvil (tabs o acordeón), el ItemCatalog es usable en pantalla pequeña
- [ ] **M23 — Animaciones de equip/unequip** — transición suave al equipar un ítem en el EquipmentGrid
- [x] **M24 — Tooltip de set en hover** — en el EquipmentGrid, hover sobre ítem con set → mini-card del set con piezas activas y próximo bonus
- [ ] **M25 — Búsqueda global** — barra de búsqueda en header que busca ítems, sets, hechizos a la vez

---

## Ideas futuras 💡

- Simulador de combate básico (turno a turno con un enemigo dummy)
- Importar build desde Dofus client (clipboard de stats del personaje)
- Comparar dos builds en paralelo
- Modo "tier list" de ítems por slot y nivel
