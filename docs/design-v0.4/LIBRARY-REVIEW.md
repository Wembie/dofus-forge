# Mis builds y colecciones · estudio local

Revisión del 17 de noviembre de 2026. Prototipo de presentación y recorridos con datos de ejemplo en memoria. No publica, borra ni modifica contenido alojado.

## Abrir

- `http://127.0.0.1:4404/surfaces.html?view=my-builds`: Mis builds, Guardadas y Colecciones.
- `http://127.0.0.1:4404/surfaces.html?view=collection`: colección con equipos propios y ajenos, sus permisos y acciones.

La revisión local permite cambiar respuesta, carga/vacío/error, idioma y vista de propietario/visitante. Al recargar, los ejemplos vuelven a su estado inicial. Los enlaces copiados identifican ejemplos, no publicaciones existentes.

## Composición

La biblioteca conserva las tres secciones del producto. Las tarjetas mantienen personaje, mascota o montura, equipo y Dofus reconocibles; los valores de PA, PM y alcance proceden del motor del proyecto. Una segunda densidad reduce la altura para recorrer listas largas. Cada tarjeta tiene su propio acceso al taller, guardado en colección y acciones; no hay una barra global que pueda modificar un equipo distinto del señalado.

Las colecciones se presentan como una lista con nombre, descripción, estado público/privado, número de builds y objetos reconocibles de su contenido. La colección abierta conserva su orden de entrada por defecto; ordenar la vista no escribe posiciones nuevas. El visitante no ve las acciones del propietario ni el nombre de una colección privada inaccesible.

Los siete diálogos tienen composición propia: nombre, visibilidad, eliminación de build, creación, edición, selector y eliminación de colección. Incluyen contexto del objeto afectado, controles nativos, estados ocupados, errores recuperables y confirmación al descartar formularios modificados. En el selector, cada selección se aplica inmediatamente; no requiere un segundo guardado.

## Auditoría de contratos

| Fuente actual | Contrato conservado / adaptación |
|---|---|
| `src/pages/MyBuildsPage.tsx` | Mis builds, Guardadas y Colecciones; totales propios/públicos/likes, valoración, likes, visitas, comentarios; abrir detalle, editar equipo, copiar enlace, cambiar visibilidad y eliminar |
| `src/features/share/savedBuilds.ts` | Los guardados antiguos del dispositivo son de solo lectura para Comparar. No se crea una sección con operaciones de nube sobre esos datos |
| `src/features/builds/api.ts` | Build privada/no listada/pública; colección pública/privada; colecciones que admiten builds propias y ajenas; añadir/quitar por pertenencia, sin duplicar entradas |
| `src/features/collections/Collections.tsx` | Nombre no vacío después de recortar y máximo 60 caracteres. Selector con selección inmediata y restauración cuando falla. Crear desde el selector también intenta añadir la build |
| `src/pages/CollectionPage.tsx` | Descripción opcional, máximo 300 caracteres. Edición y gestión solo para el propietario. Quitar una entrada no elimina la publicación; borrar una colección conserva sus builds |
| `src/features/builds/api.ts`, colecciones | En una colección pública, las builds privadas propias y las no listadas ajenas permanecen visibles solo al propietario. Las no listadas del dueño de la colección siguen la regla existente; las cifras del visitante cuentan solo entradas visibles |
| `src/features/publish/PublishModal.tsx` y `api.updateBuild` | Cambiar nombre es un atajo visual para los metadatos de la publicación, con máximo 60 caracteres. Al integrar debe usar `updateBuild` conservando su snapshot completo; no existe un nuevo endpoint de renombrado |

La vista mejora el fallo al editar una colección: el formulario permanece abierto con sus valores. Si crear una colección funciona pero añadir la build falla, se conserva el identificador creado y el reintento solo añade la build; no crea otra colección.

## Archivos y límites

- `prototype/Library.tsx`: biblioteca, colección, densidades, acciones y siete diálogos.
- `prototype/library-model.ts`: fixtures y respuestas aisladas, pertenencia optimista y rollback; no llama a Supabase ni escribe guardados existentes.
- `prototype/BuildSheet.tsx`: el cálculo existente se expone como `sheetStats` para reutilizarlo en el detalle de la build seleccionada, sin nuevas fórmulas.
- `prototype/model.ts`: el taller puede abrir el snapshot de ejemplo transportado por `?b=`; el equipo solicitado tiene prioridad sobre el borrador de la sesión.
- Cuatro locales: todos los controles y mensajes nuevos; nombres y descripciones de ejemplos siguen siendo contenido de sus autores ficticios.

El snapshot armado por `librarySnapshot` solo pertenece a los fixtures del estudio, que no incluyen runas ni pasivos personalizados. No debe usarse como adaptador de una fila real: la integración debe transportar su snapshot original completo, incluidos runas, transformaciones, firmas, pasivos e identidad de publicación, como hace el producto. El parámetro `study-edit` expresa intención local; no vincula identificadores de ejemplo al store real de publicación.

El detalle conserva la composición anterior, con nombre, personaje, piezas y cálculo del ejemplo seleccionado. Su rediseño completo, Explorar, publicación/actualización, notificaciones y administración continúan en sus bloques respectivos. No se afirma que el resto de los diálogos genéricos ya haya recibido esta revisión.

## Validación

Con el servidor del estudio abierto:

```sh
node docs/design-v0.4/tools/check-library.mjs
node node_modules/typescript/bin/tsc --project docs/design-v0.4/prototype/tsconfig.json
```

`checks/library.json` contiene resultados de geometría, errores JavaScript, revisión automática WCAG A/AA y recorridos funcionales. `captures/biblioteca/` guarda evidencia de escritorio y móvil. Las revisiones de vista incluyen cinco tamaños y ambos temas; el recorrido prueba filtros, acciones sobre el objeto seleccionado, errores, descarte, permisos, pertenencia y guardado parcial.

Resultado: **150 comprobaciones sin fallos** (149 revisiones de vista y un recorrido de múltiples acciones), sin desbordamientos, errores de JavaScript ni infracciones automáticas en ese alcance. Se comprobó también búsqueda de clase localizada, colección privada inaccesible sin revelar su nombre, acceso sin sesión, equipo seleccionado en el detalle y transporte del snapshot al taller por encima de un borrador distinto de la sesión.

Las 451 pruebas existentes del producto, TypeScript del estudio y la compilación de producción pasan. El bundle del estudio conserva su aviso previo de tamaño de chunk; no es el paquete de despliegue. La revisión automática no sustituye pruebas con jugadores, lector de pantalla, teclado virtual y zoom en dispositivos reales. La integración de permisos, caducidad de sesión, límites y respuestas reales de red sigue pendiente de la migración de producción.
