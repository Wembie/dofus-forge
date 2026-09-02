# Changelog

All notable changes to Dofus Forge are documented here.  
Game version is read automatically from `public/data/version.json` (currently **3.6.10.11**).

---

## [0.2.105] — 2026-09-02
- Polish: removed "unofficial" label from footer disclaimer, export card watermark, and all 4 locale strings; replaced with neutral Ankama attribution
- Docs: full README rewrite — feature list, tech table, clean presentation; removed GitHub Pages mentions

## [0.2.104] — 2026-09-02
- Fix: weapon attack effects now correctly classified — added id=233 (Steals MP per hit), id=238 (MP steal on attack, stat='MP' negative), and id=261 (Fire heals weapon attack) to WEAPON_ATTACK_IDS; these were previously appearing under EFECTOS instead of ATAQUE DE ARMA
- Fix: item tooltip in EquipmentGrid and SetDetailModal now has max-height (min(82vh, 640px)) with overflow-y scroll — tall items like high-level weapons no longer clip effects at viewport bottom (e.g. Wisdom and Fire Damage were not visible)

## [0.2.103] — 2026-09-02
- Redesign: RuneModal add-controls (rune picker → selected rune + quick values + qty input + Add button) are now in a fixed panel above the scrollable area — always visible without scrolling; rune grid, active runes, weapon transform, and forjamago signature remain in the scroll
- Add: "Clear all runes" button in the active runes header row — removes all magesmithy runes for the slot at once

## [0.2.102] — 2026-09-02
- Fix: Range badge now shows overcap indicator (▲N) when range exceeds the cap of 6 — same behavior as AP (cap 12) and MP (cap 6); added rangeRaw to StatBlock and computed pre-cap raw value in stats engine
## [0.2.101] — 2026-09-02
- Fix: Range badge in StatsPanel now shows '+' prefix (e.g. '+1' instead of '1') — Range is a pure item bonus, not a base stat like AP/MP

## [0.2.100] — 2026-09-02
- Feat: item tooltip now shows CONDICIONES section — requirements like "Strength > 249" listed with stat icon and color; extracted from DofusDude API conditions tree and saved per-item in normalized data; visible in both slot hover tooltip and SetDetailModal item hover tooltip
- Fix: stat values in item tooltip now show "+" prefix for positive values (e.g. "+1 Range", "+1 MP", "+351–400 Vitality") — replaced raw number display with fmtValue() in both StatLine components

## [0.2.99] — 2026-09-01
- Feat: ItemCatalog "Ver Set" now opens the full SetDetailModal — replaced the old basic local set modal (basic list, no progress bar, no equip-all, no hover tooltips) with the proper SetDetailModal component used everywhere else; removed ~180 lines of duplicate code

## [0.2.98] — 2026-09-01
- UX: set name in slot tooltip is now a clickable link — clicking the blue "Set de X" text in the item tooltip opens the SetDetailModal for that set; removed the separate Eye button since the set name covers that action; tooltip stays pointer-events-none except for that specific button

## [0.2.97] — 2026-09-01
- Feat: hover tooltip in SetDetailModal — hovering any item row now shows the full item tooltip (name, level, ability, weapon attacks, all stats, lore) via a fixed-position portal that escapes the modal's overflow-y:auto clip; auto-positions right or left based on available screen space

## [0.2.96] — 2026-09-01
- UX: CharacteristicsPanel split into two groups — Vitality/Wisdom (top, no power), then a Power divider badge, then Strength/Intelligence/Chance/Agility showing base | +power | =effective when power > 0; divider renders as an inline chip with gold glow when power is active

## [0.2.95] — 2026-09-01
- Feat: drag & drop between compatible slots — drag an equipped item to any slot of the same type (ring1↔ring2, dofus1–dofus6) to swap or move it; runes, forjamago name and weapon transform travel with the item; drag-over target highlights with a gold glow; cursor changes to grab during drag

## [0.2.94] — 2026-08-31
- Fix: rune badge (mini rune icons on slot) now renders inside the slot top-right corner — was placed to the right of the slot using a fixed pixel offset that broke in grid layouts where cells are wider than the slot button, causing the badge to be clipped or misaligned

## [0.2.93] — 2026-08-31
- Fix: equipping or unequipping an item now clears all runes, forjamago name and weapon transform for that slot — rune data from a previous item no longer carries over to the new one

## [0.2.92] — 2026-08-31
- UX: RuneModal resistance section split into two labeled rows — "Resistencias" (flat: 5 elemental + Crit + Push) and "% Resistencias" (% elemental + % Melee + % Ranged); clean visual separation of flat vs percentage runes

## [0.2.91] — 2026-08-31
- Fix: Summons moved to Primarias section in RuneModal (was in Secundarias)
- UX: RuneModal wider (640px max) with auto-fill column grid — desktop shows ~8 runes per row, mobile keeps 5 columns

## [0.2.90] — 2026-08-31
- Feat: RuneModal — 15 missing runes added (AP/MP Parry, % Spell/Weapon/Melee/Ranged Damage, % Melee/Ranged Resistance, Pushback Damage/Resistance, Trap Damage, Power (traps), Summons, Pod, reflected damage)
- Feat: RuneModal — rune picker reorganized into 4 labeled sections: Primarias / Daños / Resistencias / Secundarias; 5-column grid per section replaces flat 7-column grid
- Fix: % damage runes (Spell/Weapon/Melee/Ranged) now use [1,2,3,4,5] quick-value presets like % resistance runes; % Critical also corrected to [1,2,3,4,5]

## [0.2.89] — 2026-08-31
- Feat: full mobile responsiveness — flat equipment grid (no character center on mobile), compact 5-column slot layout, icon-only ShareBar, hidden undo/redo/optimizer/compare on small screens
- Fix: unequip × always visible on touch devices (hover-only before); rune button visible when active on mobile
- Fix: viewport minimum-scale=1 prevents browser zoom-out on overflow; body overflow-x hidden; iOS auto-zoom on inputs prevented

## [0.2.88] — 2026-08-31
- Feat: "All" button in ScrollToggles activates/deactivates all 6 characteristic scrolls at once — gold when all active, neutral when any is inactive
- Fix: allocation input no longer commits on every keystroke — typing in the +/- field now only applies on blur or Enter, preventing mid-type jumps

## [0.2.87] — 2026-08-28
- Fix: weapon AP cost (effect_id=179) no longer applied as character stat — weapons like Mekstagob Spade had -1 AP in their attack cost which was incorrectly reducing the player's AP total; eid=179 added to WEAPON_ATTACK_IDS
- Fix: AP/MP badge no longer shows MAX at exactly the cap — only shows ▲N when truly above the cap

## [0.2.86] — 2026-08-28
- CharacteristicsPanel: allocation grid (+/- buttons) always visible — removed hover-to-reveal behavior; grid is now permanently shown below the compact stat rows

## [0.2.85] — 2026-08-28
- RuneModal: smart quick-value presets per rune type — % Resistance runes show [1,2,3,4,5]; AP/MP/Range show [1]; all others keep [1,5,10,25,50,100]; selecting a rune type auto-sets addValue to the first preset

## [0.2.84] — 2026-08-28
- Fix: RES% and AP/MP overcap badges now show real excess — previously stats were capped before reaching display (always showed 50%/12/6 max), never triggering ▲N; now raw pre-cap values are saved in StatBlock and used for overcap calculation

## [0.2.83] — 2026-08-28
- StatsPanel: RES% overcap badge (▲N) now appears only on hover — table stays clean; hover over any gold RES% value above 50% to see the wasted excess

## [0.2.82] — 2026-08-28
- StatsPanel: RES% cell now shows `MAX` badge when resistance % hits exactly the 50% cap (previously only showed gold color, no badge; ▲N still shows when above cap)

## [0.2.81] — 2026-08-28
- StatsPanel: AP and MP badges show overcap indicator — gold `▲N` pill when value exceeds in-game cap (AP≥12 → MAX or ▲N, MP≥6 → MAX or ▲N)

## [0.2.80] — 2026-08-27
- StatsPanel: columna RES% muestra overcap — si la resistencia % supera el cap de 50%, el valor aparece en dorado con badge `▲N` indicando cuántos puntos no aplican en juego

## [0.2.79] — 2026-08-27
- StatsPanel: tabla elemental agrega columna ✦ % (forjamagia RES%) — muestra en azul (#38a7cf) solo la contribución de runas de resistencia %, separada del RES% base del equipo; `—` cuando no hay runas de ese tipo
- RuneModal: agrega soporte para runas de % Resistencia elemental (Neutral, Tierra, Fuego, Agua, Aire)

## [0.2.78] — 2026-08-18
- Optimizer repair: expanded pool — for each constrained stat, top-60 items ranked by THAT stat are added to the repair candidate pool (not just beam's score-sorted top-50); this ensures the best items for satisfying constraints are always accessible during repair
- Optimizer repair: now tries ALL violated constraints each pass, not just the worst one — makes progress even when the most-violated stat has no single-slot improvement
- Increased repair passes (10→25) and builds-to-repair (12→20) for more thorough recovery

## [0.2.77] — 2026-08-18
- Optimizer config persists across sessions — last search settings (stat minimums, exo, max level, locked slots) are saved to localStorage and restored on reopen; groups with active stats auto-expand; "Limpiar" resets everything

## [0.2.76] — 2026-08-18
- Optimizer: exclude GM/test items — items with "(MJ)" in name are filtered out before optimization

## [0.2.75] — 2026-08-18
- Optimizer: stat cards show description tooltip on hover (all 53 stats, 4 locales) — explains what each stat does, clarifies confusing ones like PV vs Vitalidad, bestElemDmg, Potencia, etc.

## [0.2.74] — 2026-08-18
- Fix: stat inputs now accept continuous typing — Modal focus trap was re-firing on every render due to unstable onClose ref; split useEffect so initial focus only fires on open, not on re-renders
- Fix: "Exo Rango" renamed to "Exo Alcance" in Spanish locale to match actual Dofus terminology

## [0.2.73] — 2026-08-18
- Optimizer modal enlarged to 4xl (896px) — stat grid fully visible, no cut-off cards
- Validation: error shown if all slots are locked (nothing to optimize)
- Added '3xl' and '4xl' size options to Modal component

## [0.2.72] — 2026-08-18
- Optimizer: greedy repair phase — when no beam result meets constraints, top builds are iteratively repaired by swapping the slot that gains the most toward the most-violated constraint, up to 10 passes per build
- Repair uses adjusted constraints (minVal minus character base stats) so it correctly knows how much items must contribute
- This guarantees constraint satisfaction whenever a valid solution exists in the item pool

## [0.2.71] — 2026-08-18
- Optimizer UI redesign: all stats always visible, organized in 9 collapsible groups (Core, Characteristics, Elemental Damage, Critical, % Damage, Elemental Steal, Fixed/% Resistances, Combat)
- Slots config moved to collapsible panel; max level + exo inline in top bar
- "Clear all" button resets all minimums
- Algorithm: stats pre-initialized at weight=0 treated as unconfigured (BASE_WEIGHT); active stats (minVal > 0) auto-weighted at 5
- BuildResultCard now shows only active stats (minVal > 0) in result summary

## [0.2.70] — 2026-08-18
- Optimizer: dual beam search — primary beam optimizes score, constraint beam (6× boost on minVal stats) finds builds that meet hard requirements; both merged before final eval
- Pre-filter now merges normal top-50 + constraint-biased top-30 per slot to prevent pruning items critical for satisfying constraints
- Result card now shows constraint-satisfying builds first, then best-score builds

## [0.2.69] — 2026-08-18
- Fix: optimizer min input now uses type="text" + inputMode="numeric" — fixes browser quirks with controlled number inputs that prevented continuous typing

## [0.2.68] — 2026-08-18
- Optimizer redesign: merged Maximize+Required into single stat rows (weight slider + min value per stat)
- Algorithm fix: ring1/ring2 now filter ring items; dofus1–6 now filter dofus items; companion/sidekick properly filtered
- Algorithm improvement: all stats get BASE_WEIGHT=0.3 so high-level diverse items score higher; level bonus (×0.1) prevents level-10 items beating level-200 ones
- Increased TOP_K 25→50 and BEAM_WIDTH 50→120 for better coverage
- UX fix: min input uses local string state — no longer loses focus/value when typing
- New "⚡ Equipar el mejor build" button auto-equips top result from results page
- i18n: all 4 locales updated with new optimizer keys

## [0.2.67] — 2026-08-18
- Fix: rune badge repositioned outside slot to the right — was at `left: px-3` (overlapping slot); now `left: px+2` (clearly outside, visible beside the slot)

## [0.2.66] — 2026-08-18
- M42 — La Forjadora (Build Optimizer): botón en header abre modal
- Configurar pesos soft (sliders 1–10) para maximizar cualquier stat del build
- Configurar requeridos hard (≥ mínimo) — builds que no cumplen se descartan del top-3
- Checkboxes Exo PA/PM/Rango (preparación para futura integración de ítems forjamagiados)
- Nivel máximo configurable y slots a optimizar seleccionables por slot
- Algoritmo beam search (width=50) con pre-filtro greedy top-25 por slot
- Web Worker: cálculo no bloquea la UI — barra de progreso con % en tiempo real
- Resultados top-3: imágenes de ítems, stats clave, botón "Cargar este build"
- i18n: ES / EN / FR / PT con nombre localizado (La Forjadora / The Forger / La Forgeuse / A Forjadora)

## [0.2.65] — 2026-08-18
- WeaponCard: ícono de poción de transformación (Wildfire/Earthquake/Tsunami/Hurricane) aparece en esquina inferior derecha de la imagen del arma cuando hay transform activo

## [0.2.64] — 2026-08-18
- Fix: badge de transformación elemental ya no aparece en armas sin daño Neutro (estado obsoleto del store)
- Fix: efectos de empuje (effect_id 225) excluidos de las filas de daño de WeaponCard — evitaba NaN en el cálculo y "TOTAL NaN-NaN"

## [0.2.63] — 2026-08-17
- Feat: forjamagia de arma — transforma daño Neutro a elemental (Fuego/Tierra/Agua/Aire) al 85%, 68% o 50%
- RuneModal: sección "Transformación Elemental" con iconos de poción (Wildfire/Earthquake/Tsunami/Hurricane) y botones de ratio
- WeaponCard: aplica la transformación en la tabla de daños — el daño neutro se reemplaza por el elemento elegido con la fórmula correcta
- WeaponCard: badge de elemento+% en el header cuando hay transformación activa
- URL share: `wt` field preserva la transformación al compartir/guardar build

## [0.2.62] — 2026-08-17
- UI: efectos quemados (robo PA, robo PM, ganar PA, ganar PM, empuje, erosión, mod curas, buff de hechizo) ahora aparecen como chips coloreados con icono de stat
- UI: icono correcto por efecto — ap_reduction para robo PA, mp_reduction para robo PM, ap para ganar PA, mp para ganar PM, push_damage para empuje, damage_reflect para erosión, heals para curación
- UI: fila de curas (steal ♥) reemplaza símbolo ♥ por icono heals.webp en SpellCard, WeaponCard y filas Σ

## [0.2.61] — 2026-08-17
- Fix: buffs y descripción del hechizo ahora aparecen en el idioma seleccionado (el overlay de lang copiaba solo el nombre)
- Fix: ETL filtra buffs con placeholders sin resolver (#3, #4) — "Disparos Lejanos" ya no genera 70+ entradas de estado
- Fix: ETL filtra buffs con IDs de estado de 5+ dígitos embebidos en el texto
- Fix: ETL deduplica buffs idénticos por texto en cada nivel (e.g. Flecha Explosiva "-2 Alcance" ya no aparece dos veces)
- UI: buffs como chips coloreados — rojo para debuffs (−), azul/aire para buffs (+), oro para neutros; iconos de stat cuando aplica

## [0.2.60] — 2026-08-17
- Feat: ETL extrae buffs/debuffs genéricos (rango, crítico, curas, etc.) usando effects.json + templates por idioma; se muestran como texto en la SpellCard debajo de los daños
- Feat: ETL extrae description del hechizo (spell.descriptionId) y la muestra al pie de la SpellCard en texto pequeño/itálico
- Feat: renderEffectLabel — motor de templates ({{~1~2}}, pluralización, #1/#2, sufijo NT) para convertir effectId+valores a string legible por idioma

## [0.2.59] — 2026-08-17
- Fix: Flecha de Expiación (y similares) — Carga 2 ahora muestra el doble del bonus de Carga 1: cuando todos los spell_buff tienen el mismo min, se escala por ratio de stack (min × stack/baseStack) en vez de usar el valor plano
- Fix: hechizos "mixed" (Bumerán Pérfido y similares) — no muestran Σ porque cada hit aplica un elemento aleatorio (no acumulativo); solo se muestran las filas por elemento

## [0.2.58] — 2026-08-17
- Fix: daño de empuje (colisión) — coeficiente corregido a floor(nivel/6) por celda (era ×3/20=0.15, correcto es ÷6≈0.1667) — a nivel 200: 33/celda × 3 celdas = 99, coincide exactamente con el juego

## [0.2.57] — 2026-08-17
- Fix: daño de empuje (colisión) ahora usa fórmula determinista — floor(nivel×3/20 + pushbackDamage/4) por celda, sin dados — coincide con lo que muestra el juego (~30/celda a nivel 200)
- Fix: Σ↷ crit ya no doble-suma critDamage — ya estaba incluido en critTotalMin vía calcEffects
- Fix: bestElemDamage incluido en flatBonus — la stat "best-element damage" no se aplicaba a la fórmula

## [0.2.56] — 2026-08-16
- Fix: daño crítico (critDamage stat) ahora se suma como flat bonus en efectos críticos de hechizos
- Fix: Σ↷ crit incluye critDamage en el daño de colisión de empuje

## [0.2.55] — 2026-08-16
- SpellCard: empuje muestra "(si colisión: min–max)" por celda con fórmula completa incluyendo base por nivel
- Σ↷: fila separada que suma elemental + colisión total (todas celdas bloqueadas)
- Σ normal no incluye empuje — el daño de empuje solo ocurre en colisión, no en push libre

## [0.2.54] — 2026-08-16
- Fix: daño de empuje corregido — fórmula 25% por celda (antes era /3 ≈ 33%)

## [0.2.53] — 2026-08-16
- Fix: hechizos con Descarga ya no muestran Σ — los daños por nivel de carga no son acumulativos sino alternativos (carga 3 = solo 916, no 498+707+916)

## [0.2.52] — 2026-08-16
- Fix: Σ en hechizos con Descarga ya no suma la fase de robo (carga) + la descarga juntos
- Σ solo muestra el total del daño de descarga — la fase de robo no se acumula en un solo cast
- Heal Σ (♥) en el bloque Σ también eliminado para hechizos con Descarga (cada robo sana por separado)

## [0.2.51] — 2026-08-16
- Veneno (DoT): efectos con `triggers=TE` y `effectTriggerDuration>0` detectados como `kind:poison` en el ETL
- SpellCard: label "Veneno (Xt)" antes del primer efecto DoT cuando hay también daño normal en el mismo hechizo
- Flecha Tiránica / similares: daño normal + separador Veneno (2t) + daño DoT — sin confundir con daño directo
- Fórmula de daño aplicada a poison igual que damage (se amplifica con maestría del personaje)
- ETL regenerado: 19 clases con `kind:poison` + `turns` en todos los efectos DoT

## [0.2.50] — 2026-08-16
- SpellCard: deduplica efectos idénticos (elemento+tipo+min+max) — elimina duplicados de multi-hit AoE y cargas repetidas (64 hechizos afectados en todas las clases)
- Tyrannical Arrow / similares: 3 efectos fuego [28-32, 20-22, 28-32] ahora muestra 2 filas (el duplicado se colapsa)
- Descarga: separador entre la fase de robo (carga) y la fase de daño (descarga) en hechizos tipo Devouring Arrow

## [0.2.49] — 2026-08-16
- Hechizos de carga: daños calculados por nivel de carga en SpellCard
- Cargas explícitas (ej. Flecha Castigadora ×1/×2): filas "Carga 1", "Carga 2" con normal y crítico
- Cargas acumulativas (ej. Flecha Helada stack=0): muestra hasta min(turns,3) filas con bonus × N
- El bonus de carga suma al base RAW antes de la fórmula — se amplifica con maestría del personaje

## [0.2.48] — 2026-08-16
- Comparar: rediseño completo — hero cards con portrait + badges (AP/MP/PV/Alcance/Crítico) de ambos builds
- Equipment diff: filas por slot alineadas (item A ← icono slot → item B), mismos items atenuados, diferentes resaltados
- Tabla de stats: secciones agrupadas (Core/Chars/Daño/Robo/Res/Combate/Mods), cada fila A | stat | B | Δ con colores verde/rojo
- Botón Compartir: codifica ambos builds en URL #/?b=A&c=B, copia al portapapeles
- Auto-carga Build B desde parámetro c= de la URL via nuevo hook useCompareUrl
- Estado vacío para Build B: input URL + lista de builds guardados
- Modal overlay para cambiar Build B cuando ya hay uno cargado

## [0.2.47] — 2026-08-16
- Catálogo: armas muestran sección "Ataque de Arma" separada de "Efectos" — igual que el tooltip del slot equipado
- Misma lógica de clasificación por effect_id (WEAPON_ATTACK_IDS) aplicada en las tarjetas del catálogo

## [0.2.46] — 2026-08-16
- Brand "Dofus Forge": click derecho / botón medio abre nueva pestaña con el build actual codificado en la URL
- Click izquierdo sigue reseteando el build como antes

## [0.2.45] — 2026-08-16
- Comparar: clic en ⚖ hace scroll automático al panel de comparación
- Comparar: campo para pegar URL de un build compartido — carga Build B sin necesitar builds guardados localmente

## [0.2.44] — 2026-08-16
- Fix: companion/mount slot now shows items in all languages (ES/FR/PT/DE)
- Root cause: ETL stored localized type names (e.g. "Dragopavo" in ES), but slotConfig apiTypes filter checks English names
- Fix: ETL fetches EN type names first, then applies them as canonical type+slot for all languages
- Sidekick slot also fixed by the same change

## [0.2.43] — 2026-08-16
- Modo Comparar builds: botón "⚖ Comparar" en header activa panel de comparación completo
- Panel muestra equipo de Build A vs Build B (lado a lado) con iconos y nombres de items
- Tabla de stats A vs B con columna Δ coloreada (verde = B mejor, rojo = A mejor)
- Build B se carga desde builds guardados via dropdown — persiste hasta limpiar manualmente
- Stats de Build B se recalculan automáticamente al cambiar idioma (mismo engine que Build A)

## [0.2.42] — 2026-08-16
- Spell effects validated and fixed: AP/MP steal vs gain correctly distinguished (effectIds 84/111/127/128/169)
- New spell effect kinds rendered: +PA gain, +PM gain, % Erosión, Curas ×%, stacking spell buffs (⭐ SpellName: +N base)
- ETL regenerated: all 19 classes + common spells with correct effectId mappings across EN/ES/FR/PT

## [0.2.41] — 2026-08-15
- Equipped slot tooltip now shows special ability (gold box) and lore description on hover
- i18n fix: ability and description text now uses selected language (was always English before)
- Filtered noise effects: "-special spell-" and "Attitude" (effect_id 163/98) hidden from tooltip

## [0.2.40] — 2026-08-15
- Layout full-width: removed max-w-7xl constraint — no more empty side margins on wide screens (1920px+)
- Right sidebar widened from 300px to 360px for more room in stats and characteristics panels

## [0.2.39] — 2026-08-15
- Fix: "Ataque de Arma" solo muestra daños reales del arma — stats pasivos (ej. +Daño Aire) van a "Efectos"
- Root cause: mismo nombre de stat ("Air damage") tenía dos IDs en API — id=189 = ataque, id=47 = bonus pasivo
- Solución: effect_id guardado en JSON, clasificación por ID (funciona en todos los idiomas)
- Stats panel: cálculo de stats de arma corregido — bonuses pasivos de daño ya no se excluyen

## [0.2.38] — 2026-08-15
- Forjamagia deshabilitada para Dofus (1–6) y Montura — botón ✦ no aparece en esos slots

## [0.2.37] — 2026-08-15
- Toast al equipar: notificación "Slot: Item" aparece abajo a la derecha por 2.8s, click para cerrar
- Dofus sin duplicados: equipar un dofus ya puesto en otro slot lo mueve (no duplica)
- Slot labels con número: "Dofus 1"–"Dofus 6", "Anillo 1"/"Anillo 2" en todas las lenguas

## [0.2.36] — 2026-08-15
- Fix: armas en idiomas no inglés (Arco, Espada, etc.) ahora tienen slot:weapon correcto — efectos de ataque aparecen en "Ataque de Arma" y no en "Efectos"
- ETL normalizeItem usa is_weapon del API en lugar de mapear el nombre del tipo (que varía por idioma)
- EquipmentGrid tooltip usa ap_cost != null como check adicional de arma

## [0.2.35] — 2026-08-15
- SetDetailModal: items separados en "Ya tienes" / "Te falta" con headers colored
- Items faltantes muestran badge con slot (ej. "🎩 Sombrero") para saber qué hay que liberar
- Bonuses del set: colores y tamaños iguales al panel de sets activos

## [0.2.34] — 2026-08-15
- Sets activos: 3 columnas para 3+ sets (2 columnas para exactamente 2)
- Stats panel: títulos de sección "Elementos" y "Combate" más grandes (9px → 11px)

## [0.2.33] — 2026-08-15
- Spell cards enlarged: bigger icon (52px), larger name, stat icons and AP/range/crit/max text, damage values and column headers scaled up
- Active sets panel enlarged: bigger dots, text, tier badge, Eye icon, 2-column grid

## [0.2.32] — 2026-08-15
- Stats panel combat section: single column so full stat names are visible (no truncation)

## [0.2.31] — 2026-08-15
- Stats panel: larger element icons and combat stat rows

## [0.2.30] — 2026-08-15
- HP badge: removed truncate class that was showing "4,..." — number now fully visible

## [0.2.29] — 2026-08-14
- Desktop layout: 3 columns → 2 columns (equipment + spells left, sidebar right with class + characteristics + stats)
- HP badge: removed overflow-hidden clip, font sizes scale down to prevent number overflow

## [0.2.27] — 2026-08-14
- i18n complete: every user-visible string translated in EN / ES / FR / PT
- Fixed: Undo/Redo labels, modal close aria-labels, sort labels, SpellsPanel abbreviations, LanguageSwitcher

## [0.2.26] — 2026-08-14
- i18n: Modal, ClassPicker, CharacteristicsPanel, SetDetailModal, ItemCatalog, EquipmentGrid
- Magesmith signature persists in share URL

## [0.2.25] — 2026-08-13
- Tooltip: weapon attack effects separated from item stats

## [0.2.24] — 2026-08-13
- Catalog: multi-select stat filter across all equipment
- Dofus slots auto-advance to next slot after equipping (dofus1 → dofus6)

## [0.2.23] — 2026-08-12
- Reusable StatFilter component with categorized stat groups
- Stat filter includes all non-ignored stats

## [0.2.22] — 2026-08-11
- Active sets panel with per-tier bonuses
- Weapon tooltip with damage table (normal / critical)

## [0.2.20] — 2026-08-10
- Export build as PNG image
- Share build via URL

## [0.2.15] — 2026-08-05
- Magesmithy: add runes to equipped items
- Spells panel with damage calculation from character stats

## [0.2.0] — 2026-07-20
- Item catalog with search, filters and sorting
- Stats panel with full character calculation
- Multi-language support: ES / EN / FR / PT


