# Changelog

All notable changes to Dofus Forge are documented here.  
Game version is read automatically from `public/data/version.json` (currently **3.6.10.10**).

---

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
