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
- [x] **M15 — Sistema Forjamagia** — panel por ítem equipado para agregar/quitar runas, runado básico (PA, PM, Vitalidad, stats principales), visualización del impacto en el StatBlock total

### Build
- [x] **M16 — Guardar múltiples builds** — localStorage, lista de builds guardados con nombre, load/delete (ShareBar → "My Builds")
- [x] **M17 — Undo/redo básico** — Ctrl+Z / Ctrl+Shift+Z, botones ↩↪ en header, historial de 40 estados
- [x] **M18 — Export build como imagen** — screenshot del personaje con stats para compartir en redes (canvas/html2canvas)
- [ ] **M19 — OG/meta preview card** — cuando se comparte la URL, generar preview card con clase, nivel y stats top

### Hechizos
- [x] **M20 — Selector de nivel de hechizo** — botones 1-6 en header de SpellsPanel, auto-grade por nivel del build, reset ↺
- [x] **M21 — Daños calculados de hechizo** — fórmula (base+mastery)*(100+Power)/100+flat, preview inline en fila + expandido con indicador ★
- [x] **M26 — Rediseño full hechizos: imágenes + variantes** — sección aparte ancho completo, dos columnas (normales | variantes), tarjetas con imagen 48px real, AP, rango, crit%, max/turno, daños por elemento. ETL extrae 836 imágenes del tar de dofusdude, detecta variantes via spell_variants.json (44 hechizos/clase = 22 + 22)
- [x] **M27 — Ataque de arma en panel de hechizos** — tarjeta WeaponCard al tope del panel con imagen, AP, rango, crit% y daños calculados del arma equipada; puño/desarmado como fallback. ETL extrae ap_cost, crit_chance, crit_bonus, min_range, max_range del API dofusdude.
- [x] **M28 — Hechizos comunes** — sección "Common Spells" al pie del panel con los 26 hechizos aprendibles (13 normales + 13 variantes, breedId=19 en spell_variants.json). ETL detecta pares via Spell-learning scrolls (type id=198), extrae efectos correctos (omit lifesteal %, añade worst/best-element damage).
- [x] **M29 — Imágenes de runas en Forjamagia** — carpeta public/data/runes/ (52 .webp, extraídas del juego). La grilla del RuneModal muestra imágenes 3D de la runa en lugar del ícono de stat. Los chips de runas activas muestran la imagen de runa (20px). El slot equipado con runas muestra una tira de hasta 3 mini-runas (12px) en esquina inferior derecha. El botón ✦ de forjamagia muestra Signature_Rune.webp cuando tiene runas aplicadas. El tooltip de forjamagia en el slot también muestra imágenes de runa (16px, tinte azul).
- [x] **M30 — Daños críticos en panel de hechizos** — cada línea de daño muestra golpe normal y crítico (✦) en paralelo. SpellCard lee critEffects extraídos del Unity criticalEffect array. WeaponCard usa calcDamage() y añade crit_bonus al valor crítico. Fila Σ total para hechizos/armas con 2+ elementos.
- [x] **M31 — Daño de empuje en SpellCard** — hechizos con efecto de empuje muestran stats.pushbackDamage (plano) junto al texto "Empuja X celdas". Incluido en Σ total (normal + crítico). Fórmula: valor plano, no escala con crits.
- [x] **M32 — Nombres de hechizos en idioma seleccionado** — loadSpells carga EN para efectos (claves STAT_MAP) y superpone nombres del archivo de idioma destino. Mismo patrón overlay que items/sets.
- [x] **Fix — Crit de hechizos por índice** — SpellCard usaba `critDmgEffects.find(by element)` que retornaba siempre el primer efecto con ese elemento. Multi-hit del mismo elemento (ej. Flecha de Abolición 3×tierra) mostraban todos el mismo crit. Fix: map `displayIndex → critDmgEffects[dmgIdx]` rastreando índice de efecto de daño por separado.
- [x] **M33 — Efectos de robo (steal) y grupo escudo en SpellCard** — ETL detecta effectId 91-95 como `kind='steal'`; SpellCard muestra fila ♥ heal (floor(dmg/2)) con crit inline. Efectos con targetMask PB (con escudo) se separan en sección "Objetivos con escudo" con divider. Σ total solo suma grupo base (escudo es mutuamente excluyente). Dedup de efectos condicionales de estado (*e/*E) en ETL. Σ y ♥ total también actualizados para steal.
- [x] **Fix — Overflow CharacteristicsPanel** — fila de característica era ~232px mínimo en columna de 212px disponibles. Restructurado en 2 filas: fila 1 icono+nombre+valor total, fila 2 controles −/input/+/S alineados a la derecha. Botones 20px, input 40px, scroll toggle 16px.
- [x] **M34 — Crit efectivo y rango efectivo en SpellCard** — crit mostrado = min(100, spell.critChance + stats.critChance). Rango mostrado = maxRange + stats.range para hechizos no cuerpo a cuerpo. Header usa iconos de stat (PA, rango, crit) del mismo set que StatsPanel.

### UI / Polish
- [x] **M22 — Layout mobile responsive** — la grilla de 3 columnas colapsa bien en móvil (tabs o acordeón), el ItemCatalog es usable en pantalla pequeña
- [ ] **M23 — Animaciones de equip/unequip** — transición suave al equipar un ítem en el EquipmentGrid
- [x] **M24 — Tooltip de set en hover** — en el EquipmentGrid, hover sobre ítem con set → mini-card del set con piezas activas y próximo bonus
- [ ] **M25 — Búsqueda global** — barra de búsqueda en header que busca ítems, sets, hechizos a la vez

---

## Ideas futuras 💡

- Simulador de combate básico (turno a turno con un enemigo dummy)
- Importar build desde Dofus client (clipboard de stats del personaje)
- Comparar dos builds en paralelo
- Modo "tier list" de ítems por slot y nivel

- [x] **Fix — Hover persistente en tooltip de slot** — reemplazado CSS group-hover por React state + timer 250ms para que el tooltip no desaparezca al mover el mouse hacia él.

- Para las armas de y demas, tienen bonus de criticos y demas, entonces validar esa parte ya que con el mismo set:

Nosotros:

Rodillo de Mami Ayuto

5AP
1
10% (+3)
516–597
207–247
Σ
723–844
✦
726–847

Otra Plataforma:
Rodillo de Mami Ayuto
Nivel: 200
PA: 5
Distancia: 1 - 1
GC: 48%
Daño:
511 a 591
Critico:
644 a 724
Robo:
205 a 245
♥ 102 a 122
Critico:
338 a 378
♥ 169 a 189
Total:
716 a 836
♥ 102 a 122
982 a 1102
♥ 169 a 189

de una vez aprovechar para hacer mucho mejor la interfaz como la tiene la otra plataforma, ya que la nuestra es muy simple y no tiene toda la información que tiene la otra plataforma.