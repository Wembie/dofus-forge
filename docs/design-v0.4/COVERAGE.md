# Cobertura de rutas, módulos y estados

Inventario basado en `src/routes.ts`, `src/pages` y `src/features`. «Plantilla» significa una propuesta visual compartida; no significa que todas las rutas estén diseñadas en detalle o implementadas.

| Página / ruta | Propuesta | Requisitos propios pendientes |
|---|---|---|
| BuilderPage `/` | Prototipo con personaje, store, historial y Forjadora actuales; Figma a actualizar | Rediseñar las herramientas en adaptación provisional: hechizos e interior de la Forjadora |
| ExplorePage `/explore` | Frame 04; tarjeta con ficha completa en el estudio | Filtros reales, ordenar, vacío, carga, paginación, cifras reales. PA, PM y alcance de la tarjeta: el listado actual solo trae los objetos (`snapshot.e`), así que requieren esos tres valores en la fila o el snapshot completo. Imagen fija del personaje: exponerla desde `src/lib/character` en lugar de duplicar la escena del visor |
| BuildDetailPage `/build/:id` | Frame 08 | Autor, versión, duplicar, likes, comentarios, reportar, enlace eliminado |
| MyBuildsPage `/my-builds` | Frame 07 | Local/nube, guardar, renombrar, borrar, duplicar, conflicto |
| CollectionPage `/c/:id` | Plantilla 07 | Colección vacía, permisos, orden, edición y compartir |
| AboutPage `/about` | Plantilla editorial 09 | Identidad, información del proyecto, contacto |
| HowToUsePage `/how-to-use` | Frame 09 | Guía por tareas, enlaces profundos y navegación móvil |
| ForgeGuidePage `/forge-guide` | Plantilla editorial 09 | Objetivos, límites, resultados incompletos, restricciones |
| ShortcutsPage `/shortcuts` | Plantilla editorial 09 | Teclas por plataforma, accesibilidad y equivalentes táctiles |
| PrivacyPolicyPage `/privacy` | Plantilla de lectura pendiente | Mantener texto y fecha; índice y ancho de lectura |
| TermsPage `/terms` | Plantilla de lectura pendiente | Mantener texto y enlaces; tipografía accesible |
| ClassGuidePage `/classes/:classId` | Plantilla editorial 09 | 19 clases, roles y hechizos, datos del juego |
| SetsPage `/sets` | Derivación de catálogo pendiente | Índice, filtros, piezas, nivel y SEO |
| SetPage `/sets/:slug` | Derivación de catálogo pendiente | Bonos por piezas, condiciones, equipar y comparación |
| UserProfilePage `/u/:username` | Derivación de 07/08 pendiente | Perfil, seguimiento, builds, colecciones, vacío |
| AccountPage `/account` | Frame 14 | Datos, privacidad, preferencias, sesión y acciones sensibles |
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
| publish | Metadatos, visibilidad, publicar/actualizar y errores |
| pvp | Parámetros del objetivo y contexto de combate |
| ranks | Visualización y administración coherentes |
| set-guide | Lectura de piezas y bonos por tier |
| share | URL, copiar, imagen y metadatos |
| spells | Arma, normales/variantes, niveles y daños calculados |
| stats-panel | Resumen, ficha de 73 campos, valores brutos y origen |

El inventario automático inicial leyó 290 fuentes de código (47 552 líneas), incluyendo 124 TSX con pruebas. La segunda auditoría indexó 94 TSX de producto y 495 nodos con eventos/destinos en `INTERACTIONS.md`. Eso es cobertura de inventario, no una afirmación de revisión manual exhaustiva. `DOMAIN-AUDIT.md` documenta los contratos revisados y las pruebas ejecutadas. Los estados secundarios y autenticados aún necesitan comprobación manual antes del cierre D0/D3.
