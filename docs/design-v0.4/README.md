# Dofus Forge 0.4.0 — El taller de los Doce

Propuesta de identidad y experiencia, 15 de noviembre de 2026. **Estado: diseño en desarrollo; no es una versión publicada.**

[Archivo editable en Figma](https://www.figma.com/design/TWromSdJxK8iMbxmCTa6wo) · [Roadmap](ROADMAP.md) · [Auditoría funcional](DOMAIN-AUDIT.md) · [Contrato UX](UX-SPEC.md) · [Cobertura](COVERAGE.md)

## Dirección

El personaje animado es el centro de la construcción. Equipo a sus lados, seis Dofus debajo y una ficha legible al lado. El material visual combina tinta verde, mineral claro, cobre trabajado y arte del juego. La personalidad aparece en la composición, la tipografía y las decisiones de interacción.

**Requisito confirmado:** conservar `CharacterStage`, sus orientaciones, animaciones, mascotas, monturas y efectos. La primera distribución de Figma con cuadrícula sin personaje quedó superada por este requisito. La referencia vigente del constructor es el prototipo local y sus capturas `workshop-3d-*`.

## Entrega actual

- Figma: 3 páginas, 14 pantallas editables, 7 familias / 44 variantes de componentes, 67 variables y 8 estilos tipográficos; marca vectorial original y lámina de identidad.
- Estudio local: además del taller, propuestas para las 19 rutas, 36 diálogos y 6 estados de vista (`prototype/surfaces.html`), con catálogo, panoplias, compartir y tarjetas de build rediseñados. El estado por superficie está en [ROADMAP.md](ROADMAP.md#estado-del-estudio-local).
- Taller, revisión 3: personaje real del proyecto, 19 clases, dos géneros, giro/movimiento y montura/mascota equipada; temas Tinta/Mineral, catálogo de datos completo, estado e historial reales, vista previa de quitar/reponer piezas, comparación del último cambio y borrador mediante el codec del producto. La ficha agrupa los 73 campos actuales de `StatBlock`.
- Forjadora integrada: componente, validaciones, Worker y WASM existentes; encargo reorganizado con objetivos y reglas, búsqueda real, templado, alternativas, carga y deshacer. Su presentación se adapta localmente, sin modificar el módulo de producción.
- Identidad: `assets/forge-mark.svg`, exploración raster `identity-exploration.png`, prompt reproducible `identity-prompt.txt`. Se usó generación integrada de imágenes para la exploración y generación vectorial de Figma para la marca. La herramienta integrada no expone selección explícita del modelo; no se afirma un modelo concreto.
- Inventario de 19 páginas y 19 módulos; trazabilidad de 495 nodos con eventos/destinos en 94 TSX, contrato de accesibilidad y migración por fases.

## Abrir el prototipo

Desde la raíz del repositorio, con las dependencias actuales instaladas:

```sh
node node_modules/vite/bin/vite.js --config docs/design-v0.4/prototype/vite.config.ts
```

Abrir `http://127.0.0.1:4404` para el taller y `http://127.0.0.1:4404/surfaces.html` para el resto de rutas, diálogos y estados. El servidor utiliza los recursos existentes de `char-assets/` y `public/`; no necesita credenciales. Los tipos de letra de la exploración se cargan desde Google Fonts; la migración de producción debe servirlos localmente.

```sh
node docs/design-v0.4/tools/check-prototype.mjs
node docs/design-v0.4/tools/check-forge.mjs
node docs/design-v0.4/tools/check-workspace.mjs
node docs/design-v0.4/tools/check-design-flows.mjs
node docs/design-v0.4/tools/check-surfaces.mjs
node docs/design-v0.4/tools/check-surfaces.mjs --mineral
node node_modules/typescript/bin/tsc --project docs/design-v0.4/prototype/tsconfig.json
node node_modules/vite/bin/vite.js build --config docs/design-v0.4/prototype/vite.config.ts
```

El build comprueba el bundle de la exploración. No es un paquete de despliegue: los recursos del visor se sirven mediante el middleware local y las imágenes de objetos mediante un proxy de lectura a Dofus Forge. El catálogo se carga desde los datos locales del producto. El estudio no registra búsquedas en la nube. El borrador guarda el snapshot completo del producto; los ejemplos no son recomendaciones de equipo.

## Revisión visual y evidencia

[Escritorio](workshop-3d-desktop.png) · [Móvil](workshop-3d-mobile.png) · [Tema mineral](workshop-mineral-desktop.png) · [Tarjetas de build](surfaces-explore-desktop.png) · [Catálogo](catalog-detail-desktop.png) · [Decisiones y validación](DESIGN-REVIEW.md)

[Forjadora escritorio](forge-order-desktop.png) · [Forjadora móvil](forge-order-mobile.png) · [Búsqueda](forge-running-desktop.png) · [Resultados reales](forge-results-desktop.png)

La revisión sustituye las tarjetas repetidas por un área de trabajo continua. Navegación discreta, acciones persistentes, objetos reconocibles, personaje central y datos alineados. La ornamentación se concentra detrás del personaje. El cobre identifica acciones; los elementos conservan su significado en el juego.

## Qué falta

El plan Starter de Figma bloqueó las llamadas adicionales. Quedaron sin ejecutar la actualización del constructor con personaje central y la revisión visual completa de las demás pantallas. Solo se inspeccionaron visualmente las primeras vistas de escritorio/móvil de Figma antes de la corrección del personaje; no se presentan como aprobadas. Las capturas antiguas de la cuadrícula se retiraron de la entrega local.

En el estudio local, dos herramientas del taller (forjamagia y hechizos) siguen siendo el componente de producción con estilos adaptados; no cuentan como rediseñadas.

La biblioteca es una primera base, no cubre todavía todos los componentes de producción. Falta publicar o vincular Code Connect, completar los estados de cada flujo, sincronizar el tema Tinta con el prototipo y probar la propuesta con personas. Las pantallas secundarias de Figma usan cifras ilustrativas; el prototipo del constructor usa el cálculo del motor.

La producción, su versión y sus rutas no se modificaron. Los textos del prototipo están en español para la revisión de diseño; su implementación debe pasar por las cuatro traducciones del producto.

La auditoría distingue paridad con código, pruebas automáticas y tareas todavía abiertas. No se afirma haber probado todas las combinaciones de equipo ni todos los estados autenticados.

## Continuación en Figma

`figma-state.json` registra IDs reales y estado. Primero reemplazar los frames `3:861` y `3:1383` por la composición con personaje del prototipo. Después revisar todos los frames: tamaño del texto, desbordamiento de contenido, estados, enlaces de prototipo, tema oscuro y arte real. No ejecutar a ciegas los scripts de creación: producen nuevos nodos. Los scripts son la fuente de construcción y deben adaptarse para actualizar los IDs guardados.

Los materiales públicos contienen únicamente el diseño de Dofus Forge. La investigación externa temporal, sus capturas y sus enlaces fueron retirados.
