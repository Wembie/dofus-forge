# Plan de migración 0.4.0 — del estudio al producto

El estudio (`prototype/`) es la referencia. Cada sección reemplaza la interfaz vieja en `src/` por la composición del estudio, sobre los mismos stores, motor y datos. Nada queda solo en el estudio al publicar.

## Reglas

- **Una sección = un commit** (o varios si la sección es grande, cada uno revisable y reversible por sí solo).
- **Paridad antes del commit.** Se lista todo lo que hace hoy la vista vieja (fuente: [INTERACTIONS.md](INTERACTIONS.md) y la fila de la sección en [ROADMAP.md](ROADMAP.md)) y se comprueba punto por punto en la vista nueva. Si falta algo importante, se para y se avisa; lo menor va a la lista de huecos al final de este documento.
- **Sin cambios de cálculo.** Motor, `buildStore`, pasivos, condiciones y Forjadora no cambian; solo su presentación. Las reglas que el estudio repite (lista en ROADMAP, «Reglas exportadas») se exportan desde `src/`, no se copian.
- **Nombres de producción.** Las estadísticas y lo que ya tiene nombre en el producto conservan su nombre y traducción (p. ej. «Placaje», no «Tacle»); las claves nuevas solo para lo que no existía.
- **Textos.** Las claves `*_v4_*` que use un componente migrado pasan a su nombre definitivo, se funden con claves de producción equivalentes o se borran. Siempre en los cuatro idiomas. En español se dice «set», nunca «panoplia».
- **SEO.** Cada ruta conserva título, descripción, canonical, hreflang, JSON-LD, imagen OG y prerender (145 páginas). Se compara el HTML prerenderizado antes y después.
- **Medición.** Se conserva lo que hay hoy: Cloudflare Web Analytics (sin cookies) y el cargador de AdSense en `root.tsx`. Google Analytics está pendiente de decisión (ver abajo).
- **Comprobación por sección:** `pnpm build` sin errores ni avisos, tests en verde, 1440×900, 1366×900, 768, 390 y 360 px, zoom 200 %, ambos temas, teclado y toque (áreas de 44 px), contraste AA. Capturas en `captures/migracion/<sección>/`.
- **Versión.** Todo sale como 0.4.0. Las secciones no suben versión; `VERSION`, `package.json` y los dos changelogs se actualizan una sola vez en R0.
- **Marca y logo:** los hace Codex al final, junto con el logo de los correos. Mientras dure la migración, Codex no toca componentes de `src/` para no pisarnos.

## Ya en producción

| Commit | Qué |
|---|---|
| `3bfaf5a6` | Tipografía, paleta y superficies planas (`design-v04.css`) |
| `6ab6af0d` | Marca, iconos y favicons |
| `32825c2a` | Previews de enlace y ficha exportada |
| `d3547af6` | Tarjetas de build con el personaje entre su equipo |
| `3b03c7e6` | Paso intermedio del taller y ficha completa (el equipo se rehace en S3; la ficha completa se conserva) |
| S1 | Armazón: cabecera, menú del sitio, cuenta, campana, preferencias, aviso de versión y pie en todas las páginas salvo el taller (el taller lo adopta en S2). Capturas en `captures/migracion/s1-armazon/` |
| S2 | Taller: armazón compartido, barra con miga, título de la build (nombre o clase · elemento), nivel, deshacer/rehacer, la Forjadora destacada, Comparar, Publicar/Actualizar, Exportar, Compartir; barra de herramientas; franja inferior con el guardado en el dispositivo, versión de datos, novedades y atajos. Capturas en `captures/migracion/s2-taller-cabecera/` |
| S3 | Panel de equipo: cabecera con espacios ocupados, casillas con nombre del espacio y del objeto en escritorio (cuadradas en móvil), clase y género bajo el personaje, Dofus y trofeos con recuento, compañero y estado de la animación. Conserva tooltip, runas, set, fijar para la Forjadora, quitar, arrastrar entre espacios y continuar al siguiente Dofus. Capturas en `captures/migracion/s3-taller-equipo/` |
| S4 | Panel de estadísticas: equipo y estadísticas en dos columnas (lado según Ajustes); resumen (vida, PA, PM, alcance, críticos, potencia) con topes y sus excesos, características, tabla de elementos con daño, resistencia fija y % (tope 50 %, barra, desglose de daños generales), combate, control y bonificaciones, y cuando los hay modificadores de daño, runas y efectos sin mapear; diferencias en vista de combate; ficha completa. Sin clase, la columna muestra el selector de clase. Nuevo diálogo «Nombre y nivel» desde el nivel de la barra; características se abre desde la barra de herramientas. Capturas en `captures/migracion/s4-taller-estadisticas/` |

## Secciones, en orden

| # | Sección | Producción que reemplaza | Estudio | Notas |
|---|---|---|---|---|
| S1 | Armazón: cabecera, menú del sitio, cuenta, campana, preferencias, aviso de versión, pie | `SiteHeader`, cabecera de `BuilderPage`, `HeaderMenuButton`, `AuthButton`, `NotificationBell`, `SettingsModal`, `UpdateBanner`, `SiteFooter` | `Shell.tsx` | Va primero: todas las páginas lo usan. El taller recupera Explorar, Mis builds, campana, cuenta y pie |
| S2 | Cabecera del taller y barra de herramientas | Botones de cabecera de `BuilderPage`, `ShareBar` | `main.tsx`, `Palette.tsx` | Título de la build, deshacer/rehacer, Forjadora, Comparar, Publicar/Actualizar, borrador; herramientas como pestañas. Paleta Ctrl+K |
| S3 | Panel de equipo | `EquipmentGrid`, `CharacterStage` (sin tocar el render) | `main.tsx`, `BuildSheet.tsx` | Casillas con nombre, recuento de espacios, reiniciar, clase/género bajo el personaje, Dofus y trofeos, multiman. Un solo contexto WebGL |
| S4 | Panel de estadísticas | `StatsPanel`, `ClassPicker` (bloque superior), `CombatViewBar` | `main.tsx` | Resumen, características, tabla de elementos, combate/control/bonificaciones, ficha completa. Sin scroll a 1366×900 |
| S5 | Navegación móvil del taller | Pestañas móviles de `BuilderPage` | `main.tsx` | Barra inferior Forjar / Equipo / Estadísticas / Comparar / Guardar |
| S6 | Catálogo de objetos | `ItemCatalog`, `ItemHoverTooltip`, `ItemSpellEffects` | `Catalog.tsx`, `ItemFacts.tsx` | Exportar reglas de `ItemCard` y `useInfiniteList` |
| S7 | Sets: selector, bonificaciones y detalle | `SetsCatalog`, `SetBonusesPanel`, `SetDetailModal` | `Sets.tsx`, `SetBonuses.tsx` | «set», no «panoplia» |
| S8 | Características | `CharacteristicsPanel` | `Characteristics.tsx` | |
| S9 | Forjamagia | `RuneModal` | `Runes.tsx` | Reglas ya en `runeRules.ts` |
| S10 | Pasivos y vista Equipo/En combate | `PassivesPanel`, `CombatViewBar` | `Passives.tsx` | |
| S11 | Hechizos y arma | `SpellsPanel`, `DamageHover` | `Spells.tsx` | Reglas ya en `spellView.ts` |
| S12 | Simular un combate | `PvpArena` | `Combat.tsx` | Exportar filtro de ataques y crítico efectivo |
| S13 | Comparar dos builds | `ComparePanel`, `CompareRadar` | `Compare.tsx` | Exportar lectura de enlaces y enlace de comparación |
| S14 | Compartir y exportar | `ShareBar`, `ExportCard` | `SharePanel.tsx` | |
| S15 | La Forjadora | `OptimizerModal`, `ForgeParts`, `ForgeItemsPanel`, `ForgePassivesBlock`, `BuildResultCard` | `Forge.tsx` | Estado en `useForge.ts`; exportar escala de Leyes, etapa y reglas de tarjeta |
| S16 | Explorar | `ExplorePage`, `BuildCard`, `TagChips` | `Explore.tsx`, `BuildActivity.tsx` | Filtros en la URL; SEO de la ruta |
| S17 | Detalle de build | `BuildDetailPage`, `BuildCharacterView`, comentarios, versiones, `ReportModal` | `BuildDetail.tsx` | JSON-LD e imagen OG por build |
| S18 | Publicar y actualizar | `PublishModal` | `Publish.tsx` | |
| S19 | Mis builds, guardadas y colecciones | `MyBuildsPage`, `CollectionPage`, `Collections` | `Library.tsx` | |
| S20 | Perfil público | `UserProfilePage`, `FollowListModal` | `Account.tsx`, `surfaces.tsx` | |
| S21 | Páginas de sets | `SetsPage`, `SetPage`, `SetGuideUI` | `SetPages.tsx` | Prerender de 500+ sets; comparar HTML |
| S22 | Lectura: cómo usar, guía de la Forjadora, atajos, acerca de, privacidad, términos | páginas homónimas, `LegalBody` | `Reading.tsx` | |
| S23 | Guía de clase | `ClassGuidePage` | `Reading.tsx` | |
| S24 | Acceso: login, registro, recuperar, nueva contraseña, consentimiento | `AuthModal`, `ResetPasswordModal`, `ConsentGate`, `LegalConsentChecks` | `AuthAccess.tsx` | Limpiar `auth_v4_*` de `useAuthFlow.ts` |
| S25 | Cuenta | `AccountPage` | `Account.tsx` | |
| S26 | Novedades | `ChangelogModal` | `SetBonuses.tsx` | |
| S27 | Administración y moderación | `AdminDashboardPage`, `AdminRanksPage`, `AdminReportsPage`, moderación | — | El estudio no la cerró: primero diseño, luego migración |
| R0 | Cierre | — | — | Ver abajo |

## R0 · Cierre de la release

1. Check que falle si queda una clave `_v4_` en `public/locales` o en `src/`, o una clave sin uso.
2. Retirar el adaptador de tokens viejos (`--forge-*`, alias de `design-v04.css`) cuando ninguna ruta los use.
3. Decidir con el usuario si se retira el código del estudio (depende de las claves `_v4_`); las capturas y documentos se quedan.
4. QA completo de las 19 rutas y los criterios de release del ROADMAP.
5. `VERSION` y `package.json` a 0.4.0, `docs/CHANGELOG.md` y `src/data/changelog.ts` con una sola entrada.

## Decisiones pendientes

- **Google Analytics — decidido (18-11-2026): GA4 con modo de consentimiento v2**, usando el mensaje de consentimiento de Google que ya muestra AdSense. Cloudflare Web Analytics se mantiene. Eventos clave: equipar, ejecutar la Forjadora, publicar, compartir, exportar (cada sección añade los suyos). La política de privacidad se actualiza en los cuatro idiomas y la CSP permite los dominios de GA. Falta el ID de medición (`G-…`).
- **Administración (S27):** diseñar en el estudio antes de migrar.

## Huecos encontrados

Se anotan aquí durante la migración: lo que falta, la sección y si bloquea.

| Sección | Hueco | Bloquea |
|---|---|---|
| S1 | La barra lateral «Mi taller / Aprender» de las páginas del estudio no se migró: no figura en la especificación del armazón y repite la navegación de la cabecera y del menú. Confirmar si se quiere | No |
| S1 | El tema se llama «Oscuro / Claro» en lugar de «Tinta / Mineral» (nombres internos de la paleta que un jugador no reconoce) | No |
| S1 | Campana y menú de cuenta con sesión iniciada no se pudieron ver en local (sin sesión); su lógica no cambió, solo el marcado | No |
| S2 | «Guardar borrador» y «Borradores» del estudio no se migraron: el producto guarda la build sola en el dispositivo y no tiene borradores con nombre. La barra muestra «Guardado en este dispositivo». Si se quieren borradores, es una función nueva | Decidir |
| S2 | La etiqueta «Nuevo» de la Forjadora se quitó: ahora es el botón destacado de la barra | No |
| S2 | El nivel de la barra todavía no abre «Nombre y nivel»; llega con la clase y el personaje (S4) | No |
| S2 | Las herramientas de la barra llevan al panel actual de la página (características, pasivos, hechizos, combate, bonus de set) hasta que cada una tenga su diálogo (S7–S12); «Compartir y exportar» se añade en S14 | No |
| S2 | El `<h1>` de la página principal pasa de «Dofus Forge» al título de la build o, sin clase, a «Planificador de builds de Dofus 3» (en cada idioma), que es lo que Google ve en el HTML prerenderizado | No |
| S3 | En móvil, las tarjetas de «Sets activos» quedan en dos columnas apretadas (ya era así) | No |
| S3 | El botón «reiniciar equipo» del estudio no se migró: el store no tiene una acción que quite todo el equipo y sus runas en un paso deshacible; crearla es una función nueva | Decidir |
| S3 | El compañero conserva el nombre de producción («Compañero») en lugar de «Multiman» del estudio | No |
| S4 | «Distribuir características» abre el panel de producción dentro del diálogo nuevo hasta S8 (composición del estudio) | No |
| S4 | Revisión del usuario aplicada: nombres de producción (Placaje, Huida, Retira PA, PV, AL…) en lugar de los del estudio, icono en cada estadística y en forjamagia, sin Vitalidad en la fila de características (ya está en PV), Fuerza/Inteligencia/Suerte/Agilidad con su valor más la potencia y el total, Crítico y Empuje de vuelta en la tabla de elementos, Invocaciones en el resumen y Potencia en Bonificaciones, texto más grande | No |
| S4 / S17 | `StatsFromBlock` sigue en la página de una build hasta S17, que usará `StatsOverview` | No |
| S7 / S10 | Los paneles viejos de bonus de set y pasivos fallan axe con equipo puesto (38–42 contrastes por el texto de bonus inactivos y un `aria-label` no permitido); se corrigen al migrarlos | No |
| S24 | `useAuthFlow.ts` usa `auth_v4_password_hint` y `auth_v4_connection_error` | No |
