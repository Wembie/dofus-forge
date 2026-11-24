# Taller beta local

Entorno de trabajo para preparar las novedades de Dofus antes de incorporarlas al producto. Se ejecuta en un servidor propio, limitado a `127.0.0.1`. No añade `/beta` a las rutas del sitio desplegado ni modifica el catálogo oficial.

## Arrancar

Desde la raíz del repositorio:

```sh
pnpm fetch-beta
pnpm dev:beta
```

Abrir **http://127.0.0.1:5188/beta**. Los datos ya están descargados en esta máquina; basta con el segundo comando para volver a trabajar.

`pnpm fetch-beta --force` vuelve a descargar todos los datos aunque el número de versión no cambie. Reiniciar el servidor después de actualizar: la versión mostrada se fija al arrancar Vite.

`dev:beta` compila automáticamente el optimizador local con `wasm-pack` desde `tools/beta/rust-optimizer` si falta o si cambiaron sus fuentes Rust o sus módulos estables compartidos; requiere las herramientas Rust/WASM habituales del proyecto. `pnpm build:beta` hace esa comprobación por separado. El binario queda en `tools/beta/data/wasm/`: el WASM público no se reemplaza.

## Separación

- `tools/beta/data/` contiene los snapshots beta, está ignorado por Git y queda fuera de `public/` y del build de producción. Los scripts habituales conservan su destino y canal oficial; solo `--beta` escribe aquí.
- El servidor local sirve esos snapshots desde `/data/`. Reutiliza arte estático, CSS, componentes de catálogo y primitivas de cálculo estables, sin modificarlos para añadir reglas beta.
- La Forjadora experimental tiene fuentes propias: `forge/useForge.ts`, `forge/OptimizerModal.tsx` y `rust-optimizer/src/{forge,optimizer_types}.rs` dentro de este directorio. El store base está en `baseBuildStore.ts` y el panel de hechizos en `SpellsPanel.tsx`. Las fuentes equivalentes de `src/` y del crate raíz `rust-optimizer/` se restauraron al contenido anterior a la beta (`d53da0bf`); no contienen los hooks ni las reglas experimentales.
- El crate beta compila de forma independiente, con su propio manifiesto, lockfile y directorio de artefactos. Solo lee los módulos estables `characteristics`, `stat_map`, `stats` y `types` del crate oficial. Sus extensiones de catálogo y búsqueda no forman parte del motor que compila producción.
- Los alias beta pertenecen exclusivamente a `tools/beta/vite.config.ts`; el Vite habitual no importa este directorio. Los tests de aislamiento revisan las dependencias de `src/`, la configuración y la separación de los motores.
- El taller tiene una instancia propia del store de la build. Las conversiones viven en `tools/beta/`; no se añaden a los snapshots públicos.
- La configuración no expone variables `VITE_*`. Supabase se sustituye por un adaptador que rechaza las operaciones, y la política del navegador permite conexiones de datos únicamente al servidor local. Las imágenes de objetos y runas se leen del CDN beta.
- No monta autenticación, publicaciones, perfiles, analítica ni rutas de comunidad. El borrador y el historial son locales al origen `http://127.0.0.1:5188`, con la clave `dofus-forge:beta-lab:v1`.
- Exportar/importar genera archivos JSON con formato `dofus-forge-beta`, la versión de los datos, la build y las Dracorunas. No son enlaces de builds públicas.
- Una sincronización fallida deja `.sync-in-progress`: el servidor rechaza esos datos hasta completar `pnpm fetch-beta`. También comprueba que catálogo, hechizos, pasivos e informe correspondan a la misma versión.

## Disponible

- Catálogo completo de equipo, sets, consumibles y monturas del canal beta. Constructor, condiciones y bonus de sets sobre la implementación local y las primitivas estables compartidas.
- Nombres, descripciones, hechizos e iconos de las 20 clases de los datos actuales, incluidos los 44 hechizos de Bellaphone, llamada Belíade en español, y sus seis definitivos de linaje para pruebas manuales. Sus retratos oficiales se extraen del archivo de cabezas beta.
- Escenarios de Belaura: linaje, tamaño (1–4), enemigos presentes, posición del objetivo, estados y daño al lanzar o al final del turno. El elemento se elige expresamente para las acciones de «mejor elemento». Se filtran los criterios reales de tamaño y cantidad de enemigos; las ramas de daño y crítico no se suman entre sí. Los daños basados en porcentajes de vida y las curas quedan fuera de esta vista calculada. Los bonus propios directos de aura se pueden aplicar a la vista de hechizos; no se incluyen en la búsqueda de la Forjadora. Escenario guardado en borrador, historial y JSON.
- Pasivos regenerados desde el release beta. Se aprovechan los controles del motor existente; esto no convierte automáticamente todos los efectos nuevos en mecánicas implementadas.
- Forjamagia habitual, características, hechizos y Forjadora sobre el catálogo beta. La búsqueda permite elegir las familias de Dracorunas autorizadas, muestra las conversiones elegidas y las carga junto con su forjamagia de origen. Ébano se habilita expresamente por sus reglas todavía provisionales. Las piezas conservadas incluyen su conversión y sus runas previas una sola vez.
- El motor busca variantes de catálogo manteniendo la identidad original para vetos, objetos fijados y restricciones de anillos de set. Los bonus y pasivos conservan esa identidad. Las runas de trascendencia y los exos pro se prueban antes de convertir; la conversión no concede forjamagias que el objeto original no aceptaba.
- Límites de PA, PM, Alcance e Invocaciones por equipo y por el bonus activo de set: se toma el menor máximo, sin sumar los límites. Se aplican a la ficha, los pasivos y la puntuación y resultados de la Forjadora; se conservan los totales brutos. Este comportamiento se activa solo en el taller.
- Laboratorio de las seis Dracorunas: vista de antes/después con la forjamagia previa, aplicación por espacio, totales y daño de hechizos recalculados, bloqueo de nuevas forjamagias, retirada reversible y dos anillos independientes. Se conservan los bonus de sets y los ataques base del arma.
- Deshacer, rehacer, borrador automático, exportación e importación de pruebas, y los cuatro idiomas.
- Informe de objetos/sets añadidos, modificados y ausentes, además de nuevos efectos sin mapear. La referencia es el snapshot oficial **guardado en el repositorio**, que puede ir por detrás del API oficial actual. Los cosméticos y objetos de pruebas también aparecen en el informe y no se presentan como equipables por ese hecho.

En la primera sincronización, el proveedor entregaba beta `3.8.2.3`; el catálogo oficial del repositorio era `3.7.12.12`: 4.147 objetos, 959 sets, 52 objetos añadidos, 222 modificados y 19 sets añadidos. Son diferencias entre esos snapshots, no una lista oficial del parche 3.8. El taller sigue la versión disponible del API y no fija el `3.8.2.8` que se había mencionado inicialmente.

## Mantenimiento del aislamiento

Las reglas nuevas se desarrollan en este directorio. Las copias locales de la Forjadora, el store y el panel de hechizos se mantienen de forma explícita: una mejora en producción se revisa antes de trasladarla al taller. La promoción de una regla beta a producción requiere una implementación y revisión posteriores; fusionar estos archivos de herramientas no la habilita en el producto. No se añaden condiciones experimentales al motor oficial ni hooks beta a sus paneles.

## Trabajo que sigue abierto

- Contrastar en el cliente beta las restricciones y casos límite de las Dracorunas. La descripción de los objetos del API confirma la dirección de las conversiones y el bloqueo posterior de forjamagia, pero no todas las reglas de compatibilidad.
- Ébano funciona como hipótesis visible: 70 % de la mayor línea positiva, redondeado hacia abajo, para Potencia y Daños; conserva penalizaciones y daño neutro, y suma sobre Potencia/Daños existentes. Redondeo, tratamiento del neutro y coexistencia con esas líneas requieren comprobación. Sus tests fijan la hipótesis del laboratorio, no demuestran que sea la regla final del juego.
- Completar Belíade: curas, escudos, desbloqueos de definitivos, transiciones de tamaño, costes dinámicos de PA y daño reactivo o de invocaciones no se simulan. Las etiquetas de curas son valores base; los definitivos muestran solo el ataque inicial. El selector de rango del definitivo es una prueba manual, no una validación del desbloqueo.
- Pirólisis se proyecta a partir de su hechizo activado 33319, con condiciones de tamaño explícitas. El rango 1 de los datos aumenta el daño con el tamaño, pese a que la descripción indica lo contrario; se conserva y se señala la contradicción, sin reordenar los valores. Fuego Negro calcula cada evento de robo por separado; no es una simulación automática de sus turnos.
- Revisar los demás efectos nuevos detectados; los metadatos de presentación no representan por sí solos mecánicas pendientes.
- El Dofus de la Fuente (34577, todavía marcado `[!]` por el proveedor) ofrece mediante el motor compartido un control manual de +30 % de resistencias a los cinco elementos, desactivado por defecto y sujeto al límite de 50 %. Verificado contra los datos beta y en navegador. La condición de bajar del 50 % de vida, los dos turnos de duración y el uso único por combate se describen en el objeto; no hay un motor de turnos que los active automáticamente. Completar los demás efectos condicionales que no estén cubiertos por los controles disponibles.

El taller permite ir implementando y comprobando estas reglas sin habilitarlas en producción. El alcance completo de Dofus 3.8 sigue abierto hasta cerrar esas validaciones.

## Verificación

```sh
pnpm check:beta
cargo test --locked --manifest-path rust-optimizer/Cargo.toml --lib
cargo test --locked --manifest-path rust-optimizer/Cargo.toml --test forge_golden
cargo test --locked --manifest-path tools/beta/rust-optimizer/Cargo.toml --lib
pnpm test -- tools/beta src/store/__tests__/buildStore.test.ts src/store/__tests__/dataStore.test.ts scripts/__tests__/fetch-passives.test.ts
node tools/beta/check.mjs
node tools/beta/check-forge.mjs
node tools/beta/check-bellaphone.mjs
```

Los tres últimos comandos necesitan el servidor beta arrancado. Cubren conversiones, deshacer/rehacer, recarga, exportación, hechizos de Belíade, cuatro idiomas, los cinco paneles en móvil y ausencia de conexiones de datos externas; el segundo ejecuta el WASM real, busca una conversión sobre un objeto fijado, comprueba que cargarla reproduce los totales y la runa anterior, y confirma que el diálogo carga los módulos de Forjadora locales. El tercero contrasta ramas normales y críticas, veneno, seis definitivos, bonus propios, recarga del escenario y cuatro idiomas sobre los snapshots beta reales. Los tests nativos conservan los golden del optimizador oficial. `pnpm build` verifica que el producto siga compilando por su circuito habitual.

## Fuentes

- [API DofusDude: canal beta del juego](https://api.dofusdu.de/dofus3beta/v1/meta/version).
- [Documentación del proveedor](https://github.com/dofusdude/api-docs/blob/main/openapi-3.0.yaml): `dofus3` y `dofus3beta` son canales del juego. Esto es independiente del beta del software doduapi mencionado en M162.
- [Releases de los datos beta](https://github.com/dofusdude/dofus3-beta/releases): hechizos, pasivos, localización y retratos.
- [Devblog de Ankama: equipos y Dracorunas](https://www.dofus.com/fr/mmorpg/actualites/devblog/billets/1772495-maj-3-8-equipements-dracorunes). El sitio bloqueó la lectura automática con HTTP 403 durante esta sesión; no se considera una verificación directa de los casos límite. Las seis descripciones localizadas del juego quedan descargadas en `data/{idioma}/dracorunes.json`.
