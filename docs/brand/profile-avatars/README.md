# Retratos de perfil de Forge

Colección original de fan art de las 19 clases de Dofus, basada en los modelos reales del cliente. Los primeros cuatro rostros/peinados tienen versiones masculinas y femeninas: **152 retratos** con traje habitual, poses propias y el mismo acabado de tinta y acuarela.

- [Progreso por clase, sexo y modelo](PROGRESS.md): lista completa con casillas de los rostros hechos y pendientes; los trajes alternativos van al final.
- [Inventario del juego](game-looks.json): 600 rostros/peinados y 76 cuerpos de creación, incluidos los 38 trajes habituales y los 38 alternativos reservados para después.
- [Prompts y procedencia de cada imagen](manifest.json): prompt exacto, pose, referencias, hash y `gameLook` con posición, id y textura de cabeza/cuerpo.
- [Plantilla para continuar](prompt-template.json): conservar la técnica artística y los rasgos del modelo, inventando un gesto y expresión distintos para cada retrato.

## Revisión visual de la colección — 2026-11-24

Se inspeccionaron individualmente los **152 PNG maestros** ampliados y los WebP públicos en recortes circulares de 150 y 48 px. El [registro por imagen](visual-audit.json) conserva los hashes de ambos archivos y el resultado: **139 sin anomalías evidentes en esta pasada, cuatro correcciones pendientes, una comparación pendiente y ocho manos dudosas**. No se modificaron ilustraciones durante esta revisión. Los banners quedan fuera de su alcance.

Una imagen sin hallazgos no queda certificada como anatómicamente perfecta. Las dudas de perspectiva siguen abiertas; contar solo los dedos visibles no demuestra que falten otros. Antes de resolver manos, patas o guantes, contrastar una referencia del juego que incluya la mano completa, ya que los renders de generación priorizan cabeza y torso.

Correcciones y comparación pendientes:

| Retrato | Hallazgo | Estado |
| --- | --- | --- |
| [Ocra hombre · 1](../../../public/avatars/classes/v1/cra-m.webp) | La cuerda cruza la flecha por delante de su extremo posterior; revisar el enganche de la flecha. | Pendiente de corrección |
| [Zobal hombre · 1](../../../public/avatars/classes/v1/masqueraider-m.webp) | La palma expuesta se lee con un pulgar y tres dedos largos. | Pendiente de corrección |
| [Osamodas mujer · 2](../../../public/avatars/classes/v1/osamodas-look-2-f.webp) | El usuario detectó una mano derecha conectada al brazo izquierdo que sostiene el pío. | Pendiente de corrección |
| [Osamodas mujer · 3](../../../public/avatars/classes/v1/osamodas-look-3-f.webp) | El usuario detectó seis dedos en la mano horizontal. | Pendiente de corrección |
| [Zurcarák hombre · 3](../../../public/avatars/classes/v1/ecaflip-look-3-m.webp) | El usuario señala dedos demasiado humanos bajo el guante; contrastar forma y pelaje con una referencia completa. | Pendiente de comparación |

**El zurcarák hombre del rostro 4 se conserva:** el usuario aclaró expresamente que está bien y que su observación afecta solo al rostro 3 masculino.

Manos con dedos o pliegues poco claros, pendientes de resolver con una inspección enfocada:

| Retrato | Duda |
| --- | --- |
| [Aniripsa mujer · 1](../../../public/avatars/classes/v1/eniripsa-f.webp) | Tres dedos largos y pulgar distinguibles; posible cuarto dedo oculto por la vista lateral. |
| [Aniripsa hombre · 2](../../../public/avatars/classes/v1/eniripsa-look-2-m.webp) | La palma bajo el soplo no distingue claramente el cuarto dedo largo. |
| [Selotrop mujer · 2](../../../public/avatars/classes/v1/eliotrope-look-2-f.webp) | La palma bajo el portal muestra tres puntas largas; comprobar el dedo que podría quedar alineado detrás. |
| [Selotrop mujer · 3](../../../public/avatars/classes/v1/eliotrope-look-3-f.webp) | Los solapamientos de ambas manos alrededor del portal no explican claramente todos los dedos. |
| [Osamodas mujer · 4](../../../public/avatars/classes/v1/osamodas-look-4-f.webp) | La palma bajo la pluma deja tres dedos largos distinguibles y un pulgar. |
| [Tymador hombre · 3](../../../public/avatars/classes/v1/rogue-look-3-m.webp) | La mano levantada deja tres puntas claras y pliegues que no explican bien los demás dedos. |
| [Sadida mujer · 2](../../../public/avatars/classes/v1/sadida-look-2-f.webp) | El guante de la palma abierta deja tres puntas largas y un pulgar distinguibles. |
| [Sram mujer · 1](../../../public/avatars/classes/v1/sram-f.webp) | Los dedos recogidos de la mano que lanza la daga tienen una construcción ambigua. |

Al editar cualquiera de estas imágenes, conservar el original y el prompt, comprobar otra vez anatomía y recorte, actualizar PNG/WebP y manifiesto, y renovar el registro para los nuevos hashes. No marcar un hallazgo como resuelto solo porque terminó la generación.

## Rostro 4

38 retratos nuevos para las 19 clases, masculino y femenino, con el cuarto rostro/peinado y el traje habitual del cliente DOFUS 3.7.14.18. Cada ilustración conserva el modelo exacto y tiene una pose propia. Los rostros anteriores siguen disponibles. El progreso actual es de 152/600 rostros terminados y 448 pendientes; los 38 trajes alternativos siguen reservados para después.

![Cuarto rostro de cada clase](look-4-preview.webp)

![Cuarto rostro en recortes circulares de 150 y 48 px](look-4-circular-preview.webp)

PNG originales en `temp/profile-avatars/masters/v1/<clase>-look-4-<m|f>.png`; la web usa `public/avatars/classes/v1/<clase>-look-4-<m|f>.webp` a 512 × 512 px. Cada entrada guarda el prompt exacto, pose, ids de cabeza/cuerpo, versión del cliente y hashes de las referencias y archivos finales. Dos renders del cuarto modelo establecen la identidad y el retrato aprobado aporta la técnica.

Aplicar `supabase/migrations/20261123050000_profile_art_fourth_heads_and_locations.sql` antes del despliegue. Agrega 38 retratos y ocho escenarios a los catálogos existentes, conserva perfiles y permisos, y puede repetirse. No se ha ejecutado contra la base de datos alojada desde este trabajo.

Las seis correcciones de anatomía de esta tanda conservan el prompt y PNG anteriores en `originalGeneration`, además del prompt exacto de edición y sus referencias. Se revisaron manos, lateralidad, continuidad de los dos brazos y un solo torso antes de actualizar los PNG y WebP.

![Seis retratos con anatomía corregida](anatomy-corrections-preview.webp)

## Rostro 3

38 retratos nuevos para las 19 clases, masculino y femenino, con el tercer rostro/peinado y el traje habitual del cliente DOFUS 3.7.14.18. Cada dibujo conserva su modelo exacto y tiene una pose y expresión propias. Los rostros 1 y 2 siguen disponibles. Esa tanda completó 114/600 rostros; los 38 trajes alternativos siguen reservados para después.

![Tercer rostro de cada clase](look-3-preview.webp)

![Tercer rostro en recortes circulares de 150 y 48 px](look-3-circular-preview.webp)

PNG originales: `temp/profile-avatars/masters/v1/<clase>-look-3-<m|f>.png`. La web usa `public/avatars/classes/v1/<clase>-look-3-<m|f>.webp` a 512 × 512 px. El manifiesto guarda el prompt exacto, pose, ids y texturas del modelo, versión del cliente, hashes de las referencias y hashes del PNG y WebP. La técnica se mantiene con el retrato aprobado; la identidad viene de dos renders del tercer modelo.

Antes del despliegue, aplicar `supabase/migrations/20261123040000_profile_art_third_heads_and_locations.sql`. Solo agrega 38 retratos y ocho escenarios a los catálogos existentes; conserva las fotos, portadas y permisos actuales. No se ha ejecutado en la base de datos alojada desde este trabajo.

## Rostro 2

El número identifica el rostro/peinado del juego, no una técnica artística diferente. Se usa el traje habitual; los trajes alternativos se producirán después de los rostros. La posición empieza en 1 y sigue `order` e `id` del cliente. Las etiquetas internas no siempre son consecutivas: usar los ids guardados para reproducir el modelo exacto.

![Rostro 2: las 19 clases, masculino y femenino](look-2-preview.webp)

![Recortes circulares de 150 y 48 px](look-2-circular-preview.webp)

Los originales PNG están en `temp/profile-avatars/masters/v1/`. La web usa WebP opaco de 512 × 512 px con el fondo de acuarela incluido. Los primeros retratos conservan `<clase>-<m|f>.webp`; los nuevos usan `<clase>-look-2-<m|f>.webp`. El recorte circular se aplica al mostrar el perfil, conservando la ilustración cuadrada completa para ampliarla.

## Continuar otra tanda

1. Ejecutar `python scripts/extract-avatar-looks.py --export-head <posición>` con el cliente del juego instalado. Exporta referencias locales y actualiza el inventario sin cambiar los modelos usados por el planificador.
2. Renderizar el rostro seleccionado desde dos ángulos con el renderer existente; observar sus diferencias. Algunos rostros cambian la máscara o eliminan la capucha/sombrero.
3. Revisar las poses existentes, elegir una nueva y generar una ilustración por sexo usando el retrato aprobado como referencia de técnica y los renders como referencia de identidad.
4. Revisar manos, silueta, rasgos del modelo y recorte circular pequeño. Guardar PNG, WebP y cada prompt exacto en el manifiesto; mantener las imágenes aprobadas anteriores.
5. Ejecutar `node scripts/sync-avatar-progress.mjs`. Solo tacha retratos con archivo, hash y prompt verificados. Los demás quedan pendientes.
6. Registrar únicamente los retratos terminados en el selector y en una migración aditiva de `profile_avatar_catalog`, reflejada en `schema.sql`. Los prompts y el progreso viven en el repositorio; la base de datos solo autoriza rutas públicas exactas.

## Publicación del rostro 2

Aplicar `supabase/migrations/20261123020000_profile_avatar_second_heads.sql` en Supabase **antes de publicar el selector ampliado**. El despliegue del frontend no ejecuta migraciones SQL. Esta migración solo agrega las 38 rutas nuevas; conserva las fotos guardadas, las rutas anteriores y los permisos del catálogo. Puede repetirse sin duplicar entradas. No se ha ejecutado contra producción desde este trabajo.
