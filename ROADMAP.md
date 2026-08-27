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
- [x] **Fix — Revertir CharacterViewer** — revertido M36 (renderer mostraba personajes Dofus 2, no Dofus 3). Vuelto al retrato estático local (data/classes/{id}.png). Brand "Dofus Forge" en el header es ahora clickeable y hace reset completo del build (reset() + clearHistory()).
- [x] **Fix — Stats base incorrectas** — Prospección base 0→100, Invocaciones base 0→1. Daño elemental (lowercase "Air damage" etc.) en ítems no-arma ignorado incorrectamente; ahora mapeado con filtro para ítems de tipo arma. CharacteristicsPanel muestra HP total (base clase + vitalidad) en lugar de solo vitalidad de equipo.

### UI / Polish
- [x] **M22 — Layout mobile responsive** — la grilla de 3 columnas colapsa bien en móvil (tabs o acordeón), el ItemCatalog es usable en pantalla pequeña
- [ ] **M23 — Animaciones de equip/unequip** — transición suave al equipar un ítem en el EquipmentGrid
- [x] **M24 — Tooltip de set en hover** — en el EquipmentGrid, hover sobre ítem con set → mini-card del set con piezas activas y próximo bonus
- [ ] **M25 — Búsqueda global** — barra de búsqueda en header que busca ítems, sets, hechizos a la vez
- [x] **M35 — Reconstrucción visual completa** — JetBrains Mono para todos los números (font-mono override), badges AP/MP/HP dominantes (text-4xl con doble glow), secciones gold-accent en StatsPanel, slots 80px, retrato 130px, CharacterCenter con nivel visible, header más atmosférico, tokens de rareza (--rarity-0..6), gradiente de cuerpo triple, keyframes stat-tick/slot-equip/float-delta

---

## Ideas futuras 💡

- Simulador de combate básico (turno a turno con un enemigo dummy)
- Importar build desde Dofus client (clipboard de stats del personaje)
- [x] Comparar dos builds en paralelo
- Modo "tier list" de ítems por slot y nivel

### Pendientes identificadas (2026-08-18)

- [ ] **M36 — Sugerir elemento óptimo para transform de arma** — en WeaponCard, calcular daño 85% neutro para cada elemento con maestría actual del personaje y resaltar cuál conviene más (tooltip o badge "Recomendado")
- [ ] **M37 — Catálogo: filtrar armas transformables** — toggle "solo armas con daño neutro" en filtros del catálogo para facilitar búsqueda de armas candidatas a transform
- [ ] **M38 — Tabla comparativa de transforms** — en RuneModal/WeaponCard, mini-tabla que muestra resultado de las 4 pociones × 3 ratios simultáneamente con el daño calculado final
- [ ] **M39 — Exportar/importar build JSON** — alternativa al URL base64, archivo .json descargable/cargable, más legible para compartir en Discord/foros
- [ ] **M40 — Simulador PvP básico** — ingresar resistencias fijas/% de un enemigo dummy y ver daño real del build contra él (hechizos + arma), útil para comparar elementos
- [x] **M42 — Build Optimizer / "La Forjadora"**
  
  **Objetivo:** dado un perfil de stats deseados, encontrar la combinación óptima de ítems por slot para un nivel y clase dados.

  **Problema computacional:**
  - ~10 000 ítems en catálogo, 17 slots, algunos slots con restricciones (anillo×2, dofus×6)
  - Fuerza bruta = inviable (10^68 combinaciones)
  - Solución: algoritmo **greedy por slot + beam search** con función de fitness configurable
  - Opcionalmente: **Web Worker** para no bloquear UI durante cómputo

  **Algoritmo propuesto (greedy iterativo):**
  1. Pre-filtrar catálogo por nivel máx y tipo de slot → `candidatesPerSlot[]`
  2. Para cada slot en orden de impacto (PA→PM→resto): elegir ítem top-K por fitness parcial
  3. Evaluar combinaciones de top-K (beam width ~50) con `computeStats()` real
  4. Guardar mejores N builds completos (Pareto-front si hay múltiples objetivos)
  5. Repetir N iteraciones mejorando slots con peores contribuciones (hill-climbing local)

  **Función de fitness:**
  - Suma ponderada de stats: `score = Σ (statValue × weight[stat])`
  - Weights definidos por el usuario vía sliders (ej. daño fuego ×3, PA ×5, vitalidad ×1)
  - Hard constraints: PA ≥ N, PM ≥ N, nivel ≤ N (descartar builds que no cumplan)
  - Bonus por synergy de set: bonus de set activo suma al score

  **UI:**
  - Panel "Optimizador" con: sliders de peso por stat, inputs de constraints (PA min, PM min, nivel máx)
  - Checkbox por slot para bloquearlo (conservar ítem equipado actual)
  - Botón "Optimizar" → spinner → muestra top 3 builds sugeridos
  - Cada build sugerido: preview de ítems + stats calculados + botón "Cargar este build"
  - Tiempo estimado mostrado al usuario antes de correr

  **Implementación:**
  - `src/engine/optimizer.ts` — lógica pura (sin React, sin store)
  - `src/workers/optimizer.worker.ts` — Web Worker wrapper
  - `src/features/optimizer/OptimizerPanel.tsx` — UI
  - Reutiliza `computeStats()` existente para evaluar cada build candidato
  - Reutiliza `AppItem[]` ya cargado en `dataStore`

  **Limitaciones conocidas:**
  - No garantiza óptimo global (greedy puede quedar en local máximo)
  - Sets bonus no considerados en pre-filtro (solo en evaluación final)
  - Ítems con efectos condicionales (Dofus) pueden ser sub-valorados por fitness lineal
- [ ] **M43 — Optimizer: diversidad real en los 3 resultados** — actualmente los 3 builds tienen score idéntico y difieren por 1-2 ítems. Al encontrar build #1, penalizar sus ítems y re-correr beam search para que #2 y #3 sean genuinamente distintos (algoritmos de "k-best diverse solutions"). El usuario debe ver 3 estrategias diferentes, no variaciones mínimas.

- [ ] **M44 — Optimizer: progreso slot-por-slot en barra** — durante el cómputo, mostrar qué slot se está procesando ahora ("Optimizando: Sombrero…", "Optimizando: Capa…", "Reparando constraints…"). El Web Worker ya emite eventos de progreso por slot; conectar `slotName` en el mensaje y mostrarlo en el spinner de la UI.

- [ ] **M45 — Optimizer: constraint de pods (peso de ítems)** — opción para limitar builds que excedan la capacidad de carga del personaje. El personaje tiene pods base (clase + nivel + Fuerza/5) y los ítems tienen peso. Agregar campo "pods disponibles" en config del optimizer y filtrar builds que superen ese límite. Requiere que AppItem tenga campo `pods_cost` o que se calcule del catálogo.

- [ ] **M46 — Optimizer: algoritmos especializados de búsqueda — reemplazo completo del motor**

  El beam search actual tiene limitaciones estructurales: queda atrapado en máximos locales, no garantiza satisfacción de constraints, y produce builds casi idénticos. Objetivo: motor de optimización de clase profesional.

  **Técnicas a implementar (en orden de impacto):**

  **1. Multi-start greedy con hill-climbing local**
  - Arrancar desde N puntos aleatorios distintos (no solo desde vacío)
  - Para cada build, iterar: swappear el slot con peor contribución por el ítem óptimo para ese slot
  - Converge a distintos óptimos locales → diversidad natural
  - Costo: O(N × slots × candidatos), configurable

  **2. Branch & Bound con poda agresiva**
  - Explorar árbol de combinaciones slot por slot
  - Calcular upper-bound del score posible con slots restantes (relajación continua)
  - Podar ramas donde upper-bound < mejor build actual
  - Garantiza óptimo global en tiempo razonable para constraints estrictos
  - Fallback a beam si árbol es demasiado profundo (timeout configurable)

  **3. Algoritmo genético para diversidad (fase post-beam)**
  - Población inicial: top-20 builds del beam search
  - Crossover: combinar ítems de dos builds (tomar slot A del padre 1, slot B del padre 2)
  - Mutación: reemplazar 1-2 slots aleatorios por ítem óptimo para ese slot
  - Selección: elitismo + torneo (top 50% sobrevive + mejores mutaciones)
  - 20-50 generaciones en Web Worker; cada generación emite progreso
  - Naturalmente produce builds distintos porque parte de combinaciones diferentes

  **4. Constraint satisfaction primero (CP-style)**
  - Antes de optimizar score, encontrar región factible (builds que cumplen todos los minVal)
  - Técnica: propagación de constraints por slot — eliminar ítems que hacen imposible satisfacer algún constraint con los slots restantes
  - Reducción masiva del espacio de búsqueda antes de beam/genético
  - Similar a cómo solvers SAT/CP-SAT acotan el espacio

  **5. Búsqueda exhaustiva acotada por slot (para casos pequeños)**
  - Si el espacio total < umbral (ej. ≤ 10^8 combinaciones), enumerar todo con pruning
  - Ej: si el usuario bloquea 10 slots, solo hay 7 libres con 100 ítems c/u → 100^7 = 10^14 (aún grande) → usar CP pruning para reducir a < 10^6 y enumerar exacto
  - Para builds con muchos slots bloqueados o nivel bajo (pocos ítems), garantiza óptimo real

  **Arquitectura propuesta:**
  - `src/engine/optimizer/` (carpeta, no archivo único)
  - `beam.ts` — beam search actual (mantener, es base rápida)
  - `genetic.ts` — operadores genéticos
  - `branchBound.ts` — branch & bound con bounding function
  - `multiStart.ts` — hill-climbing multi-arranque
  - `constraintPropagation.ts` — CP pre-filtering
  - `runOptimizer.ts` — orquestador que elige estrategia según tamaño del problema
  - Web Worker emite eventos granulares: `{ phase: 'genetic', generation: 12, totalGenerations: 50, bestScore: 34200, buildsValid: 3 }`

  **UI:**
  - Barra de progreso multi-fase con label dinámico por fase y slot
  - "Generación 12/50 — Score: 34200 — 3 builds válidos encontrados"
  - Cancelación en cualquier momento (ya implementada)

- [ ] **M41 — Fashionista (transmogrificación cosmética)** — por cada slot equipado, permitir elegir un ítem diferente solo para la apariencia visual (imagen + nombre mostrado), sin afectar stats. El "look" se guarda separado del build real. Al exportar imagen o compartir URL, se puede mostrar el look fashionista. Útil para planear outfits de cara al juego.
- [ ] **M19 — OG/meta preview card** — cuando se comparte la URL, generar preview card con clase, nivel y stats top
- [ ] **M23 — Animaciones de equip/unequip** — transición suave al equipar un ítem en el EquipmentGrid
- [ ] **M25 — Búsqueda global** — barra de búsqueda en header que busca ítems, sets, hechizos a la vez

- [x] **Fix — Hover persistente en tooltip de slot** — reemplazado CSS group-hover por React state + timer 250ms para que el tooltip no desaparezca al mover el mouse hacia él.

- [x]Para las armas de y demas, tienen bonus de criticos y demas, entonces validar esa parte ya que con el mismo set:

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

- [x] Cuando se le unda al dofus forge, volver al inicio
- [x] volver a la foto que se tenia de los personajes, quitar como esta ahora
- [x] **Fix — Montura/Compañero vacíos en idioma no inglés** — ETL guardaba tipo localizado; ahora usa tipo EN canónico para type+slot en todos los idiomas

- [x] **Fix — Forjamagia transformación elemental de arma** — RuneModal muestra sección "Transformación Elemental" con pociones (Wildfire/Earthquake/Tsunami/Hurricane) y ratios 85%/68%/50%. WeaponCard y tooltip del slot reflejan el daño transformado (neutro → elemento elegido con Math.ceil). Badge elemento+% en header. Validación: solo armas con daño neutro pueden transformar. URL share preserva transform en campo `wt`.

- [x] **Fix — Overcap RES%** — si la resistencia % de un elemento supera el cap de 50%, la columna RES% muestra el valor en dorado con badge `▲N` indicando cuántos puntos están de más y no aplican en juego