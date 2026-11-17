# Cobertura de rutas, módulos y estados

Inventario basado en `src/routes.ts`, `src/pages` y `src/features`. «Plantilla» significa una propuesta visual compartida; no significa que todas las rutas estén diseñadas en detalle o implementadas.

| Página / ruta | Propuesta | Requisitos propios pendientes |
|---|---|---|
| BuilderPage `/` | Prototipo local con personaje, store, historial y Forjadora actuales | Migrar las composiciones del estudio al producto (fase I2–I4) |
| ExplorePage `/explore` | Composición local propia: cifras de la comunidad, búsqueda, clase, etiqueta, orden, cargar más, filtros activos, estados de carga, error, vacío y error al cargar más; cuatro idiomas y cinco tamaños | Integrar `fetchPublicBuilds`, `fetchCommunityStats` y `fetchTags` reales y el prerender del loader. PA, PM y alcance de la tarjeta: el listado actual solo trae los objetos (`snapshot.e`), así que requieren esos tres valores en la fila o el snapshot completo. Imagen fija del personaje: exponerla desde `src/lib/character` en lugar de duplicar la escena del visor |
| BuildDetailPage `/build/:id` | Composición local propia: cabecera con autor y etiquetas, acciones sociales, cifras y tu valoración, personaje con equipo, ficha completa, panoplias, pasivos, comentarios, versiones y remixes; visitante, dueño, sin sesión y administración; cargando, no disponible, remix y acciones que fallan; cuatro idiomas y cinco tamaños | Integrar `fetchBuildById`, `fetchViewerState`, comentarios, versiones y remixes reales, `recordBuildView`, el prerender del loader y el SEO. La ficha del estudio usa `recompute` con todas las características pergaminadas; con datos reales debe leer el bitmask `snapshot.s` y las runas de `snapshot.r` (el estudio no tiene runas de ejemplo, así que la sección de forjamagia no aparece) |
| MyBuildsPage `/my-builds` | Composición local: Mis builds, Guardadas y Colecciones; densidades, filtros y acciones por equipo; [revisión](LIBRARY-REVIEW.md) | Integrar servicios, snapshots completos e identidad de edición; comprobar permisos y sesión real. Los guardados antiguos locales siguen siendo de solo lectura para Comparar |
| CollectionPage `/c/:id` | Composición local de propietario/visitante; creación, edición, selector, eliminación, vacío, error y permisos; [revisión](LIBRARY-REVIEW.md) | Integrar consultas/pertenencia, conservar orden y privacidad reales y probar con servidor |
| AboutPage `/about` | Plantilla editorial 09 | Identidad, información del proyecto, contacto |
| HowToUsePage `/how-to-use` | Frame 09 | Guía por tareas, enlaces profundos y navegación móvil |
| ForgeGuidePage `/forge-guide` | Plantilla editorial 09 | Objetivos, límites, resultados incompletos, restricciones |
| ShortcutsPage `/shortcuts` | Plantilla editorial 09 | Teclas por plataforma, accesibilidad y equivalentes táctiles |
| PrivacyPolicyPage `/privacy` | Plantilla de lectura pendiente | Mantener texto y fecha; índice y ancho de lectura |
| TermsPage `/terms` | Plantilla de lectura pendiente | Mantener texto y enlaces; tipografía accesible |
| ClassGuidePage `/classes/:classId` | Plantilla editorial 09 | 19 clases, roles y hechizos, datos del juego |
| SetsPage `/sets` | Derivación de catálogo pendiente | Índice, filtros, piezas, nivel y SEO |
| SetPage `/sets/:slug` | Derivación de catálogo pendiente | Bonos por piezas, condiciones, equipar y comparación |
| UserProfilePage `/u/:username` | Composición local propia; [revisión](ACCOUNT-REVIEW.md) | Integrar perfil, seguimiento, builds y colecciones reales |
| AccountPage `/account` | Composición local propia de perfil, seguridad y sesión; [revisión](ACCOUNT-REVIEW.md) | Integrar servicios y sesión reales, conservando guardado parcial y cambios pendientes |
| AdminDashboardPage `/admin` | Pantalla pendiente | Resumen real, permisos, navegación operativa |
| AdminRanksPage `/admin/ranks` | Pantalla pendiente | Tabla, edición, vista previa, errores y permisos |
| AdminReportsPage `/admin/reports` | Pantalla pendiente | Cola, estado, contexto, decisión y confirmación |

## Módulos

| Módulo | Superficie de diseño / paridad requerida |
|---|---|
| auth | Iniciar sesión, registro, reset, consentimiento, errores y volver a la tarea |
| builds | Tarjetas, personaje, equipo, autor, etiquetas y seguir |
| changelog | Notas de versión, lectura y cierre con retorno de foco |
| characteristics | Asignación, costes, presupuesto y pergaminos |
| class-picker | Clase, género, nivel; preservar espacio del personaje |
| collections | Crear, organizar y compartir |
| compare | Tabla completa, diferencias, referencias y aplicar |
| equipment | Slots, catálogo, favorito, runas, sets, efectos y condiciones |
| moderation | Reporte, estado y respuesta |
| notifications | Leído/no leído, vacío, carga y destino |
| optimizer | Configuración, piezas fijas, cancelación, explicación y resultados |
| passives | Equipo/combate, controles, condiciones y deltas |
| publish | Composición local propia (`prototype/Publish.tsx`): nueva, actualizar, remix, enlace ajeno, sin sesión, cargando la publicación, error, límite y etiquetas no disponibles. Pendiente integrar `publishBuild`, `updateBuild`, `setBuildTags` y `fetchBuildById` reales |
| pvp | Parámetros del objetivo y contexto de combate |
| ranks | Visualización y administración coherentes |
| set-guide | Lectura de piezas y bonos por tier |
| share | URL, copiar, imagen y metadatos |
| spells | Arma, normales/variantes, niveles y daños calculados |
| stats-panel | Resumen, ficha de 73 campos, valores brutos y origen |

El inventario automático inicial leyó 290 fuentes de código (47 552 líneas), incluyendo 124 TSX con pruebas. La segunda auditoría indexó 94 TSX de producto y 495 nodos con eventos/destinos en `INTERACTIONS.md`. Eso es cobertura de inventario, no una afirmación de revisión manual exhaustiva. `DOMAIN-AUDIT.md` documenta los contratos revisados y las pruebas ejecutadas. Los estados secundarios y autenticados aún necesitan comprobación manual antes del cierre D0/D3.
