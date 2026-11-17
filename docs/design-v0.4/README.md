# Dofus Forge 0.4.0 — El taller de los Doce

Propuesta de identidad y experiencia, 15 de noviembre de 2026. **Estado: diseño en desarrollo; no es una versión publicada.**

[Roadmap](ROADMAP.md) · [Auditoría funcional](DOMAIN-AUDIT.md) · [Contrato UX](UX-SPEC.md) · [Cobertura](COVERAGE.md)

**Acceso · 17 de noviembre:** [login, registro y recuperación](ACCESS-REVIEW.md) con composición propia, cuatro idiomas y estados locales; seis HTML de correo en [`supabase/email-templates`](../../supabase/email-templates). [Login escritorio](captures/acceso/signin-desktop-tinta.png) · [Registro móvil](captures/acceso/signup-mobile-tinta.png) · [Correo de confirmación](captures/correos/confirm-signup-600.png).

**Cuenta y perfil · 17 de noviembre:** [edición, seguridad, sesión y perfil público](ACCOUNT-REVIEW.md), con ejemplos locales y estados completos. La referencia vigente es local; Figma queda como archivo histórico y deja de ser un requisito de entrega.

## Dirección

El personaje animado es el centro de la construcción. Equipo a sus lados, seis Dofus debajo y una ficha legible al lado. El material visual combina tinta verde, mineral claro, cobre trabajado y arte del juego. La personalidad aparece en la composición, la tipografía y las decisiones de interacción.

**Requisito confirmado:** conservar `CharacterStage`, sus orientaciones, animaciones, mascotas, monturas y efectos. La primera distribución de Figma con cuadrícula sin personaje quedó superada por este requisito. La referencia vigente del constructor es el prototipo local y sus capturas en [`captures/taller`](captures/taller).

## Entrega actual

- Figma: 3 páginas, 14 pantallas editables, 7 familias / 44 variantes de componentes, 67 variables y 8 estilos tipográficos; marca vectorial original y lámina de identidad.
- Estudio local: además del taller, propuestas para las 19 rutas, 36 diálogos y 6 estados de vista (`prototype/surfaces.html`), con catálogo, panoplias, compartir y tarjetas de build rediseñados. El estado por superficie está en [ROADMAP.md](ROADMAP.md#estado-del-estudio-local).
- Taller, revisión 3: personaje real del proyecto, 19 clases, dos géneros, giro/movimiento y montura/mascota equipada; temas Tinta/Mineral, catálogo de datos completo, estado e historial reales, vista previa de quitar/reponer piezas, comparación del último cambio y borrador mediante el codec del producto. La ficha agrupa los 73 campos actuales de `StatBlock`.
- Forjadora integrada: componente, validaciones, Worker y WASM existentes; encargo reorganizado con objetivos y reglas, búsqueda real, templado, alternativas, carga y deshacer. Su presentación se adapta localmente, sin modificar el módulo de producción.
- Identidad: `assets/forge-mark.svg`, exploración raster `captures/identidad/exploration.png`, prompt reproducible `identity-prompt.txt`. Se usó generación integrada de imágenes para la exploración y generación vectorial de Figma para la marca. La herramienta integrada no expone selección explícita del modelo; no se afirma un modelo concreto.
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
node docs/design-v0.4/tools/check-account.mjs
node node_modules/typescript/bin/tsc --project docs/design-v0.4/prototype/tsconfig.json
node node_modules/vite/bin/vite.js build --config docs/design-v0.4/prototype/vite.config.ts
```

El build comprueba el bundle de la exploración. No es un paquete de despliegue: los recursos del visor se sirven mediante el middleware local y las imágenes de objetos mediante un proxy de lectura a Dofus Forge. El catálogo se carga desde los datos locales del producto. El estudio no registra búsquedas en la nube. El borrador guarda el snapshot completo del producto; los ejemplos no son recomendaciones de equipo.

## Revisión visual y evidencia

Todas las capturas están en [`captures/`](captures), una carpeta por área, y las regeneran los scripts de `tools/` con el estudio abierto. Los informes de cada comprobación están en [`checks/`](checks). La carpeta `evidence/` (local, fuera del repositorio) guarda las capturas de cada ruta, diálogo y estado, y las del tema Mineral.

| Carpeta | Contenido | Script |
|---|---|---|
| [`captures/taller`](captures/taller) | Taller en 1440, 1366, 768, 390 y 360 px y en tema Mineral | `check-prototype.mjs` |
| [`captures/herramientas`](captures/herramientas) | Cada herramienta del taller en escritorio y móvil: características, pasivos, hechizos, combate, panoplias, bonificaciones, comparar, compartir, novedades, catálogo y forjamagia | `check-workspace.mjs` |
| [`captures/forjadora`](captures/forjadora) | Encargo en escritorio y móvil, búsqueda en curso y resultados reales | `check-forge.mjs` |
| [`captures/catalogo`](captures/catalogo) | Catálogo de objetos y de panoplias: tarjetas completas (`list-*`, `sets-*`) y panel de impacto en la build (`detail-*`, `sets-detail-*`) | `check-design-flows.mjs` |
| [`captures/exportar`](captures/exportar) | Ficha descargada con la nueva identidad | `check-design-flows.mjs` |
| [`captures/vistas`](captures/vistas) | Explorar con las tarjetas de build completas | `check-surfaces.mjs` |
| [`captures/cuenta`](captures/cuenta) | Cuenta, seguridad, sesión, listas de personas, perfiles y errores; cinco tamaños, dos temas y cuatro idiomas | `check-account.mjs` |
| [`captures/identidad`](captures/identidad) | Exploración de marca | — |

[Decisiones y validación](DESIGN-REVIEW.md)

La revisión sustituye las tarjetas repetidas por un área de trabajo continua. Navegación discreta, acciones persistentes, objetos reconocibles, personaje central y datos alineados. La ornamentación se concentra detrás del personaje. El cobre identifica acciones; los elementos conservan su significado en el juego.

## Qué falta

El archivo anterior de Figma se conserva como referencia histórica. Por decisión del proyecto, el trabajo continúa exclusivamente en el prototipo local. No hay una sincronización de Figma pendiente para cerrar el diseño.

En el estudio local, todas las herramientas del taller y la Forjadora tienen composición propia sobre las reglas del producto.

Falta completar la migración de las rutas secundarias a servicios reales, unificar componentes y tokens locales y probar la propuesta con jugadores. Los datos de cuenta y comunidad del estudio son ejemplos; el constructor usa el cálculo del motor.

La presentación de producción, su versión y sus rutas se conservan. Se extrajeron reglas compartidas de runas, hechizos, Forjadora y acceso para preparar la migración sin duplicar cálculos ni flujos. El acceso tiene textos en los cuatro idiomas; el resto del estudio aún debe completar esa migración.

La auditoría distingue paridad con código, pruebas automáticas y tareas todavía abiertas. No se afirma haber probado todas las combinaciones de equipo ni todos los estados autenticados.

## Continuación local

Revisar el estado por superficie en `ROADMAP.md`. Los archivos de Figma y sus scripts quedan archivados; `prototype/`, sus capturas y los informes de `checks/` son la referencia de trabajo. No ejecutar scripts de creación del archivo histórico para continuar este rediseño.

Los materiales públicos contienen únicamente el diseño de Dofus Forge. La investigación externa temporal, sus capturas y sus enlaces fueron retirados.
