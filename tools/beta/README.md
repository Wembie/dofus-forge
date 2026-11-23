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

## Separación

- `tools/beta/data/` contiene los snapshots beta, está ignorado por Git y queda fuera de `public/` y del build de producción. Los scripts habituales conservan su destino y canal oficial; solo `--beta` escribe aquí.
- El servidor local sirve esos snapshots desde `/data/`. Solo comparte con producción el arte estático de estadísticas, runas y clases, junto con los componentes y el motor existente.
- El taller tiene una instancia propia del store de la build. Las conversiones viven en `tools/beta/`; no se añaden a los snapshots públicos.
- La configuración no expone variables `VITE_*`. Supabase se sustituye por un adaptador que rechaza las operaciones, y la política del navegador permite conexiones de datos únicamente al servidor local. Las imágenes de objetos y runas se leen del CDN beta.
- No monta autenticación, publicaciones, perfiles, analítica ni rutas de comunidad. El borrador y el historial son locales al origen `http://127.0.0.1:5188`, con la clave `dofus-forge:beta-lab:v1`.
- Exportar/importar genera archivos JSON con formato `dofus-forge-beta`, la versión de los datos, la build y las Dracorunas. No son enlaces de builds públicas.
- Una sincronización fallida deja `.sync-in-progress`: el servidor rechaza esos datos hasta completar `pnpm fetch-beta`. También comprueba que catálogo, hechizos, pasivos e informe correspondan a la misma versión.

## Disponible

- Catálogo completo de equipo, sets, consumibles y monturas del canal beta. Constructor, condiciones y bonus de sets sobre el motor compartido.
- Nombres, descripciones, hechizos e iconos de las 20 clases de los datos actuales, incluidos los 44 hechizos de Bellaphone, llamada Belíade en español. Sus retratos oficiales se extraen del archivo de cabezas beta.
- Pasivos regenerados desde el release beta. Se aprovechan los controles del motor existente; esto no convierte automáticamente todos los efectos nuevos en mecánicas implementadas.
- Forjamagia habitual, características, hechizos y Forjadora sobre el catálogo beta. La Forjadora se desactiva cuando hay Dracorunas aplicadas, porque todavía no las representa en la búsqueda.
- Laboratorio de las seis Dracorunas: vista de antes/después con la forjamagia previa, aplicación por espacio, totales y daño de hechizos recalculados, bloqueo de nuevas forjamagias, retirada reversible y dos anillos independientes. Se conservan los bonus de sets y los ataques base del arma.
- Deshacer, rehacer, borrador automático, exportación e importación de pruebas, y los cuatro idiomas.
- Informe de objetos/sets añadidos, modificados y ausentes, además de nuevos efectos sin mapear. La referencia es el snapshot oficial **guardado en el repositorio**, que puede ir por detrás del API oficial actual. Los cosméticos y objetos de pruebas también aparecen en el informe y no se presentan como equipables por ese hecho.

En la primera sincronización, el proveedor entregaba beta `3.8.2.3`; el catálogo oficial del repositorio era `3.7.12.12`: 4.147 objetos, 959 sets, 52 objetos añadidos, 222 modificados y 19 sets añadidos. Son diferencias entre esos snapshots, no una lista oficial del parche 3.8. El taller sigue la versión disponible del API y no fija el `3.8.2.8` que se había mencionado inicialmente.

## Trabajo que sigue abierto

- Contrastar en el cliente beta las restricciones y casos límite de las Dracorunas. La descripción de los objetos del API confirma la dirección de las conversiones y el bloqueo posterior de forjamagia, pero no todas las reglas de compatibilidad.
- Ébano funciona como hipótesis visible: 70 % de la mayor línea positiva, redondeado hacia abajo, para Potencia y Daños; conserva penalizaciones y daño neutro, y suma sobre Potencia/Daños existentes. Redondeo, tratamiento del neutro y coexistencia con esas líneas requieren comprobación. Sus tests fijan la hipótesis del laboratorio, no demuestran que sea la regla final del juego.
- Incorporar las conversiones a la búsqueda y resultados de la Forjadora, incluido el tratamiento correcto de piezas conservadas, runas y espacios independientes.
- Implementar y probar las particularidades de Belíade/Bellaphone, Bellaura, linajes y estados que excedan las condiciones soportadas por el simulador actual. Cargar sus hechizos no equivale a simular toda la clase.
- Revisar los efectos nuevos detectados. En el primer snapshot aparecen `AP Max.` y `MP Max.` en algunos objetos, además de metadatos: por ahora se muestran como efectos sin mapear y no modifican los límites de PA/PM del motor.
- Comprobar los pasivos del nuevo Dofus y de los sets de La Fuente contra el cliente, incluidos efectos condicionales que el extractor actual no calcula.

El taller permite ir implementando y comprobando estas reglas sin habilitarlas en producción. El alcance completo de Dofus 3.8 sigue abierto hasta cerrar esas validaciones.

## Verificación

```sh
pnpm check:beta
pnpm test -- tools/beta src/store/__tests__/buildStore.test.ts src/store/__tests__/dataStore.test.ts scripts/__tests__/fetch-passives.test.ts
node tools/beta/check.mjs
```

El último comando necesita el servidor beta arrancado y comprueba conversiones, deshacer/rehacer, recarga, exportación, hechizos de Belíade, cuatro idiomas, los cinco paneles en móvil y ausencia de conexiones de datos externas. `pnpm build` verifica que el producto siga compilando por su circuito habitual.

## Fuentes

- [API DofusDude: canal beta del juego](https://api.dofusdu.de/dofus3beta/v1/meta/version).
- [Documentación del proveedor](https://github.com/dofusdude/api-docs/blob/main/openapi-3.0.yaml): `dofus3` y `dofus3beta` son canales del juego. Esto es independiente del beta del software doduapi mencionado en M162.
- [Releases de los datos beta](https://github.com/dofusdude/dofus3-beta/releases): hechizos, pasivos, localización y retratos.
- [Devblog de Ankama: equipos y Dracorunas](https://www.dofus.com/fr/mmorpg/actualites/devblog/billets/1772495-maj-3-8-equipements-dracorunes). El sitio bloqueó la lectura automática con HTTP 403 durante esta sesión; no se considera una verificación directa de los casos límite. Las seis descripciones localizadas del juego quedan descargadas en `data/{idioma}/dracorunes.json`.
