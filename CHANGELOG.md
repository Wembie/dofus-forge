# Changelog

All notable changes to Dofus Forge are documented here.  
Game version is read automatically from `public/data/version.json` (currently **3.6.10.10**).

---

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
