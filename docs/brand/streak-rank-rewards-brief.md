# Recompensas de racha y rango — brief para lo visual

> División de trabajo: **codex** hace el arte/CSS de esta página (banners
> exclusivos, retratos emblemáticos + marco de avatar). El código (DB, RPC, wiring en React) lo
> hace Claude, en otra tarea. Este documento es solo el brief visual.

Dos sistemas de recompensa independientes, cada uno con su propia pieza
visual — no se mezclan:

| Sistema | Qué mide | Pieza visual | Dónde vive hoy |
|---|---|---|---|
| Racha de login diario (M188, `docs/ROADMAP.md`) | Días consecutivos con sesión iniciada | **Marco de avatar** y catálogo de **retratos emblemáticos exclusivos**; el marco acompaña cualquier retrato elegido | Nuevo — desbloqueos y enganche del marco pendientes de integración |
| Rango por actividad (builds creadas de por vida) | `profiles.builds_count` (ya existe, cuenta TODAS las builds, públicas o no) | **Insignia/chip** (reusa `CustomRankBadge` tal cual) + **banner exclusivo** en los 2-3 umbrales más altos | Chip: `src/features/ranks/` (ya construido, 76 acabados / 140 íconos). Banner: nuevo, ver abajo |

**Decisión explícita (descartada):** NO retratos ilustrados nuevos por
clase para la racha. Multiplicaría 19 clases × 2 géneros × cada tramo —
justo el cuello de botella que ya existe con los 600 retratos planeados
(266 hechos) y su checklist obligatorio de anatomía. En vez de eso, el
"fondo exótico" de la sección 1 es una placa/aura detrás del retrato que
el jugador ya eligió — cero arte nuevo por clase, mismo codex, misma
escalada de color que el aro.

## Decisión del usuario — personajes emblemáticos (2026-11-27)

La colección exclusiva se dedica a **figuras emblemáticas de DOFUS y su
historia**. La selección depende de la identidad narrativa del personaje.
Ser un jefe de mazmorra o una clase jugable no basta para entrar.

La primera tanda aprobada tiene **cuatro retratos y cuatro escenarios**,
un par por cada personaje. Se reemplaza la propuesta inicial de dos
retratos sin nombre y dos paisajes genéricos de forja:

| Personaje | Retrato de perfil | Escenario relacionado |
|---|---|---|
| **Gúltar** | Su identidad, vestuario y expresión reconocibles | Un escenario vinculado a su historia, sus referencias o sus símbolos |
| **Kerubim Crepin** | Su versión característica de mercader veterano | Su tienda de antigüedades y recuerdos de aventuras |
| **Julith** | Su diseño y presencia originales | Un escenario ligado a su identidad e historia de Brakmar |
| **Ogrest pequeño** | Su forma pequeña, expresamente elegida por el usuario, verificada en referencias oficiales | Un escenario relacionado con esa etapa de Ogrest |

Los nombres de los banners serán títulos propios de Forge cuando la
composición sea original; no se presentarán como nombres oficiales de
mapas. Los escenarios deben conservar señales concretas del personaje,
con composición panorámica propia y espacio para la superposición del
avatar. No se sustituye este criterio por una fragua o cueva genérica.

Las asociaciones concretas a hitos de racha y actividad se resolverán
en la integración de recompensas. **No inventar nuevos umbrales ni
asignar automáticamente estos cuatro pares a 100/365 días o 150/500
builds.** Los dos sistemas siguen siendo independientes. El arte puede
quedar preparado antes de que se active el desbloqueo.

Antes de pintar cada personaje, verificar sus referencias y nombres en
los cuatro idiomas contra el cliente **3.7.14.18** y reconstruir sus
modelos con `scripts/extract-characters.py`. Si la representación elegida
solo existe en una obra oficial de Ankama, documentar esa fuente y la
versión exacta sin presentarla como un modelo del cliente. El usuario
corrigió expresamente **Bolgrot por Ogrest**: Bolgrot queda fuera de esta
tanda. El usuario eligió **OGREST PEQUEÑO**: conservar su apariencia pequeña
y no sustituirla por el gigante adulto, ni mezclar ambas anatomías o etapas.
Documentar si la referencia pertenece a una obra oficial de WAKFU, sin
atribuirla al cliente DOFUS 3.7.

La colección mantiene exactamente la técnica **tinta y acuarela** y la
escala de busto de los avatares existentes. Cada personaje tiene pose y
expresión propias. Aplicar el checklist de anatomía a la especie real de
cada figura y revisar cada imagen ampliada y en recorte circular.

**Selección: conservar la PRIMERA generación de cada retrato y banner.**
Registrar las observaciones y terminar la tanda para revisión del usuario.
Editar solo las imágenes y regiones que el usuario solicite expresamente.

Los retratos exclusivos usan `public/avatars/exclusive/v1/` y los banners
`public/banners/exclusive/v1/`. El manifiesto, prompts, fuentes, hashes,
progreso y revisiones vivirán en `docs/brand/emblematic-rewards/`;
los másteres PNG se conservarán localmente en `temp/emblematic-rewards/`.
Estos archivos **no se añaden al selector ni al catálogo público normal**.
La integración debe comprobar el derecho de la cuenta a guardar cada
exclusivo en el servidor, además de filtrar las opciones en la interfaz.

Para ampliar la colección, añadir primero el personaje emblemático y su
escenario a una nueva fila de seguimiento, verificar su identidad, crear
una sola primera versión por pieza y conservar la misma técnica y trazabilidad.

Investigado antes de proponer esto: Discord separa exactamente así — un
**frame** (aro decorativo, identidad constante) vs. una **badge** (ícono de
un logro puntual); no compiten, van juntos. Duolingo celebra la racha en
7 / 30 / 100 / 365 días (el día 50 tiene una animación única aparte). Los
juegos competitivos (LoL y similares) usan la escalera de color
bronce→plata→oro→platino(verde azulado)→diamante(azul)→maestro(morado) —
la tomo como referencia de ESCALADA de color, no la copio literal: platino
azulado y diamante azul no encajan con la identidad dorado/negro de Dofus
Forge, así que la uso solo hasta oro y de ahí invento un tramo final
"fundido" (dorado→ámbar→carmesí) que sí es de marca.

---

## 1. Marco de avatar — aro + fondo exótico (racha de login) — para codex

Una sola pieza visual, dos capas, alrededor y detrás de
`PublicProfileAvatar`/`AccountAvatar`:
- **Aro**: borde de color sobre el círculo del avatar.
- **Fondo/aura**: una placa o resplandor radial DETRÁS del retrato de
  clase que el jugador ya tiene elegido (no lo reemplaza, no es un
  retrato nuevo) — se ve asomando por fuera del círculo del avatar.

**CSS/SVG, sin ilustración de personaje en el marco.** Los retratos son
archivos independientes, incluso en el tramo de 365 días.
No existe hoy ningún `box-shadow`/`border`/fondo ahí — es
tratamiento nuevo.

| Hito | Nombre interno | Tratamiento | Color/CSS |
|---|---|---|---|
| 7 días | `bronze` | Aro sólido fino, sin fondo todavía | `#B07A45` (mismo bronze de `CustomRankBadge.tsx`) |
| 30 días | `silver` | Aro sólido + fondo radial tenue del mismo color | `#A7AFBA` (mismo silver de `CustomRankBadge.tsx`) |
| 100 días | `gold` | Aro más grueso + fondo radial dorado + resplandor sutil | `var(--gold-bright)` (`#eccb78`) + `box-shadow` tipo `--glow-gold` que ya existe en `index.css` |
| 365 días | `molten` | Aro con degradado animado lento (6-8s de ciclo) + fondo/aura "fundida" más presente, sugiriendo metal fundido alrededor del retrato | Degradado cónico `var(--gold-bright)` → `#d9731c` (ámbar) → `#8f1e1e` (carmesí) → vuelta a dorado |

Si codex quiere ir más allá de un degradado CSS plano en el fondo del
tramo `molten` (p. ej. una textura/partícula sutil en SVG o PNG con
transparencia, SIN ningún personaje dibujado), es libre de proponerlo —
pero el degradado ya es un piso aceptable, no bloquear la racha por esto.

**Qué necesito de codex para esto:**
- Confirmar/ajustar los 4 colores arriba contra el resto de la paleta de marca (`src/index.css`, tokens `--gold*`).
- Si quiere ir más allá de un aro CSS plano en el tramo `molten` (p. ej. un SVG con textura de metal/chispas en vez de un degradado liso), proponer ESE asset — pero el degradado CSS ya es aceptable como piso mínimo, no bloquear la racha por esto.
- Nada de esto lleva ilustración de personaje ni anatomía — no aplica el checklist de retratos.

Sin recompensa intermedia tipo "día 50" de Duolingo por ahora — mantener los 4 hitos simples.

---

## 2. Insignia por rango de actividad (builds de por vida)

Reusa el sistema de `custom_rank` **tal cual existe** — mismo componente
`CustomRankBadge`, mismos 76 acabados (`RANK_BADGE_STYLES`), mismos 140
íconos (`RANK_ICONS`), mismos tonos (`solid`/`outline`/`inverse`/`tint`).
**No hace falta que codex diseñe nada nuevo acá** — solo yo elijo
ícono+acabado+color de lo ya existente al escribir el código. Lo dejo
documentado para que quede registrado junto con los banners:

| Umbral | Nombre propuesto (ES) | Ícono (`RANK_ICONS`) | Acabado (`RANK_BADGE_STYLES`) |
|---|---|---|---|
| 10 builds | Aprendiz de la Forja | `anvil` | `standard` |
| 50 builds | Herrero | `hammer` | `bronze` |
| 150 builds | Maestro Forjador | `swords` | `silver` |
| 500 builds | Gran Maestro de la Forja | `crown` | `gold_foil` |

Los 4 íconos y 3 acabados ya existen en `RANK_ICONS`/`RANK_BADGE_STYLES` — verificado, nada que agregar.

---

## 3. Banners exclusivos — para codex (lo que de verdad hay que pintar)

La tanda visual aprobada tiene **cuatro escenarios relacionados con
Gúltar, Kerubim, Julith y Ogrest**. Los umbrales 150/500 builds son la
propuesta previa de integración, no una asignación definitiva de estas
cuatro piezas. Estos **NO entran al selector público de 68 banners**;
se ofrecerán únicamente a las cuentas que los desbloqueen.

Usar referencias del cliente instalado para los lugares que existan como
mapa, siguiendo `docs/brand/profile-banners/README.md`. Documentar como
**composición temática original** los escenarios que organicen motivos
verificados del personaje sin reproducir un mapa concreto.

**Especificación técnica — igual que la colección existente:**
- 1920 × 640 WebP, panorámico 3:1, opaco (sin transparencia).
- Mismo estilo tinta-y-acuarela aprobado del resto de la marca.
- Mantener el foco central despejado de UI; dejar espacio en la esquina inferior izquierda para el overlay circular del avatar (igual que todos los demás).
- Nada de UI, texto, degradados ni círculo de avatar horneados en la ilustración.
- Exportar WebP optimizado a `public/banners/exclusive/v1/<personaje>.webp`, separado del picker público.
- Guardar el PNG máster, el prompt exacto y el hash en un `manifest.json` propio (mismo patrón que `docs/brand/profile-banners/manifest.json`), para que quede trazable igual que el resto.

Los conceptos de **La Fragua Mayor** y **El Corazón del Volcán Forjador**
quedan reemplazados por esta colección de escenarios de personajes.
La exclusividad se apoya en sus historias y composiciones, manteniendo
la MISMA técnica ink-and-watercolor del resto de Forge.

---

## Qué NO le toca a codex

- Nada de lógica: qué cuenta tiene qué racha/rango, cuándo se desbloquea,
  cómo se guarda — todo eso es código (Claude), no arte.
- Nada de la insignia de rango (sección 2) — ya existe el sistema, solo
  se configuran datos.
- Nada que afecte stats del juego ni La Forjadora — puramente cosmético,
  como ya se decidió (ver `docs/MEMBERSHIP_DESIGN.md`, retirado, y
  `docs/ROADMAP.md` M188).
