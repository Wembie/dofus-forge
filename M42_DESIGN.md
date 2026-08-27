# M42 — Build Optimizer / Best Set Finder — Diseño UI

> Layout elegido: **Modal/Dialog** — botón en header abre panel flotante

---

## Flujo general

```
[Header] ── botón "Optimizador" ──► [Modal abre]
                                         │
                                    Tab: Configurar
                                    ├─ Pesos (soft)
                                    ├─ Requeridos (hard)
                                    ├─ Exo PA/PM/Rango
                                    └─ Slots bloqueados
                                         │
                                    [Optimizar ▶]
                                         │
                                    (spinner + Web Worker)
                                         │
                                    Tab: Resultados (top 3)
                                         │
                                    [Cargar build #N]
```

---

## Mockup — Tab Configurar (completo)

```
╔══════════════════════════════════════════════════════════════════════╗
║  ⚙  OPTIMIZADOR DE BUILD                                      [✕]   ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ━━━━  MAXIMIZAR  (pesos soft — cuánto importa cada stat)  ━━━━━━  ║
║                                                                      ║
║  Arrastrá el slider para darle más o menos peso al stat.            ║
║                                                                      ║
║  ┌──────────────────────────────────────────────────────────────┐   ║
║  │  🔴  Daño Fuego     ○━━━━━━━━━━━━━━━━━━━━━━━  8 / 10  [×]  │   ║
║  │  ⚡  PA             ○━━━━━━━━━━━━━━━━━━━━━━━  5 / 10  [×]  │   ║
║  │  🔵  PM             ○━━━━━━━━━━━━━━━━━━━━━━━  3 / 10  [×]  │   ║
║  │  💚  Vitalidad      ○━━━━━━━━━━━━━━━━━━━━━━━  2 / 10  [×]  │   ║
║  └──────────────────────────────────────────────────────────────┘   ║
║  [+ Agregar stat a maximizar ▾]  ← dropdown con todos los stats    ║
║                                                                      ║
║  ━━━━  REQUERIDOS  (hard constraints — si no cumple, descartado)  ━ ║
║                                                                      ║
║  Stats que el build DEBE tener como mínimo.                         ║
║                                                                      ║
║  ┌──────────────────────────────────────────────────────────────┐   ║
║  │  ⚡  PA             ≥  [ 12 ]                          [×]  │   ║
║  │  🔵  PM             ≥  [  5 ]                          [×]  │   ║
║  │  💚  Vitalidad      ≥  [ 4000 ]                        [×]  │   ║
║  │  🎯  % Crítico      ≥  [ 20 ]                          [×]  │   ║
║  └──────────────────────────────────────────────────────────────┘   ║
║  [+ Agregar stat requerido ▾]  ← mismo dropdown                    ║
║                                                                      ║
║  ━━━━  EXO  (forjamagia especial)  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║                                                                      ║
║  ¿Aceptar ítems con exo en el build optimizado?                     ║
║                                                                      ║
║  ┌──────────────────────────────────────────────────────────────┐   ║
║  │  ☐  Exo PA    — incluir ítems con +1 PA forjamagiado        │   ║
║  │  ☐  Exo PM    — incluir ítems con +1 PM forjamagiado        │   ║
║  │  ☐  Exo Rango — incluir ítems con +1 Rango forjamagiado     │   ║
║  └──────────────────────────────────────────────────────────────┘   ║
║                                                                      ║
║  ━━━━  NIVEL MÁXIMO  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║                                                                      ║
║     Nivel del personaje / máx ítems  [ 200 ]                       ║
║                                                                      ║
║  ━━━━  SLOTS A OPTIMIZAR  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║                                                                      ║
║  Desactivá los slots que querés conservar (ítem actual fijo).       ║
║                                                                      ║
║  ┌──────────────────────────────────────────────────────────────┐   ║
║  │  ☑ Arma        ☑ Casco       ☑ Amuleto     ☑ Anillo 1      │   ║
║  │  ☑ Anillo 2    ☑ Botas       ☑ Capa        ☑ Cinturón      │   ║
║  │  ☑ Dofus 1     ☑ Dofus 2     ☑ Dofus 3     ☑ Dofus 4      │   ║
║  │  ☑ Dofus 5     ☑ Dofus 6     ☑ Escudo      ☑ Mascota      │   ║
║  │                                                              │   ║
║  │  [Marcar todos]  [Desmarcar todos]                          │   ║
║  └──────────────────────────────────────────────────────────────┘   ║
║                                                                      ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║                                                                      ║
║   ⏱ Estimado: ~3–5 seg             [✕ Cancelar]  [🔍 Optimizar]   ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Mockup — Estado: Calculando

```
╔══════════════════════════════════════════════════════════════════════╗
║  ⚙  OPTIMIZADOR DE BUILD                                      [✕]   ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║                         ◌ Optimizando…                              ║
║                                                                      ║
║              Evaluando candidatos por slot...                       ║
║              Slot 9 / 16  ▓▓▓▓▓▓▓▓▓░░░░░░░  56%                   ║
║                                                                      ║
║              ⚠ Esto puede tardar unos segundos.                     ║
║              El resto de la app sigue funcionando.                  ║
║                                                                      ║
║                         [✕ Cancelar]                                ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Mockup — Tab Resultados (top 3)

```
╔══════════════════════════════════════════════════════════════════════╗
║  ⚙  OPTIMIZADOR DE BUILD  ─  Resultados                      [✕]   ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  3 builds encontrados para tu perfil.      [← Volver a config]     ║
║                                                                      ║
║  ┌─── 🥇 Build #1  ·  Score: 9240 ──────────────────────────────┐  ║
║  │                                                               │  ║
║  │  [img] Espada del Dragón Lv.200     [img] Sombrero Crónico    │  ║
║  │  [img] Amuleto de Brutas            [img] Anillo Merkator ×2  │  ║
║  │  [img] Botas de Tal Kasha           [img] Escudo Gorriflón    │  ║
║  │  [img] Dofus Ámbar ×2    [img] Dofus Rubí ×1    ...          │  ║
║  │                                                               │  ║
║  │  ⚡ PA 13   🔵 PM 6   💚 HP 12 450   🔴 Daño Fuego +340      │  ║
║  │  ✅ Cumple todos los requeridos                               │  ║
║  │                                                               │  ║
║  │                                      [Cargar este build ▶]   │  ║
║  └───────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  ┌─── 🥈 Build #2  ·  Score: 8910 ──────────────────────────────┐  ║
║  │  [img] Cuchillo del Conde  ·  [img] Capucha Salsicio  ·  … │  ║
║  │  ⚡ PA 12   🔵 PM 5   💚 HP 11 890   🔴 Daño Fuego +298      │  ║
║  │  ✅ Cumple todos los requeridos        [Cargar este build ▶]  │  ║
║  └───────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  ┌─── 🥉 Build #3  ·  Score: 8741 ──────────────────────────────┐  ║
║  │  [img] Espada del Otoño  ·  [img] Sombrero Bandido  ·  …     │  ║
║  │  ⚡ PA 12   🔵 PM 6   💚 HP 11 200   🔴 Daño Fuego +285      │  ║
║  │  ⚠ Requiere Exo PA en Amuleto        [Cargar este build ▶]   │  ║
║  └───────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Tipos de configuración

```ts
type StatWeight = {
  stat:   string   // clave de STAT_META, e.g. 'Vitality', 'AP', 'Fire Damage'
  weight: number   // 1–10
}

type StatRequired = {
  stat:   string
  minVal: number   // build descartado si stat total < minVal
}

type ExoConfig = {
  ap:    boolean   // incluir ítems con exo PA
  mp:    boolean
  range: boolean
}

type OptimizerConfig = {
  weights:     StatWeight[]
  required:    StatRequired[]
  exo:         ExoConfig
  maxLevel:    number
  lockedSlots: Set<SlotId>
}
```

---

## Función fitness

```
score(build) =
  Σ (computedStatValue(stat) × weight)     ← pesos soft
  + Σ setBonusValue × 0.5                   ← bonus por sets activos
  − penalty si no cumple hard constraints   ← descarte o penalización fuerte
```

Hard constraints se evalúan **después** del fitness: builds que no cumplen `required` se descartan del top-3.

---

## Lógica del algoritmo

```
1. Pre-filtrar por nivel y slot
   items[slot] = allItems.filter(i => i.slot === slot && i.level <= maxLevel)
   Si exo.ap=false → excluir ítems cuya única fuente de PA es exo (marcar en data)

2. Puntuar candidatos por slot (fitness parcial solo del ítem)
   score(item) = Σ item.stats[s] × weight[s]
   Guardar top-K=25 por slot

3. Beam search: width=50
   - Iniciar con build vacío
   - Por cada slot en orden (primero PA/PM-weight, luego resto):
     expandir cada build activo con top-K del slot → evaluar → quedarse con top-50

4. Evaluar builds completos
   - computeStats(build) → StatBlock real (incluye bonuses de set)
   - Filtrar los que no cumplen `required`
   - Re-rankear por score final

5. Devolver top-3 (o menos si no hay suficientes que cumplan constraints)
```

---

## Consideración: Exo en los datos

Los ítems exo **no están en el API** de dofusdude — son modificaciones de jugadores.
Opciones:

| Opción | Pros | Contras |
|---|---|---|
| **A) Ignorar exo por ahora** | Simple, no requiere data extra | Builds sin exo siempre |
| **B) Hardcodear lista de ítems exo comunes** | Cubre los casos reales | Requiere mantenimiento |
| **C) Permitir al usuario marcar un ítem como "tiene exo PA"** | Flexible, preciso | UX más compleja |

> **Recomendación para MVP**: Opción A + Opción C juntas: checkbox exo en el config activa la búsqueda, y si el usuario tiene un ítem exo ya equipado en un slot bloqueado, el optimizer lo respeta.

---

## Componentes a crear

| Archivo | Responsabilidad |
|---|---|
| `src/engine/optimizer.ts` | Algoritmo puro: greedy + beam search, función fitness, validación de constraints |
| `src/workers/optimizer.worker.ts` | Web Worker wrapper — no bloquea UI, envía progreso |
| `src/features/optimizer/OptimizerModal.tsx` | Modal principal con 3 estados (config / loading / resultados) |
| `src/features/optimizer/StatWeightRow.tsx` | Fila: icono stat + nombre + slider 1-10 + botón quitar |
| `src/features/optimizer/StatRequiredRow.tsx` | Fila: icono stat + nombre + input minVal + botón quitar |
| `src/features/optimizer/StatPicker.tsx` | Dropdown con todos los stats del STAT_META (para agregar a pesos o requeridos) |
| `src/features/optimizer/BuildResultCard.tsx` | Tarjeta resultado: ítems con imagen, stats clave, badge exo si aplica, botón cargar |

---

## Trigger de apertura

Botón `⚙ Optimizador` en el header (junto a Builds guardados / Undo-Redo).

---

## Estimación de trabajo

| Tarea | Estimado |
|---|---|
| `optimizer.ts` — algoritmo greedy + fitness + hard constraints | ~4h |
| `optimizer.worker.ts` — Web Worker + progress messages + cancel | ~1h |
| `OptimizerModal.tsx` — UI 3 estados | ~3h |
| `StatWeightRow` + `StatRequiredRow` + `StatPicker` | ~2h |
| `BuildResultCard` + integración header | ~2h |
| **Total** | **~12h** |
