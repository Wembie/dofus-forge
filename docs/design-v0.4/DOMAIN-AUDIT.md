# Paridad funcional antes de cerrar el diseño

Revisión del 15 de noviembre de 2026. El motor y los módulos de producto son la referencia. La propuesta cambia presentación, organización y acceso a acciones. No redefine fórmulas, reglas de equipo ni criterios de optimización.

## Evidencia y alcance

- Inventario AST de **94 archivos TSX y 495 nodos con eventos o destinos**: [INTERACTIONS.md](INTERACTIONS.md). Incluye controles reutilizables, enlaces, campos, callbacks e interacciones de puntero; no equivale a 495 botones distintos ni a 495 pruebas manuales.
- Revisión directa de los contratos de estadísticas, características, runas, equipo, historial, pasivas, catálogos, comparación y Forjadora. Lectura de los manejadores inventariados para las páginas secundarias.
- Suite del proyecto: **65 archivos, 434 pruebas aprobadas**.
- Rust: **47 pruebas aprobadas; 13 omitidas** por su configuración de diagnóstico/benchmark. No se presentan como ejecutadas.
- El prototipo reutiliza `useBuildStore`, `useDataStore`, `useHistory`, `OptimizerModal`, su Worker y el WASM existentes. `model.ts` conecta el catálogo completo, las piezas y el snapshot de borrador. No calcula una build alternativa con fórmulas nuevas.
- `ForgeModal.tsx` es un adaptador local de presentación: reorganiza los elementos React del encargo conservando sus callbacks. La migración de producto debe sustituir esa identificación por clases por secciones con interfaces explícitas. No es todavía arquitectura de producción.
- Los registros de uso en la nube se sustituyen por funciones locales vacías en este estudio. La búsqueda y sus resultados sí son reales.

## Correcciones de la propuesta anterior

| Discrepancia del estudio | Corrección / regla de aceptación |
|---|---|
| «Neutral» compartía una columna de características con Fuerza | Las seis características se presentan aparte. Neutral pertenece a daños, robos y resistencias; no existe una característica asignable Neutral |
| Dos anillos de panoplia idénticos en el ejemplo | Segundo anillo distinto; las mutaciones pasan por el store del producto |
| «Daños generales» podía parecer un valor adicional a sumar a la tabla | Explicar que ya está incluido en cada total elemental; no sumarlo por segunda vez |
| La Forjadora no era visible en el taller | Acción principal explícita en escritorio y acceso Forjar en móvil; encargo, búsqueda y resultados reales |
| Borrador guardaba solo una lista de objetos | Usar el codec existente: clase, nivel, género, asignación, pergaminos, 17 espacios, runas, firma, transformación y pasivas |
| La interacción de clase estaba limitada a dos ejemplos | Selector con las 19 clases y nombres localizados del proyecto |
| «Otros efectos» siempre mostraba Ninguno | Mostrar los pares nombre/valor reales cuando `unknownStats` no está vacío |

## Qué suma y qué significa

| Concepto | Contrato del código actual | Consecuencia para UX/UI |
|---|---|---|
| Características | `CHARACTERISTICS`: vitalidad, sabiduría, fuerza, inteligencia, suerte y agilidad | Seis controles de asignación y seis estados de pergaminado; ningún control Neutral |
| Estadísticas de equipo | `computeStats`: base → objetos → bonus de panoplia → runas → daños generales → asignación/pergaminos → derivados → límites | Resumen, detalle y comparación consumen la misma salida; cambiar layout no cambia resultados |
| Valores de efectos | Se usa `max` cuando es distinto de cero y mayor que `min`; en otro caso `min` | Conservar penalizaciones; cero, ausencia y valor negativo no se confunden |
| Armas | `itemStatEffects` excluye líneas de ataque/robo del arma de los bonus pasivos | Distinguir daño base del arma de «+daños» del personaje |
| Panoplias | Piezas distintas por ID; se aplica solamente el mayor tramo alcanzado, no se suman todos | Mostrar tramo activo, piezas únicas y próximo tramo. La vista previa recalcula el conjunto completo |
| Runas | `runeEffectsForSlots` ignora espacios vacíos; `flattenRunes` suma normal y transcendencia de la misma estadística | Desglosar por objeto sin duplicar totales. Una runa huérfana no aparece como bonus activo |
| Potencia | Campo separado; en objetivos de Forjadora cuenta para fuerza/inteligencia/suerte/agilidad | Presentar base, potencia y valor efectivo con etiquetas distintas; no añadirla a vitalidad o sabiduría |
| Daños generales | Se incorporan una vez a los cinco daños elementales | El desglose explica la contribución común; la tabla muestra el total ya calculado |
| Derivados | Iniciativa de las cuatro características elementales; tacle/huida de agilidad; retiros/esquivas de sabiduría; pods de fuerza; prospección de suerte; PV de vitalidad | El origen del valor distingue aportes directos y derivados. No ofrecer controles independientes que cambien derivados sin base |
| Presupuesto | `pointCost`, `statBudget`, `SCROLL_BONUS`; límites de asignación gestionados por el store | Mostrar gastado/disponible y cambios válidos. Nunca inventar un presupuesto visual distinto del motor |
| Límites de equipo | PA 12, PM 6, alcance 6, invocaciones 6, resistencias porcentuales 50 en el código actual | Mostrar valor aplicado y bruto/exceso donde el modelo lo conserva; no limitar el texto ocultando el exceso |
| Combate | `withPassives` aplica solo pasivas de objetos equipados y respeta acumulaciones compartidas | Conservar el selector Equipo/Combate y los controles de pasivas; declarar el contexto en exportación y comparación |
| Límites en combate | Los bonus de PA/PM/alcance de combate no reciben los límites de equipo; resistencia sigue a 50 | No reutilizar una regla de presentación que recorte indiscriminadamente ambos modos |
| Daño final / vulnerabilidad | Multiplicadores de combate separados; no son objetivos de la Forjadora | Se consultan en su contexto. No añadirlos al formulario por recorrer ciegamente todos los campos de `StatBlock` |
| Efectos desconocidos | `unknownStats` conserva efectos no mapeados | Listarlos y señalar su naturaleza; nunca descartarlos ni inventar cómo afectan al cálculo |

Los comentarios del motor mantienen supuestos pendientes de verificar sobre fórmulas base y costes. Esta auditoría verifica paridad con el repositorio; no certifica de forma independiente todas las reglas del juego vigente.

## Equipo, condiciones y decisiones

| Acción actual | Qué debe conservarse | Organización propuesta |
|---|---|---|
| Elegir espacio | `SLOT_CONFIGS`, tipo compatible, mascota/montura y Multiman diferenciados | Catálogo contextual; espacio y objeto actuales siempre visibles |
| Elegir un objeto | `catalogBlock`: Dofus único, anillo de panoplia no repetido, una Prismaradita | Motivo junto al objeto bloqueado y alternativa clara; no solo botón desactivado |
| Equipar desde store | `releaseConflicts` resuelve incompatibilidades | Avisar qué otro espacio cambia; preservar undo |
| Volver a elegir el mismo objeto | `equipItem` conserva sus runas | No borrar modificaciones por una selección repetida |
| Sustituir / quitar | Limpiar runas, firma y transformación del espacio correspondiente | Mostrar impacto antes y posibilidad de deshacer después |
| Arrastrar anillos / Dofus | `swapSlots` mueve objeto, runas, firma y transformación juntos | Añadir alternativa visible por toque y teclado. No depender del arrastre |
| Equipar panoplia | `assignSetSlots` y `equipMultiple` resuelven espacios | Vista previa del conjunto; conservar «equipar todo», piezas individuales y quitar |
| Siguiente Dofus | El catálogo puede avanzar al siguiente espacio | Progreso 1–6, volver y terminar sin perder filtros |
| Runas | Modos normal/transcendencia, cantidades, rangos válidos por objeto, búsqueda, borrar y firma | Editor contextual con resumen de impacto y retorno al mismo objeto |
| Transformar arma | Neutral daño/robo → elemento elegido, ratios 85/68/50; datos separados de runas | Sección exclusiva de armas compatibles, con daño antes/después |
| Condiciones de objeto | El equipo manual muestra expresiones; `computeStats` no certifica por sí solo su cumplimiento | No presentar «build válida» solo porque se calculan stats; mantener condiciones visibles |
| Condiciones en la búsqueda | Rust evalúa nivel, piezas de set y estadísticas; devuelve `conditionsOk` y `meetsRequired` | Condiciones de uso y objetivos del encargo son indicadores distintos |

## Forjadora: recorrido completo

1. **Entrar:** botón permanente del taller; sin clase abre selección. El acceso `?forge=1` de la guía se conserva en producto.
2. **Encargo:** objetivos primero; reglas y objetos a su lado en escritorio. Móvil mantiene el mismo orden semántico y enlaces internos a cada sección.
3. **Buscar:** etapa, tiempo, evaluaciones, mejor resultado y mínimos cumplidos. La temperatura representa estancamiento; no se vende como porcentaje de finalización.
4. **Templar / apagar:** templar hace la pasada final; apagar termina Workers y vuelve al encargo. Ninguna de esas acciones aplica automáticamente una build.
5. **Resultados:** mejor candidato y alternativas; objetivos alcanzados/faltantes, calidad, condiciones, runas, puntos disponibles y pasivas consideradas.
6. **Decidir:** fijar/excluir desde resultados; reforjar usa los candidatos como semillas; desde cero reinicia la búsqueda; ajustar conserva el encargo; cargar aplica una sola transición reversible.

| Control / caso | Regla que debe conservar el diseño |
|---|---|
| Mínimo, Ley y tope | Tres conceptos diferentes. La Ley es valor por punto, no un porcentaje ni un ranking genérico de importancia |
| Cinco atajos de Ley | `leyPreset` aplica valores específicos de cada estadística; no sustituir por 1–5 sin conversión |
| Mínimo con Ley 0 | Se registra como mínimo incumplido aunque no produzca penalización de puntuación; mantener el aviso |
| Tope suave / estricto | Suave deja de valorar excedente; estricto introduce una violación. Campo vacío o 0 se normaliza a sin tope |
| Estadística activada | `isActive`: mínimo, peso o tope estricto; limpiar restaura `emptyReq` |
| Objetivos disponibles | Los grupos provienen de `OPTIMIZER_STATS` / `STAT_GROUPS`; no de todos los campos internos de stats |
| Fijar objeto | Obliga a usar ese ID; puede recibir forjamagia nueva |
| Conservar espacio | `lockedSlots` conserva el objeto y sus runas; no es equivalente a fijar el ID |
| Excluir | Es incompatible con fijar el mismo objeto; el store resuelve ambos estados |
| Conflictos | Mostrar sin espacio, segunda Prismaradita, objeto desconocido y nivel superior. No ocultar los motivos |
| Nivel superior fijado | El motor puede conservar un objeto requerido que supera el máximo de búsqueda; ese máximo restringe candidatos nuevos. Hay una prueba específica de este caso |
| Todos los espacios conservados | Se bloquea iniciar sin espacio para buscar; mostrar acción para habilitar alguno |
| Ningún objetivo | Se bloquea iniciar; situar el error junto al encargo y devolver foco útil |
| Exos | PA, PM, alcance, solo anillos y máximo 0–3; conservar sus valores y explicación |
| Transcendencia | Rangos compatibles con líneas del objeto. Fijado puede optimizar runa; conservado mantiene la del jugador |
| Pergaminos y puntos | Opción de asumir pergaminado; el motor distribuye los puntos. El resultado aplicado conserva la asignación devuelta |
| Pasivas | Apagadas / al máximo / como en el planificador; exclusiones por objeto y por sección |
| Intensidad | Rápida, estándar, maestra, eterna: mantener sus criterios reales y finalización manual de la eterna |
| Avivar | Diversifica sin perder la mejor pieza; conserva enfriamiento y desactivación mientras se templa |
| Cargar | `applyForgeResult` conserva runas de espacios bloqueados y aplica equipo, runas generadas, asignación, pergaminos y pasivas correspondientes en una actualización |

## Destino de los demás controles

La lista exacta está en `INTERACTIONS.md`; esta tabla fija su agrupación sin eliminar funciones.

| Familia | Destino en la nueva arquitectura | Paridad requerida |
|---|---|---|
| Clase, género, nivel, nombre | Cabecera / ficha del personaje | 19 clases, nombres localizados, presupuesto y borrador |
| Historial | Barra de acciones + menú móvil | Deshacer/rehacer y atajos; conservar vínculo de publicación/remix |
| Catálogo de objetos y sets | Vista de selección con retorno al taller | Texto, favoritos, legendarios, tipo, nivel, panoplia, filtros AND de bonus positivos, orden y carga progresiva |
| Características y pergaminos | Ficha editable del personaje | Todas las acciones incrementales, entrada directa, todos/individual |
| Pasivas | Vista de combate con acceso desde stats | Encendido, acumulaciones, turnos, opciones, límites compartidos y apagar todas |
| Hechizos / arma | Vista Hechizos | Grado automático/manual, elementos, variantes, daños, condiciones, dominio normal/crítico y efectos de equipo |
| PvP | Panel dentro de Hechizos | Resistencias de objetivo, reinicio y ataques; conservar contexto del cálculo |
| Comparación A/B | Vista dedicada | URL, guardados local/nube, cambiar/limpiar B, radar/tablas y compartir `?c=`. La comparación del último cambio del estudio no reemplaza esta función |
| Exportar / compartir | Menú Compartir | PNG, snapshot completo, URL y feedback de copiado |
| Publicar / actualizar | Diálogo de publicación | Sesión, nombre, visibilidad, etiquetas, vínculo de edición y origen de remix |
| Mis builds / colecciones | Biblioteca personal | Local/nube, editar, ver, visibilidad, copiar, borrar; colecciones crear/editar/quitar/compartir |
| Explorar / detalle / perfil | Comunidad | Buscar, clase, tags, orden, paginar; cargar/remixar, likes, guardar, colección, valorar, comentarios, reportes, versiones y seguimiento |
| Cuenta / autenticación | Cuenta | Registro, acceso, recuperación, consentimiento, perfil, contraseña y sesión; no confundir nombre visible con usuario |
| Administración | Área restringida | Permisos, rangos, asignaciones, fechas, revocación, reportes y restauración |
| Guías / clases / sets / legal | Contenido | Índices, enlaces profundos, `?class=`, `?set=`, `?forge=1`, texto, SEO e idiomas |
| Ajustes / ayuda | Menú global persistente | Idioma, tema, sonido, cursor, partículas, modo del personaje, preferencias de layout, atajos, novedades y actualización |

## Cierre pendiente

No se declara una validación exhaustiva de todas las combinaciones posibles. Los flujos autenticados, moderación, publicación, lector de pantalla, todos los idiomas y pruebas con jugadores siguen abiertos. No se efectuaron publicaciones, cambios de cuentas ni acciones de administración para revisar el diseño.

La producción conserva sus componentes y su versión. Los frames de Figma deben sincronizarse con la revisión local cuando vuelva a estar disponible la cuota; tampoco se consideran diseño final aprobado.
