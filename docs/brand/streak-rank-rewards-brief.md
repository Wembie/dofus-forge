# Recompensas de racha y rango — brief para lo visual

> La integración de rachas y permisos del servidor corresponde a M188.
> Por petición posterior del usuario, Codex también rediseña su ubicación,
> ventanas y marcos en React/CSS, conservando las reglas y permisos existentes.
> Diseño, capturas y comprobaciones: [experiencia de rachas](../design/streak-rewards/README.md).

**Decisión final (2026-11-27): UN SOLO eje.** El rango por actividad
(builds creadas) se descartó durante la integración — dos ejes separados
complicaba sin necesidad (criterio del usuario). Todo — marco de avatar,
insignia de rango y los 16 pares de retrato/escenario exclusivos — depende
únicamente de `profiles.login_streak_best` (racha de login, histórico
máximo). Los marcos mantienen 4 cortes: 7 / 30 / 100 / 365 días. El arte
tiene hitos intermedios; varias recompensas pueden compartir un mismo día.

| Hito | Marco | Personaje exclusivo |
|---|---|---|
| 7 días | bronce | Kerubim Crepin |
| 30 días | plata | Julith |
| 100 días | oro | Gúltar |
| 365 días | ancestral (`molten` internamente) | Ogrest pequeño |

La insignia/chip de `CustomRankBadge` queda reservada para rangos
asignados a mano por un admin (Owner, Youtuber, etc.) — esas SÍ se
muestran todas juntas (M188), pero ya no hay una insignia automática de
"actividad": esa parte se quitó por completo.

**Decisión explícita (descartada):** NO retratos ilustrados nuevos por
clase para la racha. Multiplicaría 19 clases × 2 géneros × cada tramo —
justo el cuello de botella que ya existe con los 600 retratos planeados
(266 hechos) y su checklist obligatorio de anatomía. El marco acompaña
al retrato elegido mediante geometría SVG y colores de metal. La petición
posterior del usuario descarta las auras y los resplandores.

## Decisión del usuario — personajes emblemáticos (2026-11-27)

**Ampliación funcional 0.4.29:** los administradores pueden elegir todos
los retratos y escenarios exclusivos sin esperar días. La excepción se
valida mediante su rol persistido, sin aumentar el récord ni conceder
marcos históricos. Usuarios y moderadores mantienen los hitos originales.

La racha **activa** añade además una plaza de build por cada cinco días,
sobre el cupo base de 50 o el cupo superior de un rango vigente. Los rangos
ilimitados siguen sin límite. Este bono temporal se pierde al romper la
racha; todas las builds existentes permanecen guardadas y editables. Los
retratos, escenarios y marcos ganados por récord siguen siendo permanentes.

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

La asignación original 7/30/100/365 de Kerubim/Julith/Gúltar/Ogrest se
conserva. En **0.4.28** se amplía a **16 pares**, agrupados en Primeros pasos,
Hazañas y Leyendas, con una vista adicional de la colección de Bakara.
Joris 14, Atcham 21, Bakara normal 45, Jahash 60, Otomaï y Bakara borracha A
90, Bakara B 120, Dathura 150, Bakara C 180, Djaul 200, Bakara D 240 y Jiva
270. Las cuatro opciones borrachas fueron elegidas por el usuario; cada una
incluye su escenario propio. [Tabla y seguimiento](emblematic-rewards/README.md).

Para nuevas incorporaciones, el criterio sigue siendo **personajes
emblemáticos y escenarios relacionados con ellos**. Se prioriza la forma de
la animación oficial cuando exista, manteniendo tinta y acuarela y el
encuadre de busto de Forge. No mezclar vestuario ni anatomía de otras obras:
Bakara normal lleva capa marfil y diadema/collar verde azulado; la borracha
lleva el atuendo sin capa y cabello revuelto de la escena de la película.

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
La primera tanda de **cuatro retratos y cuatro escenarios** ya está
generada e inspeccionada para revisión del usuario. Ver
[seguimiento, previews y observaciones](emblematic-rewards/README.md) y
[manifiesto con prompts y fuentes](emblematic-rewards/manifest.json).
Estos archivos **no se añaden al selector ni al catálogo público normal**.
La integración debe comprobar el derecho de la cuenta a guardar cada
exclusivo en el servidor, además de filtrar las opciones en la interfaz.

Para ampliar la colección, añadir primero el personaje emblemático y su
escenario a una nueva fila de seguimiento, verificar su identidad, crear
una sola primera versión por pieza y conservar la misma técnica y trazabilidad.

## 1. Marco de avatar y experiencia de racha — decisión vigente

El usuario rechazó los aros con resplandor y pidió conservar el diseño de
la **0.4.0**, incluida la **llama original**. Se sustituyen las propuestas
anteriores de aura radial, degradado cónico y animación fundida.

| Hito | Nombre interno | Tratamiento vigente |
|---|---|---|
| 7 días | `bronze` | Aro mate de bronce, cierres laterales y remaches |
| 30 días | `silver` | Plata, doble grabado y cierre superior |
| 100 días | `gold` | Oro con sello de yunque inferior |
| 365 días | `molten` | Ancestral: incrustaciones oscuras y pequeños acentos rojizos |

SVG escrito a mano y CSS, sin ilustraciones generadas para el marco,
halos, desenfoques, partículas ni animaciones. El retrato permanece visible.
Los colores proceden de la paleta de la página y los metales existentes.

El récord público ocupa una estadística propia junto a builds, likes y
comentarios; desaparece el chip al lado de la fecha de alta. La racha activa
dispone de un bloque en Cuenta, entre identidad y pestañas, con récord y
próxima recompensa. El menú de cuenta abre la ventana de recompensas.

La ventana permite inspeccionar cada pareja de retrato/escenario y su marco,
ver hitos alcanzados y pendientes, y abrir la galería de personalización.
Se conservan las reglas de desbloqueo y el guardado explícito existente.
No se modifica DB, RPC ni la lógica de rachas. Ver
[diseño, capturas y pruebas](../design/streak-rewards/README.md).

---

## 2. Insignia de rango por actividad — DESCARTADA

Se había propuesto reusar `custom_rank`/`CustomRankBadge` para un rango
automático por cantidad de builds creadas (10/50/150/500). Se quitó por
completo (2026-11-27, criterio del usuario: complicaba sin necesidad).
`CustomRankBadge` sigue existiendo, pero solo para rangos que un admin
asigna a mano (Owner, Youtuber, etc.) — nunca uno automático.

---

## 3. Banners exclusivos — para codex (lo que de verdad hay que pintar)

La tanda visual aprobada tiene **cuatro escenarios relacionados con
Gúltar, Kerubim, Julith y Ogrest**, uno por cada corte de racha (7/30/100/365
días — ver tabla arriba). Estos **NO entran al selector público de 68
banners**; se ofrecerán únicamente a las cuentas que los desbloqueen.

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

## Alcance conservado del servidor

- Nada de lógica: qué cuenta tiene qué racha/rango, cuándo se desbloquea,
  cómo se guarda — todo eso es código (Claude), no arte.
- Nada de la insignia de rango (sección 2) — ya existe el sistema, solo
  se configuran datos.
- Nada que afecte stats del juego ni La Forjadora — puramente cosmético,
  como ya se decidió (ver `docs/MEMBERSHIP_DESIGN.md`, retirado, y
  `docs/ROADMAP.md` M188).
