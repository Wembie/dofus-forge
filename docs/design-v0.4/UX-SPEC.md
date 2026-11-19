# Contrato de experiencia 0.4.0

## 1. Constructor y personaje

- Mantener el visor `src/components/CharacterStage.tsx` como centro visual: ocho orientaciones, reposo, caminar y correr, género y clase, acompañante, montura y fallback por error.
- Un único canvas activo por vista. No montar simultáneamente dos visores ocultos para diferentes breakpoints.
- Conservar la organización de equipo alrededor del personaje. Diez espacios principales, Multiman y seis Dofus/trofeos. Mascota/montura y Multiman abren el mismo catálogo que el resto de espacios.
- Anillos identificados por espacio, aunque el objeto tenga el mismo ID. Quitar uno no quita ambos.
- Efectos y órbitas detrás del personaje, sin bloquear clics ni reducir contraste. Respetar movimiento reducido; el visor ya mantiene una pose estática en ese caso.
- Giro y movimiento: objetivos táctiles de 44 px. Al fallar recursos, conservar un retrato y acción de reintento sin perder equipo ni estadísticas.
- El render actual utiliza el motor gráfico del proyecto. Conservar la experiencia llamada «3D» en preferencias no exige sustituir su arquitectura por otro motor.

## 2. Estadísticas

Dos escalas de lectura:

1. **Taller:** visor + equipo + PV/PA/PM/alcance/crítico/potencia, matriz elemental y grupos secundarios.
2. **Ficha completa:** los 73 campos actuales de `StatBlock`, incluidos ceros, valores brutos, límites, robos y presupuesto. En escritorio se distribuyen en cuatro grupos: Personaje, Daños, Resistencias, Control y límites. Es una vista accesible desde el taller y vuelve a él conservando el estado.

La garantía de «sin scroll» tiene un tamaño de referencia: 1366 × 900 CSS px, zoom 100%, ficha completa. A 200% de zoom o alturas inferiores, debe permitirse scroll de página para conservar legibilidad. En móvil la ficha utiliza una columna o grupos apilados; 73 estadísticas no caben de manera legible en una pantalla de 390 px sin desplazamiento.

Requisitos de implementación:

- `computeStats`, `useCombatStats` y la lógica de límites son fuente de datos. No repetir fórmulas en los componentes de presentación.
- Separar visualmente Equipo/Combate. Indicar los pasivos activados y el contexto usado. Cambiar de modo mantiene la posición y la comparación.
- Resistencias: valor aplicado junto al bruto cuando existe exceso. PA, PM y alcance siguen la misma convención.
- `unknownStats` debe enumerar todos los efectos recibidos. El prototipo muestra los pares nombre/valor cuando existen; «Ninguno» se reserva al registro vacío. Con textos extensos se prioriza reflow sobre mantener altura fija.
- El orden DOM de la ficha sigue el orden visual por grupo. El prototipo usa secciones con nombre y listas de descripción para asociar cada dato con su valor.
- Ceros visibles; el usuario decide un filtro «Solo diferencias» en comparación. El color siempre va acompañado de signo y etiqueta.
- Usar separadores locales, números tabulares y etiquetas completas. Tooltip, foco y toque deben ofrecer el mismo acceso al origen del valor.

## 3. Selección de equipo

Seleccionar espacio → catálogo contextual → revisar impacto → equipar → feedback + deshacer.

En escritorio, el catálogo muestra resultados e impacto juntos. En móvil, ocupa una vista completa con volver y resumen fijo. No apilar varios modales para objeto → runas → panoplia. Usar navegación interna con retorno al contexto.

Conservar favoritos, filtros combinados, rangos de nivel, panoplias, efectos especiales, condiciones, valores de forjamagia, transformaciones del arma y restricciones. Una vista previa debe considerar el conjunto, no solo restar las estadísticas de dos objetos.

## 4. Forjadora

Objetivo → restricciones y piezas fijas → búsqueda cancelable → resultados explicados → comparar → aplicar como una sola acción reversible.

- Mantener mínimo, prioridad y límite como conceptos distintos.
- Indicar qué objetivos se cumplen y cuánto falta en los otros. No representar un resultado incumplido como «óptimo».
- Preservar runas de piezas fijas, distribución de características y pasivos modelados.
- Carga con etapa o trabajo real, sin porcentajes inventados. Cancelar devuelve la configuración intacta.
- Resultados con diferencias y condiciones; no inventar precios o datos de mercado.

## 5. Navegación, móvil y overlays

- Taller, Explorar, Mis builds y Guías como navegación global. Los modos del taller se identifican aparte.
- Móvil: Equipo, Estadísticas, Hechizos, Forjar y Más. Resumen persistente; acciones importantes también en toque, sin hover obligatorio.
- No esconder publicar, comparar, deshacer o ajustes sin una ruta visible alternativa.
- Cabecera y barras inferiores respetan áreas seguras, teclado virtual y zoom. Nunca superponer controles al canvas.
- Formularios móviles: 16 px; acciones 44 px; densidad de lectura separada del tamaño de las acciones.
- Diálogo: nombre accesible, foco inicial, contención, Escape, retorno de foco, error anunciado. No cerrar y perder texto tras un error de red.

## 6. Estados y contenido

Cada flujo debe diseñar vacío, primera visita, carga, éxito, error recuperable, sin conexión y falta de permisos cuando apliquen. Mostrar borrador local, guardado en cuenta y publicado como estados distintos. Restaurar, copiar y eliminar requieren consecuencias explícitas. Guardar falla sin borrar el borrador.

Las guías, clases, panoplias, políticas y páginas de cuenta conservan contenidos y enlaces. Ningún contador o prueba social debe inventarse para decorar.

## 7. Identidad y tokens

- Source Sans 3: controles y lectura; Alegreya: títulos de build y contenido editorial; Barlow Condensed: logotipo; IBM Plex Mono: datos.
- Tinta: fondo `#111615`, superficie `#191E1C`, escenario `#141B18`, texto `#E9E8DF`, secundario `#A1AAA0`, cobre `#E4B28B`.
- Mineral: fondo `#EEEAE0`, superficie `#FAF8F0`, escenario `#E8E5DB`, texto `#202B28`, secundario `#59655F`, cobre `#8C482E`.
- Estos valores corresponden a la revisión local vigente. Los tokens iniciales de Figma todavía requieren sincronización; no usar ambos juegos como equivalentes.
- Elementos mantienen su significado dentro del juego; éxito/error no deben confundirse con afinidad elemental.
- Escala de espacio 4/8/12/16/24/32. Radio 5 para controles y 8–10 para paneles/diálogos. Bordes de un píxel; foco de dos con separación de tres.
- Sello en vector, monocromo y reversible. Mínimo inicial 24 px; probar favicon 16/32, avatar, cabecera y exportaciones antes de publicar. Área libre: al menos un cuarto del ancho del símbolo.
- Reservar texturas para marca y contenido editorial. Las superficies de estadísticas usan fondos limpios.

## 8. Validación necesaria para publicar

Teclado, lector de pantalla, contraste en ambos temas, zoom 200%, movimiento reducido, 360/390/768/1024/1366/1440/1920 px, francés/portugués/inglés/español y nombres extensos. Verificar cálculo, condiciones, undo/redo, borradores, pasivos y enlaces compartidos contra la versión anterior.

Pruebas con personas: crear build, cambiar una pieza sin perder contexto, identificar qué resistencia excede el límite, encontrar una estadística secundaria, comparar dos alternativas y publicar desde móvil. Registrar tiempos y errores reales. No se han ejecutado todavía.
