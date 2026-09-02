# Dofus Forge — Design System & Vision

> La diferencia entre una herramienta y un producto es cómo se siente usarla.
> Dofus Forge debe sentirse como una extensión del juego, no como una hoja de cálculo.

---

## 0. Diagnóstico Actual — Sé honesto antes de diseñar

Antes de proponer, identificar qué falla hoy:

| Problema | Impacto | Causa |
|---|---|---|
| Stats panel: too much equal weight | Difícil escanear lo importante | Todos los stats tienen el mismo tamaño/color |
| Equipment grid: slots muy pequeños | El ítem no se "siente" | Imagen 40px, slot 72×72px total |
| SpellCard: info secuencial | Comparar normal vs crit es lento | Normal arriba, crit abajo, en vez de columnas |
| Catálogo: filas muy densas | Fatiga visual al buscar | +12 stats en texto plano, sin jerarquía |
| Header: controls demasiado presentes | Compite con el build | Mismo peso visual que el contenido |
| Color: inconsistencia | Rojo para daño Y para negativo | Tierra es `--fire` en algunas partes |
| Typography: Inter para todo | Sin personalidad | Display y datos deberían tener fuente propia |
| Empty states: genéricos | No invita a usar | "Selecciona un slot" en texto plano gris |

---

## 1. Principios de Diseño — Los 6 No Negociables

### 1. Hierarchy First
La primera pregunta antes de renderizar cualquier cosa: ¿qué necesita ver el usuario primero?  
En un build tool: HP → AP/MP → Daño elemental → Resistencias → el resto.  
El orden visual = el orden de importancia del juego.

### 2. Color como Lenguaje
Los 4 elementos tienen colores. Son el idioma del juego.  
**Tierra = naranjo-marrón. Fuego = rojo. Agua = azul. Aire = verde.**  
Estos colores no se usan para decorar. Se usan para identificar instantáneamente.  
Un valor de daño de tierra SIEMPRE es `--earth`. Sin excepciones.

### 3. Datos Grandes, Labels Chicos
Los números son los protagonistas. Las etiquetas son subtítulos.  
HP muestra `4,945` en 24px mono. "PV" está en 8px uppercase, 40% opacity.  
Nunca al revés.

### 4. Progressive Disclosure
La información aparece cuando se necesita, no antes.  
Estado de reposo: mínimo limpio. Hover: detalle adicional. Click: acción o modal.  
Nunca mostrar todo al mismo tiempo.

### 5. Feedback Inmediato
Cada acción tiene consecuencia visual en ≤120ms.  
Equipar un ítem → los stats cambian → el número "ticks" suavemente.  
El usuario nunca duda si su acción funcionó.

### 6. Atmósfera Coherente
El fondo no es negro. Las sombras no son grises.  
Los bordes tienen color. Los paneles flotan.  
Todo respira la misma estética: medieval oscuro, dorado suave, datos precisos.

---

## 2. Sistema de Color

### 2.1 Paleta Base — The Vault

La profundidad se crea en capas. Cada superficie es un nivel de elevación.

```
CAPA       TOKEN              HEX          USO
──────────────────────────────────────────────────────
Void       --surface-void    #0a0d13      Fondo de página, profundidad máxima
Stone      --surface-stone   #11151e      Paneles laterales
Panel      --surface-panel   #171c28      Cards, secciones
Parchment  --surface-parchment #1c2130   Items hover, selección
Raised     --surface-raised  #212636      Tooltips, dropdowns, modals
```

> Nota: estos tokens YA EXISTEN en el proyecto. Usarlos, no reemplazarlos.

### 2.2 Metal & Bordes

```
--metal-edge        #2b3446    Bordes estándar de UI
--metal-edge-strong #3a465e    Bordes de focus, separadores importantes
--bevel-light       rgba(255,255,255,.06)   Highlight inset superior
--bevel-dark        rgba(0,0,0,.55)         Sombra inset inferior
```

### 2.3 Gold — El Acento Principal

```
--gold-deep    #7f6428    Barras, borders activos, accents sutiles
--gold         #c9a24b    Texto de sección, íconos activos, valores destacados
--gold-bright  #eccb78    Hover state, valores en budget lleno, CTA

Gradiente estándar: linear-gradient(to right, var(--gold-deep), var(--gold))
Glow estándar:      0 0 0 1px var(--gold-deep), 0 0 12px rgba(201,162,75,.25)
```

### 2.4 Elementos — El Lenguaje del Juego

Estos colores son SAGRADOS. No se alteran. No se usan para otra cosa.

```
ELEMENTO   CARACTERÍSTICA   TOKEN        HEX         VARIANTES
───────────────────────────────────────────────────────────────
Tierra     Fuerza           --earth      #c98a2b     -glow -dim
Fuego      Inteligencia     --fire       #e04b2a     -glow -dim
Agua       Suerte           --water      #2f93d8     -glow -dim
Aire       Agilidad         --air        #74b93f     -glow -dim
Neutral    —                --neutral    #b9b3a6     -glow -dim

/* Variantes para cada elemento (en índice.css): */
--earth-glow: rgba(201,138,43,.20)
--earth-dim:  rgba(201,138,43,.08)
/* Idem para fire, water, air, neutral */
```

### 2.5 Stats Especiales

```
--vitality  #d24b68    ← HP, corazón (rosa-rojo, NO el rojo de --fire)
--wisdom    #a06fd0    ← Sabiduría (púrpura)
--ap        #38a7cf    ← PA (azul-cian)
--mp        #4fae5a    ← PM (verde)
--crit      #e0a838    ← Crítico ✦ (ámbar)
```

### 2.6 Rareza de Ítems — Canon del Juego

```
--rarity-0  #9a9a9a    Común      → sin borde, sin glow
--rarity-1  #4da84d    Poco Común → borde verde sutil
--rarity-2  #4d9aff    Raro       → borde azul
--rarity-3  #c85aff    Mítico     → borde púrpura + glow
--rarity-4  #ff8c00    Legendario → borde naranja + glow fuerte
--rarity-5  #ff3c3c    Sublime    → borde rojo + glow animado
--rarity-6  #ffd700    Souvenir   → borde dorado + shimmer
```

Usar para: borde del slot equipado, borde de la imagen en catálogo, glow en tooltip.

### 2.7 Semánticos

```
--positive  #5fae54   Ganancia, buff, confirmar
--negative  #d8503f   Pérdida, debuff, error
--warning   #d9a441   Límite cercano, atención
```

### 2.8 Matriz de Uso de Color

```
COMPONENTE               COLOR PRINCIPAL    COLOR SECUNDARIO
────────────────────────────────────────────────────────────
Header logo              --gold-bright      —
Budget bar               --gold             --gold-deep
Characteristic row       element color      --ink-muted
Equipment slot (vacío)   --metal-edge       —
Equipment slot (lleno)   rarity color       element color del ítem
Stat badge (AP)          --ap               --surface-panel
Stat badge (MP)          --mp               --surface-panel
Stat badge (HP)          --vitality         --surface-panel
Elem table: valor dmg    elemento color     —
Elem table: valor res    --positive/neg     —
SpellCard header         elemento color     --surface-raised
SpellCard crit           --crit             —
CatalogItem name         --ink              —
CatalogItem set          --gold (70% op)    —
Budget bar overflow      --negative         —
Scroll toggle activo     --gold             --ink-invert
Section title            --gold             --gold-deep
```

---

## 3. Tipografía

### 3.1 Las Tres Fuentes

```
DISPLAY  →  Cinzel          (ya importada)  → headers, secciones, logo
BODY     →  Inter           (ya importada)  → labels, nombres, UI text
MONO     →  JetBrains Mono  (AGREGAR)       → TODOS los números sin excepción
```

**Import a agregar en index.html:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

**En tailwind.config.ts:**
```ts
fontFamily: {
  display: ['Cinzel', 'serif'],
  body:    ['Inter', 'system-ui', 'sans-serif'],
  mono:    ['"JetBrains Mono"', 'monospace'],  // ← agregar
}
```

### 3.2 Escala Tipográfica

```
NOMBRE       TAMAÑO   FUENTE    PESO    USO
────────────────────────────────────────────────────────────────
page-title    14px    Cinzel    700    "DOFUS FORGE" en header
section       11px    Cinzel    700    "CARACTERÍSTICAS", "HECHIZOS"
label         10px    Cinzel    400    headers de tabla, categorías
micro          9px    Inter     500    badges de rareza, hints
body          12px    Inter     400    descripciones, catálogo
body-sm       11px    Inter     400    stats secundarios
emphasis      12px    Inter     600    nombres de ítems, énfasis
stat-hero     24px    JB Mono   700    HP/AP/MP en badges principales
stat-main     14px    JB Mono   700    stats en panel derecho
stat-table    11px    JB Mono   700    valores en tabla elemental
stat-small    10px    JB Mono   400    values secundarios, costos
```

### 3.3 Reglas

- **Nunca** usar Inter para un número que representa una stat del juego
- **Nunca** usar Cinzel para un párrafo o descripción de texto
- **Siempre** `tabular-nums` en fuente mono (los números alinean verticalmente)
- Los labels de tabla van en MAYÚSCULAS con `letter-spacing: 0.1em`
- Los valores de stat nunca truncan — si no caben, el layout se ajusta

---

## 4. Layout — The Codex

### 4.1 Grid Principal

```
┌──────────────────────────────────────────────────────────────────────┐
│ HEADER  56px                                                          │
│ [◆ DOFUS FORGE]    [Lv.200] [· Iop ▼]    [⟲⟳] [★ Builds] [↗]      │
├─────────────┬──────────────────────────┬──────────────────────────────┤
│             │                          │                              │
│ LEFT        │ CENTER                   │ RIGHT                        │
│ 260px fixed │ flex-1 (min 320px)       │ 300px fixed                  │
│ overflow-y  │                          │ overflow-y scroll            │
│ scroll      │                          │                              │
│ ─────────── │ ┌────────────────────┐  │ ┌──────────────────────────┐ │
│ CARACTERÍSTICAS    │ EQUIPMENT GRID      │  │ │ ESTADÍSTICAS             │ │
│             │ │ slots 4×3 + ring   │  │ │ HP · AP · MP · Rango     │ │
│ ─────────── │ └────────────────────┘  │ │ ─────────────────────────│ │
│ PERGAMINOS  │                          │ │ TABLA ELEMENTAL          │ │
│             │ ┌────────────────────┐  │ │                          │ │
│             │ │ SET BONUSES        │  │ │ STATS DE COMBATE         │ │
│             │ └────────────────────┘  │ └──────────────────────────┘ │
│             │                          │                              │
│             │                          │ ┌──────────────────────────┐ │
│             │                          │ │ HECHIZOS                 │ │
│             │                          │ │ [WeaponCard]             │ │
│             │                          │ │ [SpellCards...]          │ │
│             │                          │ └──────────────────────────┘ │
└─────────────┴──────────────────────────┴──────────────────────────────┘
```

### 4.2 Espaciado Interno de Paneles

```
Panel padding:          16px (p-4) en desktop, 12px en compact
Gap entre secciones:    12px (space-y-3)
Gap entre elementos:    6px–8px (space-y-1.5 / space-y-2)
Gap en tablas:          4px entre filas (space-y-1)
```

### 4.3 Principio de Densidad

La UI no es espartana ni recargada. Cada elemento tiene espacio para respirar.  
Regla: entre cualquier dos textos, mínimo 4px. Entre secciones, mínimo 12px.  
Si algo parece apretado, el problema es el layout, no reducir el font-size.

---

## 5. Componentes — Especificación Completa

### 5.1 Header

**Estado actual:** Barra con logo, nivel, undo/redo, builds, exportar. Funcional pero genérico.

**Propuesta:**

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  ◆ DOFUS FORGE         Lv [200]  · [Iop ▼]    [⟲][⟳]  [★] [↗]    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘

height: 52px
background: linear-gradient(to bottom, var(--surface-stone), var(--surface-void))
border-bottom: 1px solid var(--metal-edge)

Logo "◆ DOFUS FORGE":
  ◆ = SVG diamond, color --gold, 12px
  "DOFUS FORGE" = Cinzel 13px, --gold, letter-spacing 0.2em
  gap entre ◆ y texto: 6px

Nivel input:
  background: var(--surface-panel)
  border: 1px solid var(--metal-edge-strong)
  border-radius: 6px
  width: 52px, text-align: center
  font: JetBrains Mono 14px 700, --gold-bright
  padding: 4px 8px

Clase selector:
  background: var(--surface-panel)
  border: 1px solid var(--metal-edge)
  min-width: 120px
  [clase-icon 16px] + nombre clase + ▼
  font: Inter 12px 500

Undo/Redo:
  Icon buttons, 28×28px, --ink-muted
  Hover: --ink, background var(--surface-raised)
  border-radius: 6px

Botón Builds:
  ghost button: border 1px solid --metal-edge
  ★ icon + "Mis Builds"
  hover: --gold border

Botón Exportar:
  primary: background --gold-deep, border --gold
  "↗ Exportar" Inter 11px 600 --gold-bright
  solo visible cuando hay ítems equipados
```

---

### 5.2 CharacteristicsPanel

**Estado actual:** Rows compactos + AllocationGrid en hover + ScrollToggles.

**Propuesta visual:**

```
REPOSO (siempre visible):

  CARACTERÍSTICAS                    0 / 995
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  ← budget bar, gold gradient
  
  ▌♥  Vitalidad              3,895
  ▌🌙 Sabiduría                400
  ▌⚡ Fuerza                 1,200
  ▌🔥 Inteligencia              100
  ▌💧 Suerte                    100
  ▌🌪 Agilidad                  510
  
  PERGAMINOS              +100 c/u
  [♥+100] [🌙] [⚡] [🔥] [💧] [🌪]

HOVER DEL PANEL COMPLETO:

  (después de las rows, inline, sin abs-position)
  ─────────────────────────────────
  ♥  [−] [ 395] [+]    🌙 [−] [  0] [+]
  ⚡ [−] [ 300] [+]    🔥 [−] [  0] [+]
  💧 [−] [   0] [+]    🌪 [−] [100] [+]
```

**Specs CSS:**

```css
/* Cada row de característica */
.char-row {
  border-left: 2px solid color-mix(in srgb, {elemColor} 30%, transparent);
  padding: 6px 8px;
  border-radius: 6px;
  transition: background 80ms;
}
.char-row:hover {
  background: var(--surface-parchment);
}

/* Valor total */
.char-value {
  font-family: 'JetBrains Mono';
  font-size: 13px;
  font-weight: 700;
  color: {elemColor};
}

/* AllocationGrid inputs */
.alloc-input {
  width: 42px;
  background: var(--surface-void);
  border: 1px solid var(--metal-edge);
  border-radius: 4px;
  font-family: 'JetBrains Mono';
  font-size: 12px;
  color: {elemColor};
  text-align: center;
}

/* ScrollToggle activo */
.scroll-btn.active {
  background: color-mix(in srgb, {elemColor} 18%, transparent);
  border: 1px solid color-mix(in srgb, {elemColor} 55%, transparent);
}
```

---

### 5.3 Equipment Grid

**Estado actual:** Grid 4-5 columnas, slots de ~72px, imagen centrada, hover muestra ✕.

**Lo que falta:**
- Glow de rareza
- Nombre del ítem bajo la imagen (visible en el slot)
- Slot vacío más invitante
- Efecto de equip (pop animation)

```
SLOT VACÍO:
┌──────────────────┐
│  ┌────────────┐  │  ← borde exterior del slot: 1px dashed rgba(255,255,255,0.08)
│  │            │  │
│  │   [icon]   │  │  ← ícono del tipo de slot (Dofus icon), 24px, 30% opacity
│  │            │  │
│  └────────────┘  │
└──────────────────┘

SLOT CON ÍTEM:
┌──────────────────┐
│  ┌────────────┐  │  ← borde: 1px solid var(--rarity-N), sutil
│  │            │  │     box-shadow: 0 0 8px color(--rarity-N / 25%)
│  │   [img]    │  │  ← imagen del ítem, 52px, object-fit: contain
│  │            │  │
│  └────────────┘  │
└──────────────────┘

SLOT HOVER:
┌──────────────────┐
│  ┌────────────┐  │
│  │ [img + ✕] │  │  ← overlay: rgba(0,0,0,0.4) + ✕ centrado
│  │            │  │     Tooltip aparece arriba con stats del ítem
│  └────────────┘  │
└──────────────────┘
```

**Animación de equip:**
```css
@keyframes item-pop {
  0%   { transform: scale(0.85); opacity: 0; }
  70%  { transform: scale(1.06); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
.slot-item-enter { animation: item-pop 220ms var(--ease-forge) forwards; }
```

---

### 5.4 StatsPanel — Top Badges (HP / AP / MP / Rango)

**Estado actual:** Cuadrados con border-top coloreado, número en text-2xl.

**Propuesta — "Jewel Cards":**

```
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│   ♥ 4,945  │  │   ★  12   │  │   ◈   5   │  │   ◎   6   │
│     PV     │  │    PA     │  │    PM     │  │   Rango   │
└────────────┘  └────────────┘  └────────────┘  └────────────┘

Por badge:
- background: radial-gradient(ellipse at 50% 0%, {dimColor} 0%, var(--surface-panel) 100%)
- border: 1px solid {borderColor}
- border-top: 2px solid {mainColor}  ← acento principal
- box-shadow: 0 0 0 1px var(--bevel-light) inset, 0 4px 16px rgba(0,0,0,0.4)

Número (font mono):
- HP ≥ 10000: text-[18px]
- HP ≥ 1000:  text-[20px]
- Normal:     text-[24px]

Label:
- Inter 8px, uppercase, letter-spacing 0.14em, --ink-faint

Hover → tooltip:
  "Base: 1,050  ·  Vitalidad: 3,895"
  Aparece arriba con fade+scale 140ms
```

---

### 5.5 ElementTable

**Estado actual:** Grid con columnas DMG | RES | RES%, labels de elemento en texto.

**Propuesta:**

```
        DMG     RES    %RES
──────────────────────────────
🟠     +450      —    +12%     ← row activo: background tintado
🔴       —     +30    +08%
🔵       —     +28    +06%
🟢     +120      —    +04%
⚪       —       —      —      ← row vacío: 35% opacity

Cambios:
1. Icono del elemento: 16px (de 14px)
2. Label del elemento: ELIMINADO (solo ícono — ahorro de espacio)
3. Valores positivos en color del elemento (--earth, --fire, etc.)
4. Valores negativos en --negative
5. "—" en lugar de "0" para valores nulos (ya implementado)
6. Filas vacías: opacity 0.35, sin background tintado
7. Columna de robo: ELIMINADA

Header de columnas:
  "DMG" "RES" "%" → Inter 9px uppercase, --ink-faint, text-align right
```

**Filas adicionales (crítico y empuje):**
```
Separadas con divider 1px --metal-edge.
✦ Crítico  → color --crit
⟹ Empuje   → color --earth
Mismo grid, mismas columnas.
```

---

### 5.6 CombatStats Grid

**Estado actual:** Sección colapsable con tabla de stats de combate.

**Propuesta — "Stats Grid":**

```
Siempre visible (sin collapse), en grid 2 columnas:

┌────────────────────────┬────────────────────────┐
│ 🎯 Iniciativa    3,910 │ 🔒 Bloqueo         51 │
│ 🏃 Esquiva           51 │ ⚡ Prosp.          16 │
│ 🛡 AP Parry         40 │ 🛡 PM Parry        40 │
│ ⬇ AP Redu.         40 │ ⬇ PM Redu.        40 │
│ 📦 Pods         6,000 │ 🔮 Invocaciones     1 │
└────────────────────────┴────────────────────────┘

Por stat:
  icono 12px + label Inter 10px --ink-muted + valor mono 11px bold

Stats = 0: ocultos por completo (no "—")
Excepción: Iniciativa y Pods siempre visibles (aunque sean base)
```

---

### 5.7 SpellCard

**Estado actual:** Una columna secuencial. Normal arriba, crítico abajo.

**Propuesta — "Dual Column":**

```
┌──────────────────────────────────────────────────────────┐
│ [img 48px] Flecha de Fuego          [🔥] [★3] [↺2-6] [🎯23%] │
│            ────────────────────────────────────────────  │
│                     NORMAL              CRÍTICO ✦       │
│            🔴        450 – 520          612 – 708       │
│            🟠        120 – 150          163 – 204       │
│            ─────────────────────────────────────        │
│            Σ         570 – 670          775 – 912       │
│                                                          │
│            [Rango: 2-6]  [Crit base: 20%]  [Max/turno: 3] │
└──────────────────────────────────────────────────────────┘

Specs:
- Header: background color-mix(in srgb, {elemPrimario} 12%, --surface-raised)
  border-left: 3px solid {elemPrimario}
- Imagen 48px con border-radius 6px
- Columna NORMAL y CRÍTICO: separadas por un gap de 16px
- Σ total: font-weight 700, --ink, ligeramente más grande (12px)
- Stats del header (PA, rango, crit): íconos del juego 11px + número

Hover de SpellCard:
  box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px {elemColor-border}
  transform: translateY(-1px)
  transition: all 140ms ease-out
```

---

### 5.8 ItemCatalog — Filas

**Estado actual:** ~48px de alto, imagen 40px, stats en texto plano.

**Propuesta:**

```
┌────────────────────────────────────────────────────────┐
│                                                         │
│  [img]   Rodillo de Mami Ayuto            Lv. 200      │
│  [52px]  ♥+450  ★+3  ⚡+2  🔴+80         [★] [+]    │
│  [rarity                                               │
│   glow]                                               │
└────────────────────────────────────────────────────────┘

height: 60px (de ~48px)
padding: 8px 12px

Imagen:
  52×52px, object-fit: contain
  border-radius: 6px
  border: 1px solid var(--rarity-N) (15% opacity)
  box-shadow: 0 0 8px var(--rarity-N) (rarity ≥ 3: visible, < 3: hidden)

Nombre:
  Inter 12px 500, --ink
  truncate max-width

Level badge:
  "Lv. 200" → Inter 10px, --ink-faint

Stats line:
  max 4 stats, inline con ícono 12px + valor mono 10px bold
  color del elemento/stat correspondiente
  overflow: fade (los que no caben desaparecen con gradient)

Set name (si aplica):
  debajo del nombre, --gold 60% opacity, 10px Inter

Acciones (hover únicamente):
  [★] = toggle favorito, --ink-muted → --gold al activar
  [+] = equipar, ghost button, --gold
```

---

### 5.9 SetBonusPanel

**Estado actual:** Lista de sets activos con progress.

**Propuesta:**

```
SET ACTIVO — 2/5 piezas:

  ┌──────────────────────────────────────────┐
  │  [set-icon]  Nombre del Set   ●●○○○      │  ← dots de progreso
  │              ─────────────────────────── │
  │ ✓ 2 piezas: +200 Vitalidad, +10 PA      │  ← tier activo, --positive
  │   3 piezas: +50 Fuerza                  │  ← próximo tier, --ink-muted
  │   4 piezas: +150 Vitalidad              │  ← tiers futuros, --ink-faint
  └──────────────────────────────────────────┘

Dots de progreso:
  ● = pieza equipada, color --gold
  ○ = pieza faltante, color --metal-edge

Tier activo: --positive + checkmark + font-weight 600
Próximo tier: --ink-muted, italic
Tiers lejanos: --ink-faint, 70% opacity
```

---

### 5.10 Tooltips & Popovers

Todos los tooltips siguen el mismo sistema:

```
Appear: scale(0.94) opacity(0) → scale(1) opacity(1)
  duration: 140ms, ease: cubic-bezier(0.16, 1, 0.3, 1)
  transform-origin: desde el elemento disparador

Disappear: opacity(1) → opacity(0)
  duration: 80ms (más rápido salir que entrar)
  NO scale en salida (se siente más limpio)

Background: var(--surface-raised)
Border: 1px solid var(--metal-edge-strong)
Border-radius: 8px
Padding: 8px 12px
Box-shadow:
  0 0 0 1px rgba(255,255,255,0.04) inset,
  0 8px 24px rgba(0,0,0,0.6),
  0 2px 8px rgba(0,0,0,0.4)

z-index: 100 (por encima de todo)
pointer-events: none (tooltips info) / auto (tooltips interactivos)
```

---

## 6. Motion System

### 6.1 Principio: Snappy but Weighted

Las transiciones comunican física. Un panel que aparece lo hace desde una dirección lógica.  
Una acción importante tiene más duración que una micro-interacción.  
Nada debe flotar ni bouncer exageradamente.

### 6.2 Tokens de Motion (ya en el proyecto, usar consistentemente)

```
--dur-fast:      120ms   ← hover fills, icon states, color changes
--dur-base:      200ms   ← panel transitions, button states
--dur-slow:      360ms   ← modals, drawers, page-level changes
--dur-cinematic: 620ms   ← solo para el load inicial, no en uso regular

--ease-out:    cubic-bezier(.22,.61,.36,1)   ← cosas que aparecen
--ease-inout:  cubic-bezier(.65,.05,.36,1)   ← cosas que cambian de estado
--ease-forge:  cubic-bezier(.34,1.2,.64,1)   ← pop con overshoot sutil
```

### 6.3 Catálogo de Animaciones Clave

**Equip Item — "The Pop"**
```css
@keyframes item-equip {
  0%   { transform: scale(0.80); opacity: 0; filter: brightness(1.8); }
  60%  { transform: scale(1.08); opacity: 1; filter: brightness(1.2); }
  100% { transform: scale(1.00); opacity: 1; filter: brightness(1.0); }
}
/* duration: 240ms, ease: ease-out */
```

**Stat Value Change — "The Tick"**
```css
/* Solo para cambios > 0, usando JS + CSS animation */
@keyframes stat-tick {
  0%   { transform: translateY(4px); opacity: 0; }
  100% { transform: translateY(0);   opacity: 1; }
}
/* El delta flotante (+450) */
@keyframes delta-float {
  0%   { transform: translateY(0);   opacity: 1; }
  100% { transform: translateY(-16px); opacity: 0; }
}
/* delta-float: duration 700ms, ease-in */
```

**Tooltip Appear**
```css
@keyframes tooltip-in {
  0%   { transform: scale(0.94) translateY(4px); opacity: 0; }
  100% { transform: scale(1.00) translateY(0);   opacity: 1; }
}
/* duration: 140ms, ease: --ease-out */
```

**Budget Bar — "The Fill"**
```css
/* Usar CSS transition, no keyframe */
.budget-fill { transition: width 280ms var(--ease-out); }
```

**Scroll Toggle Activate**
```css
@keyframes scroll-activate {
  0%   { transform: scale(0.9); }
  50%  { transform: scale(1.1); }
  100% { transform: scale(1.0); }
}
/* duration: 180ms, ease: --ease-forge */
```

---

## 7. UX Flows — El Viaje del Usuario

### 7.1 Primera Vez en la App

```
LOAD → Empty State:
  Equipment grid visible con silhoueta del personaje
  Slots vacíos con ícono del tipo de slot (Dofus icons), 30% opacity
  CharacteristicsPanel: muestra todos en 0, budget disponible visible
  StatsPanel: muestra solo HP/AP/MP base (no tabla vacía)
  Un subtle hint: "Haz clic en un slot para equipar"
  No mostrar hechizos vacíos, no mostrar tabla elemental vacía

PRIMER ÍTEM EQUIPADO:
  Slot hace item-pop animation
  Stats en el panel derecho actualizan con el tick animation
  La tabla elemental aparece si hay stats elementales (fade-in 200ms)
  Si pertenece a un set: SetBonusPanel aparece al fondo del center

SEGUNDO ÍTEM DEL MISMO SET:
  El set bonus se activa visualmente (dots progress update)
  Un flash sutil en el SetBonusPanel (border glow 600ms)
```

### 7.2 Flujo de Búsqueda en Catálogo

```
ABRIR CATÁLOGO (click en slot vacío):
  Modal/panel lateral aparece desde la derecha (slide-in 200ms)
  Slot destacado con borde gold pulsante

FILTRAR:
  El usuario escribe → resultados filtran en tiempo real (sin búsqueda debounced)
  El contador "N ítems" actualiza
  
HOVER SOBRE ÍTEM:
  Comparación con ítem actual del slot (si hay uno)
  Stats ganados en --positive, perdidos en --negative

EQUIPAR:
  item-pop en el slot
  Panel se cierra con fade-out 140ms
```

### 7.3 Asignar Puntos de Característica

```
HOVER SOBRE PANEL:
  AllocationGrid aparece inline (instant, no timer)
  
CLICK EN + (o hold):
  Número sube, budget bar se reduce
  El valor total en la row de arriba actualiza con tick
  
BUDGET = 0:
  Bar llena, color cambia a gold-bright
  Los botones + se deshabilitan visualmente
  
PRESIONAR SHIFT+CLICK:
  Agrega 5 puntos de una vez (hint visible en tooltip)
  
PRESIONAR CTRL+CLICK:
  Agrega 20 puntos de una vez
```

---

## 8. Estados Vacíos — Nunca Genéricos

Cada empty state es específico al contexto del juego.

| Contexto | Mensaje | Visual |
|---|---|---|
| Sin ítems equipados | "Equipa tu primer ítem para ver tus stats" | Silueta de personaje |
| Catálogo sin resultados | "Ningún ítem coincide con ese filtro" | ícono de lupa con ✕ |
| Sin hechizos (clase no seleccionada) | "Selecciona una clase para ver tus hechizos" | ícono de libro |
| Build vacío cargado | "Este build no tiene ítems equipados" | ícono de slot vacío |

---

## 9. Accesibilidad — Mínimos No Negociables

- **Contraste:** todos los textos de datos cumplen WCAG AA (4.5:1)
  - Los valores de stats son legibles sobre sus fondos tintados
  - --ink-faint (#626a7d) sobre --surface-void (#0a0d13) = 4.7:1 ✓
- **Focus visible:** todos los elementos interactivos tienen outline visible al tabear
  - `outline: 2px solid var(--gold); outline-offset: 2px`
- **Keyboard:** + y − son navegables con teclado, Enter confirma
- **Screen reader:** aria-label en íconos sin texto, aria-live en cambios de stats
- **No solo color:** el estado activo/inactivo usa forma además de color (borde + background)

---

## 10. Lo Que NO Hacer — Anti-Patterns

```
❌ GLASSMORPHISM AGRESIVO
   blur() pesado en paneles principales = genérico 2022
   Si se usa blur, máximo en modals y solo 8px

❌ GRADIENTES SIN PROPÓSITO
   rainbow gradients, holográficos, "vivid" sin elemento = decorativo vacío
   Gradientes solo en: barras de progreso, fondos de badge, backgrounds con dirección

❌ ANIMACIONES LARGAS EN ACCIONES FRECUENTES
   El usuario hace 50 clicks por sesión. 400ms por click = 20 segundos perdidos
   Todo lo que el usuario hace frecuentemente: ≤ 140ms

❌ SOMBRAS FLAT
   box-shadow: 0 2px 4px rgba(0,0,0,0.3) en todo → sin profundidad
   Las sombras tienen dos capas: contacto (corta) + ambient (larga)

❌ TIPOGRAFÍA DISPLAY EN BODY
   Cinzel para párrafos o labels largos → ilegible, pedante
   Cinzel solo para: logo, section headers, nombres destacados (max 3-4 palabras)

❌ TODO IGUAL WEIGHT VISUAL
   Si todo es igualmente prominente, nada lo es
   Regla: 1 elemento hero, 2-3 elementos secondary, el resto supporting

❌ EMPTY STATES GENÉRICOS
   "No data" / "No items found" sin contexto → rompe la inmersión
   Siempre contextual al juego: "Equipa tu primer ítem..."

❌ COLORES DE ELEMENTO USADOS FUERA DE SU CONTEXTO
   --earth usado para "éxito", --fire usado para "error" → confunde
   El color del elemento = ese elemento, en cualquier contexto
```

---

## 11. Tokens CSS — Estado Actual vs Necesario

### ✅ YA EXISTE, USAR

```css
/* Superficies */
--surface-void, --surface-stone, --surface-panel, --surface-parchment, --surface-raised

/* Metal */
--metal-edge, --metal-edge-strong, --bevel-light, --bevel-dark

/* Gold */
--gold-deep, --gold, --gold-bright

/* Elementos */
--earth, --fire, --water, --air, --neutral
--earth-glow, --fire-glow, --water-glow, --air-glow
--earth-dim, --fire-dim, --water-dim, --air-dim

/* Stats */
--vitality, --wisdom, --ap, --mp, --crit

/* Ink */
--ink, --ink-muted, --ink-faint, --ink-invert

/* Feedback */
--positive, --negative, --warning

/* Motion */
--dur-fast, --dur-base, --dur-slow, --ease-out, --ease-inout, --ease-forge

/* Shadows */
--shadow-frame, --inset-bevel, --well-inset, --glow-gold
```

### ➕ AGREGAR

```css
/* Rareza */
--rarity-0: #9a9a9a;
--rarity-1: #4da84d;
--rarity-2: #4d9aff;
--rarity-3: #c85aff;
--rarity-4: #ff8c00;
--rarity-5: #ff3c3c;
--rarity-6: #ffd700;

/* Sombras de color (no solo negro) */
--shadow-vitality: 0 4px 16px rgba(210,75,104,0.20);
--shadow-earth:    0 4px 16px rgba(201,138,43,0.20);
--shadow-fire:     0 4px 16px rgba(224,75,42,0.20);
--shadow-water:    0 4px 16px rgba(47,147,216,0.20);
--shadow-air:      0 4px 16px rgba(116,185,63,0.20);
--shadow-crit:     0 4px 16px rgba(224,168,56,0.20);

/* Tipografía */
--font-mono: 'JetBrains Mono', monospace;  /* para CSS donde no alcanza Tailwind */
```

### ❌ DEPRECAR (alias legacy — no usar en código nuevo)

```css
--forge-bg, --forge-surface, --forge-card, --forge-border,
--forge-gold, --forge-gold-l, --forge-text, --forge-muted,
--forge-earth, --forge-fire, --forge-water, --forge-air, --forge-neutral
```

---

## 12. Roadmap de Implementación

Ordenado por impacto visual / esfuerzo:

### 🔴 Prioridad Máxima (impacto inmediato)

- [ ] Agregar JetBrains Mono — todos los números del juego la usan
- [ ] Agregar tokens de rareza (--rarity-0 a -6)
- [ ] Aplicar `font-mono` a TODOS los valores numéricos de stats
- [ ] Stat Badges: radial-gradient + colored box-shadow
- [ ] ElementTable: eliminar label texto, usar solo ícono, valores en color de elemento
- [ ] SpellCard: layout dual-column Normal|Crítico

### 🟡 Alta Prioridad (semana 1)

- [ ] Equipment Slots: rarity border glow
- [ ] Equipment Slots: item-pop animation al equipar
- [ ] Tooltip system: scale+fade 140ms appear, 80ms disappear
- [ ] CombatStats: convertir a grid 2 columnas, ocultar ceros
- [ ] ItemCatalog rows: 60px, imagen más grande, stats con íconos en color

### 🟢 Polish (semana 2)

- [ ] Header: rediseño con clase + ícono
- [ ] Budget bar: transition suave, color change al llegar a 0
- [ ] Stat delta floating animation (+450 que flota y desaparece)
- [ ] SetBonusPanel: dots de progreso + tier activo destacado
- [ ] Empty states contextuales con textos del juego
- [ ] Noise texture en fondo de página

---

## 13. Inspiración — No Copiar, Absorber

| Referencia | Principio a tomar |
|---|---|
| **Path of Building** (PoE) | Densidad extrema de datos sin perder legibilidad. Todo tiene su lugar. |
| **Destiny 2 UI** | Íconos con color propio. Stats con jerarquía clarísima. Brevedad. |
| **Final Fantasy XIV** | Sistema de color de elementos bien ejecutado. Cada elemento se reconoce al instante. |
| **Dark Souls UI** | Minimalismo que comunica peso. Cada elemento importa. Sin decoración vacía. |
| **Riot Games design** | Componentes game-branded sin perder usabilidad moderna. |
| **El juego mismo (Dofus 3)** | Los colores de rareza son canon. El inventario del juego es la referencia. |

---

*Este documento define el estándar. Cada componente nuevo se valida contra estos principios antes de implementarse.*  
*Si algo "se ve bien" pero viola un principio, el principio gana.*
