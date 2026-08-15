# Changelog

All notable changes to Dofus Forge are documented here.  
Game version is read automatically from `public/data/version.json` (currently **3.6.10.10**).

---

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
