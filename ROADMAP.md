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
- [x] **M14 — Ítem favoritos / guardados** — estrella ★ por ítem (localStorage), filtro "★ N" en barra, `useSyncExternalStore` reactivo
- [x] **M15 — Sistema Forjamagia** — panel por ítem equipado para agregar/quitar runas, runado básico (PA, PM, Vitalidad, stats principales), visualización del impacto en el StatBlock total
- [x] **M16 — Guardar múltiples builds** — localStorage, lista de builds guardados con nombre, load/delete (ShareBar → "My Builds")
- [x] **M17 — Undo/redo básico** — Ctrl+Z / Ctrl+Shift+Z, botones ↩↪ en header, historial de 40 estados
- [x] **M18 — Export build como imagen** — screenshot del personaje con stats para compartir en redes (canvas/html2canvas)
- [x] **M20 — Selector de nivel de hechizo** — botones 1-6 en header de SpellsPanel, auto-grade por nivel del build, reset ↺
- [x] **M21 — Daños calculados de hechizo** — fórmula (base+mastery)*(100+Power)/100+flat, preview inline en fila + expandido con indicador ★
- [x] **M22 — Layout mobile responsive** — grilla de equipamiento sin character center en móvil, layout 5-columnas compacto, ShareBar solo iconos, undo/redo/optimizer/compare ocultos en pantallas pequeñas; viewport minimum-scale=1 evita zoom-out
- [x] **M24 — Tooltip de set en hover** — en el EquipmentGrid, hover sobre ítem con set → mini-card del set con piezas activas y próximo bonus
- [x] **M26 — Rediseño full hechizos: imágenes + variantes** — sección aparte ancho completo, dos columnas (normales | variantes), tarjetas con imagen 48px real, AP, rango, crit%, max/turno, daños por elemento. ETL extrae 836 imágenes del tar de dofusdude, detecta variantes via spell_variants.json (44 hechizos/clase = 22 + 22)
- [x] **M27 — Ataque de arma en panel de hechizos** — tarjeta WeaponCard al tope del panel con imagen, AP, rango, crit% y daños calculados del arma equipada; puño/desarmado como fallback. ETL extrae ap_cost, crit_chance, crit_bonus, min_range, max_range del API dofusdude.
- [x] **M28 — Hechizos comunes** — sección "Common Spells" al pie del panel con los 26 hechizos aprendibles (13 normales + 13 variantes, breedId=19 en spell_variants.json). ETL detecta pares via Spell-learning scrolls (type id=198), extrae efectos correctos (omit lifesteal %, añade worst/best-element damage).
- [x] **M29 — Imágenes de runas en Forjamagia** — carpeta public/data/runes/ (52 .webp, extraídas del juego). La grilla del RuneModal muestra imágenes 3D de la runa en lugar del ícono de stat. Los chips de runas activas muestran la imagen de runa (20px). El slot equipado con runas muestra una tira de hasta 3 mini-runas en esquina superior-derecha. El botón ✦ de forjamagia muestra Signature_Rune.webp cuando tiene runas aplicadas.
- [x] **M30 — Daños críticos en panel de hechizos** — cada línea de daño muestra golpe normal y crítico (✦) en paralelo. SpellCard lee critEffects extraídos del Unity criticalEffect array. WeaponCard usa calcDamage() y añade crit_bonus al valor crítico. Fila Σ total para hechizos/armas con 2+ elementos.
- [x] **M31 — Daño de empuje en SpellCard** — hechizos con efecto de empuje muestran stats.pushbackDamage (plano) junto al texto "Empuja X celdas". Incluido en Σ total (normal + crítico).
- [x] **M32 — Nombres de hechizos en idioma seleccionado** — loadSpells carga EN para efectos (claves STAT_MAP) y superpone nombres del archivo de idioma destino.
- [x] **M33 — Efectos de robo (steal) y grupo escudo en SpellCard** — ETL detecta effectId 91-95 como `kind='steal'`; SpellCard muestra fila ♥ heal (floor(dmg/2)) con crit inline. Efectos con targetMask PB (con escudo) se separan en sección "Objetivos con escudo".
- [x] **M34 — Crit efectivo y rango efectivo en SpellCard** — crit mostrado = min(100, spell.critChance + stats.critChance). Rango mostrado = maxRange + stats.range para hechizos no cuerpo a cuerpo.
- [x] **M35 — Reconstrucción visual completa** — JetBrains Mono para números, badges AP/MP/HP dominantes, secciones gold-accent en StatsPanel, slots 80px, retrato 130px, CharacterCenter con nivel visible, header atmosférico, tokens de rareza, gradiente triple, keyframes stat-tick/slot-equip/float-delta
- [x] **M42 — Build Optimizer / "La Forjadora"** — algoritmo greedy por slot + beam search en Web Worker. Panel con sliders de peso por stat, constraints PA/PM/nivel, bloqueo de slots, top 3 builds sugeridos con preview de ítems + stats + botón "Cargar".
- [x] **Comparar dos builds en paralelo** — ComparePanel debajo del grid principal, toggle en header (oculto en móvil)

### Fixes completados
- [x] **Fix — Hover persistente en tooltip de slot** — reemplazado CSS group-hover por React state + timer 250ms
- [x] **Fix — Crit de hechizos por índice** — SpellCard rastreaba `dmgIdx` para emparejar critDmgEffects correctamente; multi-hit del mismo elemento ya no muestra el mismo crit
- [x] **Fix — Overflow CharacteristicsPanel** — reestructurado en 2 filas: icono+nombre+valor / controles −/input/+/S
- [x] **Fix — Revertir CharacterViewer** — vuelto a retrato estático local; brand clickeable = reset build
- [x] **Fix — Stats base incorrectas** — Prospección base 100, Invocaciones base 1; daño elemental lowercase mapeado correctamente
- [x] **Fix — Montura/Compañero vacíos en idioma no inglés** — ETL usa tipo EN canónico para type+slot
- [x] **Fix — Forjamagia transformación elemental de arma** — RuneModal sección "Transformación Elemental" con pociones y ratios 85%/68%/50%; WeaponCard refleja daño transformado; URL preserva transform en `wt`
- [x] **Fix — Overcap RES%** — badge `▲N` en dorado cuando resistencia % supera cap 50%
- [x] **Fix — Arma AP cost** — eid=179 añadido a WEAPON_ATTACK_IDS; ya no reduce PA del personaje
- [x] **Fix — Runas: presets por tipo** — % resistencia → [1,2,3,4,5]; PA/PM/AL → [1]; % daños (hechizo/arma/cuerpo/distancia) → [1,2,3,4,5]; % crítico → [1,2,3,4,5]
- [x] **Fix — Runas: set completo** — 15 runas faltantes agregadas (PA/PM Parry, % Daño Hechizo/Arma/Cuerpo/Distancia, % Res Cuerpo/Distancia, Daño Empuje/Resistencia, Daño Trampa, Poder Trampa, Invocaciones, Pods, DMG Reflejo); grilla del RuneModal organizada en 4 secciones: Primarias / Daños / Resistencias / % Resistencias / Secundarias
- [x] **Fix — Runas se limpian al cambiar ítem** — `equipItem` y `unequipItem` borran runes/forjamagoName/weaponTransform del slot; ítem nuevo = slot sin forjamagia
- [x] **Fix — Badge de runas en slot** — mini-iconos reposicionados al corner superior-derecho del slot (overlay interno); antes usaban `left: px+2` que se perdía fuera de celdas de grid
- [x] **Fix — Scroll-all en características** — botón "Todos/All" en header de ScrollToggles activa/desactiva los 6 scrolls a la vez
- [x] **Fix — Input de asignación no hace commit mid-type** — `commitInput` solo en blur/Enter, no en onChange; evita saltos al escribir valores
- [x] **Fix — Cuando se le da click al logo Dofus Forge, volver al inicio** — reset build + clearHistory
- [x] **Fix — Foto de personajes** — vuelto al retrato estático local (data/classes/{id}.png)

---

## Pendientes 🔧

### Forjamagia
- [ ] **M36 — Sugerir elemento óptimo para transform de arma** — en WeaponCard, calcular daño 85% neutro para cada elemento con maestría actual y resaltar cuál conviene más
- [ ] **M37 — Catálogo: filtrar armas transformables** — toggle "solo armas con daño neutro" en filtros del catálogo
- [ ] **M38 — Tabla comparativa de transforms** — en RuneModal/WeaponCard, mini-tabla con resultado de 4 pociones × 3 ratios simultáneamente

### Build / Share
- [ ] **M19 — OG/meta preview card** — cuando se comparte la URL, generar preview card con clase, nivel y stats top (requiere cambio de hash-routing a query-param + Cloudflare Worker)
- [ ] **M39 — Exportar/importar build JSON** — alternativa al URL base64, archivo .json descargable/cargable

### UI / Polish
- [ ] **M23 — Animaciones de equip/unequip** — transición suave al equipar un ítem en el EquipmentGrid
- [ ] **M25 — Búsqueda global** — barra de búsqueda en header que busca ítems, sets, hechizos a la vez
- [ ] **M41 — Fashionista (transmogrificación cosmética)** — por cada slot, elegir ítem diferente solo para apariencia visual (imagen + nombre), sin afectar stats; exportable

### Optimizer
- [ ] **M40 — Simulador PvP básico** — ingresar resistencias fijas/% de un enemigo dummy y ver daño real del build contra él
- [ ] **M43 — Optimizer: diversidad real en los 3 resultados** — penalizar ítems del build #1 y re-correr beam search para que #2 y #3 sean genuinamente distintos
- [ ] **M44 — Optimizer: progreso slot-por-slot en barra** — mostrar qué slot se está procesando ("Optimizando: Sombrero…"); Web Worker ya emite eventos de progreso
- [ ] **M45 — Optimizer: constraint de pods** — limitar builds que excedan capacidad de carga del personaje
- [ ] **M46 — Optimizer: algoritmos especializados** — motor de clase profesional: multi-start greedy, branch & bound, algoritmo genético, constraint propagation; arquitectura `src/engine/optimizer/` por módulo
