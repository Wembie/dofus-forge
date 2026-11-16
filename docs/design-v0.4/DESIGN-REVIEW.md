# Revisión 3 · Taller, ficha y Forjadora

## Criterio de diseño

La herramienta debe permitir decidir sobre equipo con rapidez. El personaje establece identidad y contexto; el arte de objetos permite reconocer piezas; los valores alineados permiten comparar. La decoración tiene un lugar concreto detrás del personaje y no compite con los datos.

| Problema observado | Decisión aplicada |
|---|---|
| Muchos bloques con el mismo peso visual | Un área continua de trabajo con dos zonas; jerarquía mediante espacio, alineación y tipografía |
| Identidad demasiado dependiente del color | Sello vectorial, composición del equipo alrededor del personaje, seis Dofus y arte real del juego |
| Datos dispersos en una barra lateral | Resumen, matriz elemental y grupos secundarios; expansión a ficha completa con cuatro grupos semánticos |
| Escritorio reducido a escala en móvil | Equipo y estadísticas como vistas explícitas; resumen superior y navegación inferior; personaje conservado |
| Cambiar un objeto sin conocer su efecto | Vista previa calculada por el motor, diferencias de panoplia, acción reversible y comparación del último cambio |
| Borrador local poco claro | Estado visible, guardado explícito y recuperación de las piezas al recargar |
| Características mezcladas con elementos de daño | Las seis características se muestran aparte; Neutral permanece en daños y resistencias |
| Forjadora ausente del recorrido principal | Acción persistente, objetivos primero y reglas al lado; en móvil, orden semántico y enlaces internos |
| Estudio separado de las reglas del producto | Reutilizar catálogo, estado, historial, codec y Forjadora del repositorio |

La investigación de interfaces reales se usó para estudiar jerarquía, densidad, navegación y selección de equipo. Los materiales externos de esa investigación no forman parte de esta entrega pública.

## Validación realizada

Resultados reproducibles en `prototype-check.json`; el script se ejecuta con el servidor del prototipo abierto. Chromium utiliza renderizado WebGL por software en esta comprobación, por lo que no constituye una medición de rendimiento en dispositivos reales.

- Cinco viewports: 1440×900, 1366×900, 768×1024, 390×844 y 360×800.
- Sin desbordamiento horizontal, errores de JavaScript ni imágenes rotas en las vistas comprobadas.
- Un único canvas activo y visible en la vista de equipo.
- Ficha con 73 campos; sin scroll vertical a 1366×900 y 1440×900, zoom 100%. Búsqueda de «Retiro» devuelve PA y PM.
- Quitar el primer anillo conserva el segundo; deshacer restituye el equipo. El ejemplo utiliza dos anillos de panoplia diferentes para respetar las reglas del catálogo.
- Escape cierra el diálogo y devuelve el foco al objeto. El borrador conserva las piezas al recargar.
- Axe, reglas WCAG 2 A/AA y 2.1 AA: cero infracciones automáticas en la vista inicial de ambos temas y los cinco tamaños. Esto no sustituye evaluación manual, lector de pantalla o pruebas con personas.
- TypeScript y bundle local como comprobaciones separadas.
- Producto existente: 434 pruebas aprobadas. Rust: 47 aprobadas y 13 omitidas; ver `DOMAIN-AUDIT.md`.
- Forjadora: abrir encargo, ejecutar Worker/WASM, templar, obtener alternativas reales, cargar y recuperar los valores previos con deshacer. Apertura/cierre y ancho comprobados también en móvil; evidencia en `forge-check.json`.

Las capturas corresponden al prototipo local. Los frames de Figma anteriores todavía no reflejan esta revisión.

## Límites del estudio

El prototipo carga el catálogo de datos completo y utiliza el store del producto. El selector manual completo de objetos, edición de runas, pasivos del taller, hechizos, comparación A/B, publicación y cuenta siguen inventariados para la migración. Los objetos de mascota/montura y Multiman que devuelve la Forjadora se conservan en el store; el visor recibe la mascota/montura equipada. Sus selectores manuales no están integrados todavía. Los 73 campos incluyen presupuesto, límites y efectos desconocidos, además de estadísticas de combate.

Falta validar todas las áreas táctiles a 44 px, zoom, idiomas, lector de pantalla, estados de error y dispositivos reales. Las pruebas automáticas de accesibilidad cubren la vista inicial, no todos los diálogos y estados. Tampoco se han realizado pruebas con jugadores. El roadmap conserva estas tareas abiertas.
