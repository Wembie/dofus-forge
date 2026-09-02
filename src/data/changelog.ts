export const DOFUS_GAME_VERSION = __DOFUS_VERSION__  // auto desde public/data/version.json

export type ChangelogEntry = {
  version: string
  date:    string
  notes:   string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.2.104',
    date: '2026-09-02',
    notes: [
      'Fix: weapon steals (Steals MP id=233, MP-steal-on-attack id=238, Fire heals id=261) now correctly shown under "ATAQUE DE ARMA" instead of EFECTOS',
      'Fix: item tooltip and SetDetailModal tooltip now have max-height (82vh) + scroll — all effects visible even on tall items near viewport bottom',
    ],
  },
  {
    version: '0.2.103',
    date: '2026-09-02',
    notes: [
      'Redesign: RuneModal add-controls always visible (fixed panel above scroll)',
      'Add: "Clear all runes" button in RuneModal active runes header',
    ],
  },
  {
    version: '0.2.102',
    date: '2026-09-02',
    notes: [
      'Fix: Range badge shows ▲N overcap indicator when range > 6 (cap), same as AP/MP badges',
    ],
  },
  {
    version: '0.2.101',
    date: '2026-09-02',
    notes: [
      "Fix: Range (Alcance) badge in StatsPanel now shows '+' prefix — it's a pure item bonus, not a base stat total like AP/MP",
    ],
  },
  {
    version: '0.2.100',
    date: '2026-09-02',
    notes: [
      'Feat: item tooltips now show a CONDICIONES section with stat requirements (e.g. Strength > 249) — icon, color, operator, and value per condition',
      'Fix: stat values now display "+" prefix for positives — "+1 Range", "+1 MP", "+351–400 Vitality" etc. in both slot tooltip and set modal hover tooltip',
    ],
  },
  {
    version: '0.2.99',
    date: '2026-09-01',
    notes: [
      'Feat: ItemCatalog "Ver Set" now opens the full SetDetailModal — replaced old basic local set modal with the proper component (progress bar, equip-all, tier bonuses, hover item tooltips)',
    ],
  },
  {
    version: '0.2.98',
    date: '2026-09-01',
    notes: [
      'UX: set name in slot tooltip is now a clickable link — clicking "Set de X" in the item hover tooltip opens SetDetailModal; removed separate Eye button',
    ],
  },
  {
    version: '0.2.97',
    date: '2026-09-01',
    notes: [
      'Feat: hover tooltip in SetDetailModal — hovering any item row shows full item tooltip (name, level, ability, all stats, lore) via portal with fixed positioning to escape modal overflow clipping',
    ],
  },
  {
    version: '0.2.96',
    date: '2026-09-01',
    notes: [
      'UX: CharacteristicsPanel split into two visual groups — Vitality/Wisdom at top (unaffected by Power), then a Power divider, then elemental stats (Strength/Intelligence/Chance/Agility) showing base | +power | =effective when Power > 0',
    ],
  },
  {
    version: '0.2.95',
    date: '2026-09-01',
    notes: [
      'Feat: drag & drop between compatible slots — drag an equipped item to any slot of the same type (ring1↔ring2, dofus1–dofus6) to swap or move it; runes, forjamago name and weapon transform travel with the item',
    ],
  },
  {
    version: '0.2.94',
    date: '2026-08-31',
    notes: [
      'Fix: rune badge (mini rune icons on slot) repositioned to inside the slot top-right corner — was placed at a fixed pixel offset to the right of the slot, which misaligned or clipped in grid layouts where cells are wider than the button',
    ],
  },
  {
    version: '0.2.93',
    date: '2026-08-31',
    notes: [
      'Fix: equipping or unequipping an item clears its slot\'s runes, forjamago name and weapon transform — rune data no longer leaks from a previous item',
    ],
  },
  {
    version: '0.2.92',
    date: '2026-08-31',
    notes: [
      'UX: Resistance section split into "Resistencias" (flat: elemental + Crit + Push) and "% Resistencias" (% elemental + % Melee + % Ranged) — clear flat vs % visual separation',
    ],
  },
  {
    version: '0.2.91',
    date: '2026-08-31',
    notes: [
      'Fix: Summons moved to Primarias section in RuneModal (was incorrectly in Secundarias)',
      'UX: RuneModal wider (640px) with auto-fill grid — desktop shows ~8 runes per row, mobile keeps ~5 columns',
    ],
  },
  {
    version: '0.2.90',
    date: '2026-08-31',
    notes: [
      'Feat: 15 missing runes added — AP/MP Parry, % Spell/Weapon/Melee/Ranged Damage, % Melee/Ranged Resistance, Pushback Damage/Resistance, Trap Damage, Power (traps), Summons, Pod, reflected damage',
      'Feat: RuneModal picker reorganized into 4 labeled sections: Primarias / Daños / Resistencias / Secundarias; 5-column grid per section',
      'Fix: % damage runes (Spell/Weapon/Melee/Ranged) and % Critical now use [1,2,3,4,5] quick-value presets',
    ],
  },
  {
    version: '0.2.89',
    date: '2026-08-31',
    notes: [
      'Feat: full mobile responsiveness — flat 5-column equipment grid without character center, compact dofus row, icon-only ShareBar on small screens',
      'Fix: unequip × and active rune button now always visible on touch devices (were hover-only)',
      'Fix: viewport minimum-scale=1 + overflow-x:hidden prevent browser zoom-out; iOS input auto-zoom suppressed',
      'UX: undo/redo/optimizer/compare hidden on mobile header to prevent overflow',
    ],
  },
  {
    version: '0.2.88',
    date: '2026-08-31',
    notes: [
      'Feat: "All" button in ScrollToggles — one click activates or deactivates all 6 characteristic scrolls at once',
      'Fix: allocation input no longer commits mid-type — value only applies on blur or Enter, preventing double-step jumps',
    ],
  },
  {
    version: '0.2.87',
    date: '2026-08-28',
    notes: [
      'Fix: weapon AP cost (effect_id=179) excluded from character stats — was incorrectly reducing player AP on weapons like Mekstagob Spade',
      'Fix: AP/MP overcap badge no longer shows MAX at cap — only ▲N when truly above cap',
    ],
  },
  {
    version: '0.2.86',
    date: '2026-08-28',
    notes: [
      'CharacteristicsPanel: allocation grid always visible — removed hover-to-reveal; +/- controls permanently shown',
    ],
  },
  {
    version: '0.2.85',
    date: '2026-08-28',
    notes: [
      'RuneModal: smart quick-value presets per rune type — % Resistance runes show [1,2,3,4,5]; AP/MP/Range show [1]; others keep [1,5,10,25,50,100]; switching rune type resets value to first preset',
    ],
  },
  {
    version: '0.2.84',
    date: '2026-08-28',
    notes: [
      'Fix: RES% and AP/MP overcap badges now correctly show excess — stats were being capped before display; raw pre-cap values now stored in StatBlock for accurate ▲N calculation',
      'Cleanup: removed unused *ResPercentRune fields from StatBlock (rune-only RES% tracking was never used in display)',
    ],
  },
  {
    version: '0.2.83',
    date: '2026-08-28',
    notes: [
      'StatsPanel: RES% overcap badge (▲N) is now hover-only — table stays clean; hover a gold value above 50% to see wasted excess',
    ],
  },
  {
    version: '0.2.82',
    date: '2026-08-28',
    notes: [
      'StatsPanel: RES% shows MAX badge at exactly the 50% cap — previously only changed color; ▲N still appears when above cap',
    ],
  },
  {
    version: '0.2.81',
    date: '2026-08-28',
    notes: [
      'StatsPanel: AP and MP badges show overcap indicator — gold ▲N pill when value exceeds in-game cap (AP≥12, MP≥6)',
    ],
  },
  {
    version: '0.2.80',
    date: '2026-08-27',
    notes: [
      'StatsPanel: RES% muestra overcap — valor en dorado con badge ▲N cuando supera el cap de 50%, indicando cuántos puntos de resistencia no aplican en juego',
    ],
  },
  {
    version: '0.2.79',
    date: '2026-08-27',
    notes: [
      'StatsPanel: columna ✦ % en tabla elemental — muestra en azul la resistencia % aportada solo por runas de forjamagia, separada del RES% del equipo',
      'RuneModal: agrega runas de % Resistencia elemental (Neutral, Tierra, Fuego, Agua, Aire)',
    ],
  },
  {
    version: '0.2.78',
    date: '2026-08-18',
    notes: [
      'Optimizer repair: expanded candidate pool per constrained stat (top-60 by that stat, not just score rank) — finds items that satisfy constraints even if they rank low in overall score',
      'Repair now tries all violated constraints each pass, not just the worst — makes progress on secondary constraints when primary is stuck',
      'Increased repair passes (10→25) and builds-to-repair (12→20)',
    ],
  },
  {
    version: '0.2.77',
    date: '2026-08-18',
    notes: [
      'Optimizer config persists across sessions — stat minimums, exo, max level, and locked slots are saved to localStorage',
      'Reopening the optimizer restores the last search; groups with active stats auto-expand; Clear resets everything',
    ],
  },
  {
    version: '0.2.76',
    date: '2026-08-18',
    notes: [
      'Optimizer: items with "(MJ)" in name are excluded — GM/test items no longer appear in results',
    ],
  },
  {
    version: '0.2.75',
    date: '2026-08-18',
    notes: [
      'Optimizer: hover tooltip on all stat cards explains what each stat does (53 stats, 4 locales)',
      'Clarifies confusing stats: PV vs Vitalidad, DMG Mejor Elem (virtual), Potencia (%), etc.',
    ],
  },
  {
    version: '0.2.74',
    date: '2026-08-18',
    notes: [
      'Fix: stat inputs accept continuous typing — Modal focus trap was re-stealing focus on every render due to unstable onClose ref',
      'Fix: "Exo Rango" → "Exo Alcance" in Spanish to match official Dofus stat name',
    ],
  },
  {
    version: '0.2.73',
    date: '2026-08-18',
    notes: [
      'Optimizer modal enlarged to max-w-4xl (896px) — stat grid fully visible without cut-off cards',
      'Validation: shows error if all slots are locked before running optimizer',
    ],
  },
  {
    version: '0.2.72',
    date: '2026-08-18',
    notes: [
      'Optimizer: greedy repair phase guarantees constraint satisfaction — if beam search misses, top builds are repaired slot-by-slot toward each violated constraint',
      'Repair uses character base stats (scrolled + allocated) to know exactly how much more items must contribute',
    ],
  },
  {
    version: '0.2.71',
    date: '2026-08-18',
    notes: [
      'Optimizer redesign: all stats visible in 9 collapsible groups — no more add/remove stat flow',
      'Slots panel collapsible; max level + exo inline; "Clear all" button resets everything',
      'Algorithm: pre-initialized stats at weight=0 use BASE_WEIGHT; active stats auto-weight=5',
    ],
  },
  {
    version: '0.2.70',
    date: '2026-08-18',
    notes: [
      'Optimizer: dual beam search — constraint beam (6× weight boost on minVal stats) runs alongside primary beam to guarantee constraint-satisfying builds are found',
      'Pre-filter merges normal top-50 + constraint-biased top-30 per slot — items critical for hard constraints survive pruning',
      'Results: constraint-meeting builds always rank first, then best-score builds',
    ],
  },
  {
    version: '0.2.69',
    date: '2026-08-18',
    notes: [
      'Fix: optimizer minimum input uses type="text" — fixes browser quirks preventing continuous number typing',
    ],
  },
  {
    version: '0.2.68',
    date: '2026-08-18',
    notes: [
      'Optimizer redesign: combined weight + minimum into single stat row — no more duplicate additions',
      'Fix: ring, dofus, companion, sidekick slots now find correct items (were returning empty)',
      'Algorithm: all stats score with BASE_WEIGHT so high-level diverse items rank correctly',
      'Algorithm: level bonus prevents low-level items beating high-level equivalents',
      'Increased TOP_K to 50 and BEAM_WIDTH to 120 for better result coverage',
      'UX: min value input keeps focus while typing (local string state)',
      '⚡ "Equip best build" button instantly loads top result',
    ],
  },
  {
    version: '0.2.67',
    date: '2026-08-18',
    notes: [
      'Fix: rune badge now appears outside and to the right of the slot (was overlapping inside)',
    ],
  },
  {
    version: '0.2.66',
    date: '2026-08-18',
    notes: [
      'M42 — La Forjadora (Build Optimizer): botón en header abre modal "La Forjadora"',
      'Configurar pesos soft (sliders) para maximizar cualquier stat del build',
      'Configurar requeridos hard (≥ mínimo) — builds que no cumplen se descartan',
      'Checkboxes Exo PA/PM/Rango para futura integración de ítems forjamagiados',
      'Selección de nivel máximo y slots a optimizar (marcar/desmarcar por slot)',
      'Algoritmo beam search (width=50) con pre-filtro greedy top-25 por slot',
      'Web Worker no bloquea la UI — barra de progreso con % en tiempo real',
      'Resultados top-3 con imágenes de ítems, stats clave y botón "Cargar este build"',
      'i18n completo: ES (La Forjadora) / EN (The Forger) / FR (La Forgeuse) / PT (A Forjadora)',
    ],
  },
  {
    version: '0.2.65',
    date: '2026-08-18',
    notes: [
      'WeaponCard: ícono de poción de transformación aparece en esquina del arma cuando hay transform activo',
    ],
  },
  {
    version: '0.2.64',
    date: '2026-08-18',
    notes: [
      'Fix: badge de transformación ya no aparece en armas sin daño Neutro (store obsoleto)',
      'Fix: efectos de empuje excluidos de filas de daño en WeaponCard — evitaba NaN en totales',
    ],
  },
  {
    version: '0.2.63',
    date: '2026-08-17',
    notes: [
      'Feat: forjamagia de arma — transforma daño Neutro a elemental (Fuego/Tierra/Agua/Aire) al 85%, 68% o 50%',
      'RuneModal: sección "Transformación Elemental" con iconos de poción (Wildfire/Earthquake/Tsunami/Hurricane)',
      'WeaponCard: daño neutro reemplazado por el elemento transformado — escala con maestría del elemento correcto',
      'WeaponCard: badge de elemento+% en header cuando hay transformación activa',
      'URL share: campo wt preserva la transformación al compartir build',
    ],
  },
  {
    version: '0.2.62',
    date: '2026-08-17',
    notes: [
      'UI: efectos hardcoded (robo PA/PM, ganar PA/PM, empuje, erosión, mod curas, buff hechizo) como chips coloreados con icono de stat',
      'UI: icono correcto por efecto — ap_reduction, mp_reduction, ap, mp, push_damage, damage_reflect, heals',
      'UI: fila de curas (steal) reemplaza ♥ por icono heals.webp en SpellCard, WeaponCard y filas Σ',
    ],
  },
  {
    version: '0.2.61',
    date: '2026-08-17',
    notes: [
      'Fix: buffs y descripción del hechizo aparecen en el idioma seleccionado (overlay de lang copiaba solo el nombre)',
      'Fix: ETL filtra buffs con placeholders sin resolver (#3, #4) — "Disparos Lejanos" ya no genera 70+ entradas de estado',
      'Fix: ETL filtra buffs con IDs de estado de 5+ dígitos embebidos en el texto',
      'Fix: ETL deduplica buffs idénticos por texto en cada nivel de hechizo',
      'UI: buffs como chips coloreados con iconos de stat — rojo debuff, azul buff, oro neutro',
    ],
  },
  {
    version: '0.2.60',
    date: '2026-08-17',
    notes: [
      'Feat: ETL extrae buffs/debuffs genéricos (rango, crítico, curas, etc.) via effects.json + templates por idioma',
      'Feat: description del hechizo mostrada al pie de la SpellCard',
      'Feat: motor de templates renderEffectLabel para convertir effectId+valores a string localizado',
    ],
  },
  {
    version: '0.2.59',
    date: '2026-08-17',
    notes: [
      'Fix: Flecha de Expiación — Carga 2 = doble bonus que Carga 1 (escala por stack/baseStack cuando todos los buff.min son iguales)',
      'Fix: hechizos element:mixed (Bumerán Pérfido) — sin Σ; cada hit es un elemento aleatorio, no acumulativo',
    ],
  },
  {
    version: '0.2.58',
    date: '2026-08-17',
    notes: [
      'Fix: coeficiente de daño de empuje corregido — floor(nivel/6) por celda (era ×3/20); a nivel 200: 33/celda × 3 celdas = 99, exacto al juego',
    ],
  },
  {
    version: '0.2.57',
    date: '2026-08-17',
    notes: [
      'Fix: daño de empuje (colisión) usa fórmula determinista — floor(nivel×3/20 + pushbackDamage/4)/celda, sin dados — coincide con el juego (~30/celda a nivel 200)',
      'Fix: Σ↷ crit ya no doble-suma critDamage (ya incluido en critTotalMin vía calcEffects)',
      'Fix: bestElemDamage incluido en flatBonus — "best-element damage" no se aplicaba a la fórmula',
    ],
  },
  {
    version: '0.2.56',
    date: '2026-08-16',
    notes: [
      'Fix: critDamage stat sumado como flat bonus en cálculo de efectos críticos de hechizos',
      'Fix: Σ↷ crit incluye critDamage en daño de colisión de empuje',
    ],
  },
  {
    version: '0.2.55',
    date: '2026-08-16',
    notes: [
      'SpellCard: empuje muestra "(si colisión: min–max)" por celda — fórmula (8+1d8×nivel/50+stat×0.25) × celdas',
      'Σ↷: segunda fila Σ que suma elemental + daño de colisión total (escenario todas celdas bloqueadas)',
      'Σ normal ya no incluye push — daño de empuje solo ocurre en colisión, no en push libre',
    ],
  },
  {
    version: '0.2.54',
    date: '2026-08-16',
    notes: [
      'Fix: fórmula daño de empuje — 25% del stat por celda (antes /3 ≈ 33% — incorrecto)',
    ],
  },
  {
    version: '0.2.53',
    date: '2026-08-16',
    notes: [
      'Fix: hechizos con Descarga no muestran Σ — filas de daño son por nivel de carga (alternativas, no acumulativas)',
    ],
  },
  {
    version: '0.2.52',
    date: '2026-08-16',
    notes: [
      'Fix: Σ en hechizos con Descarga no suma robo (carga) + descarga — solo muestra total de descarga',
      'Heal Σ (♥) eliminado del bloque Σ en hechizos con Descarga — cada robo sana por separado',
    ],
  },
  {
    version: '0.2.51',
    date: '2026-08-16',
    notes: [
      'Veneno (DoT): efectos con triggers=TE y effectTriggerDuration>0 detectados como kind:poison en el ETL',
      'SpellCard: label "Veneno (Xt)" antes del primer efecto DoT cuando hay también daño normal',
      'Flecha Tiránica / similares: daño normal + separador Veneno (2t) + daño DoT bien diferenciados',
      'Fórmula de daño aplicada a poison — se amplifica con maestría igual que damage',
    ],
  },
  {
    version: '0.2.50',
    date: '2026-08-16',
    notes: [
      'SpellCard: deduplica efectos idénticos (64 hechizos en todas las clases)',
      'Tyrannical Arrow / similares: duplicado colapsado — 3 fire→2 filas correctas',
      'Descarga: separador entre fase de robo (carga) y fase de daño en hechizos tipo Devouring Arrow',
    ],
  },
  {
    version: '0.2.49',
    date: '2026-08-16',
    notes: [
      'Hechizos de carga: daños calculados por nivel de carga (Carga 1, Carga 2…) en SpellCard',
      'Cargas explícitas (ej. Flecha Castigadora): filas por stack con daño normal y crítico',
      'Cargas acumulativas (ej. Flecha Helada): muestra hasta min(turns, 3) filas de bonus × N',
      'Bonus de carga suma al base RAW antes de la fórmula — escala con maestría del personaje',
    ],
  },
  {
    version: '0.2.48',
    date: '2026-08-16',
    notes: [
      'Comparar: rediseño completo — hero cards con portrait + badges (AP/MP/PV/Alcance/Crítico)',
      'Equipment diff: filas por slot alineadas, mismos items atenuados, diferentes resaltados',
      'Tabla de stats: secciones agrupadas con colores verde/rojo por comparación',
      'Botón Compartir: codifica ambos builds en URL #/?b=A&c=B',
      'Auto-carga Build B desde parámetro c= de la URL',
      'Modal overlay para cambiar Build B',
    ],
  },
  {
    version: '0.2.47',
    date: '2026-08-16',
    notes: [
      'Catálogo: armas muestran "Ataque de Arma" separado de "Efectos" (como en el tooltip del slot)',
      'Clasificación por effect_id igual que en el tooltip — consistente en toda la UI',
    ],
  },
  {
    version: '0.2.46',
    date: '2026-08-16',
    notes: [
      'Brand "Dofus Forge": click derecho / botón medio abre nueva pestaña con el build actual',
      'Click izquierdo sigue reseteando el build',
    ],
  },
  {
    version: '0.2.45',
    date: '2026-08-16',
    notes: [
      'Comparar: clic en ⚖ hace auto-scroll al panel de comparación',
      'Comparar: campo para pegar URL compartida — carga Build B sin guardar localmente',
    ],
  },
  {
    version: '0.2.44',
    date: '2026-08-16',
    notes: [
      'Fix: Montura/Compañero muestran ítems en todos los idiomas (ES/FR/PT/DE)',
      'Causa: ETL guardaba tipo localizado ("Dragopavo", "Mascota") en vez del nombre EN canónico',
      'Fix: ETL obtiene tipos EN primero y los aplica como type+slot canónico en todos los idiomas',
    ],
  },
  {
    version: '0.2.43',
    date: '2026-08-16',
    notes: [
      'Modo Comparar: botón ⚖ en header activa comparación de dos builds en paralelo',
      'Panel muestra equipo de Build A vs Build B lado a lado con iconos y nombres',
      'Tabla de stats A vs B con columna Δ — verde = B mejor, rojo = A mejor',
      'Build B se carga desde builds guardados, stats recalculadas con el mismo engine',
    ],
  },
  {
    version: '0.2.42',
    date: '2026-08-16',
    notes: [
      'Hechizos validados: robo vs ganancia de PA/PM correctamente distinguidos (effectIds 84/111/127/128/169)',
      'Nuevos efectos renderizados: +PA ganado, +PM ganado, % Erosión, Curas ×%, buffs de hechizo apilables (⭐ Hechizo: +N base)',
      'ETL regenerado: 19 clases + hechizos comunes con mappings de effectId correctos en ES/EN/FR/PT',
    ],
  },
  {
    version: '0.2.41',
    date: '2026-08-15',
    notes: [
      'Tooltip equipado: ability especial (caja dorada) + descripción de lore al pasar el mouse',
      'i18n ability/description: los textos de habilidades y lore ahora respetan el idioma seleccionado',
      'Efectos basura filtrados: "-special spell-" y "Actitud" ya no aparecen en el tooltip',
    ],
  },
  {
    version: '0.2.40',
    date: '2026-08-15',
    notes: [
      'Layout full-width: ya no hay márgenes vacíos a los lados en pantallas grandes',
      'Sidebar derecha ampliada de 300px a 360px — más espacio para stats y características',
    ],
  },
  {
    version: '0.2.39',
    date: '2026-08-15',
    notes: [
      'Fix: "Ataque de Arma" solo muestra daños reales del arma — stats pasivos van a "Efectos"',
      'Misma stat "Air damage" tenía dos IDs: 189 = ataque del arma, 47 = bonus pasivo — ahora se distinguen por ID',
      'Stats panel: bonuses pasivos de daño en armas ya no se excluyen del cálculo',
    ],
  },
  {
    version: '0.2.38',
    date: '2026-08-15',
    notes: [
      'Forjamagia deshabilitada para Dofus (1–6) y Montura — el botón ✦ no aparece en esos slots',
    ],
  },
  {
    version: '0.2.37',
    date: '2026-08-15',
    notes: [
      'Toast al equipar: notificación "Slot: Item" aparece abajo a la derecha por 2.8s',
      'Dofus sin duplicados: equipar uno ya equipado en otro slot lo mueve automáticamente',
      'Slot labels con número: "Dofus 1"–"Dofus 6", "Anillo 1"/"Anillo 2" en todos los idiomas',
    ],
  },
  {
    version: '0.2.36',
    date: '2026-08-15',
    notes: [
      'Fix: efectos de ataque de armas (Arco, Espada, etc.) ahora aparecen en "Ataque de Arma" correctamente en todos los idiomas',
      'ETL normalizeItem usa is_weapon del API para asignar slot:weapon — no depende del nombre del tipo que varía por idioma',
    ],
  },
  {
    version: '0.2.35',
    date: '2026-08-15',
    notes: [
      'Modal de set: items divididos en "Ya tienes" y "Te falta" con colores diferenciados',
      'Items faltantes muestran badge del slot (ej. 🎩 Sombrero) para saber qué hay que liberar',
      'Bonificaciones del set con colores e íconos iguales al panel de sets activos',
    ],
  },
  {
    version: '0.2.34',
    date: '2026-08-15',
    notes: [
      'Sets activos: 3 columnas para 3+ sets, 2 columnas para 2 sets',
      'Stats panel: títulos "Elementos" y "Combate" más grandes',
    ],
  },
  {
    version: '0.2.33',
    date: '2026-08-15',
    notes: [
      'Panel de hechizos ampliado: ícono 52px, textos de nombre, stats y daños más grandes',
      'Panel de sets activos ampliado: puntos, texto, badge de tier y cuadrícula más grandes',
    ],
  },
  {
    version: '0.2.32',
    date: '2026-08-15',
    notes: [
      'Stats panel — sección combate en una columna: nombres completos visibles sin truncar',
    ],
  },
  {
    version: '0.2.31',
    date: '2026-08-15',
    notes: [
      'Stats panel — íconos de elementos e filas de combate más grandes',
    ],
  },
  {
    version: '0.2.30',
    date: '2026-08-15',
    notes: [
      'Badge HP: eliminado truncate que mostraba "4,..." — número ahora visible completo',
    ],
  },
  {
    version: '0.2.29',
    date: '2026-08-14',
    notes: [
      'Layout desktop: 3 columnas → 2 columnas (equipment + hechizos a la izquierda, sidebar derecha con clase + características + stats)',
      'Badge HP/PV: eliminado clip overflow, números escalan mejor en espacio reducido',
    ],
  },
  {
    version: '0.2.27',
    date: '2026-08-14',
    notes: [
      'i18n completo: todos los strings traducidos en EN / ES / FR / PT',
      'Undo/Redo, modal close, sort labels, SpellsPanel, LanguageSwitcher — todo localizado',
    ],
  },
  {
    version: '0.2.26',
    date: '2026-08-14',
    notes: [
      'i18n: Modal, ClassPicker, CharacteristicsPanel, SetDetailModal, ItemCatalog, EquipmentGrid',
      'Firma de Forjamago se guarda en la URL al compartir',
    ],
  },
  {
    version: '0.2.25',
    date: '2026-08-13',
    notes: [
      'Tooltip: efectos de ataque de arma separados de los stats del item',
    ],
  },
  {
    version: '0.2.24',
    date: '2026-08-13',
    notes: [
      'Catálogo: filtro de stats multi-selección para todo el equipo',
      'Dofus deja el catálogo abierto para equipar el siguiente slot automáticamente',
    ],
  },
  {
    version: '0.2.23',
    date: '2026-08-12',
    notes: [
      'Componente StatFilter reutilizable con grupos de stats categorizados',
      'Filtro de stats incluye todos los stats no ignorados',
    ],
  },
  {
    version: '0.2.22',
    date: '2026-08-11',
    notes: [
      'Sets activos: panel con bonificaciones por nivel de set',
      'Tooltip del arma muestra tabla de daño con/sin crítico',
    ],
  },
  {
    version: '0.2.20',
    date: '2026-08-10',
    notes: [
      'Exportar build como imagen PNG',
      'Compartir build por URL',
    ],
  },
  {
    version: '0.2.15',
    date: '2026-08-05',
    notes: [
      'Forjamagia: agregar runas a items equipados',
      'Panel de hechizos con cálculo de daño según stats del personaje',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-07-20',
    notes: [
      'Catálogo de items con búsqueda, filtros y ordenamiento',
      'Stats panel con cálculo completo del personaje',
      'Soporte multilenguaje: ES / EN / FR / PT',
    ],
  },
]
