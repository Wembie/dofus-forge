# Plan — La Forjadora: motor único en Rust, búsqueda validada, progreso en vivo

**Estado: secciones 3.2, 5 y la pregunta 4 (algoritmo genético) implementadas; solo la sección 4 (arnés de validación sistemática) sigue pendiente.**

Decisiones ya confirmadas por el usuario:
- Sección 3.2 (eliminar el motor de respaldo en TypeScript del camino de ejecución) — **aprobada e implementada**, y luego llevada un paso más allá: `src/engine/optimizer.ts` y su suite de tests se BORRARON del repo (M109), no solo se dejaron de importar — una vez que el motor Rust cambió de estrategia de búsqueda (ver más abajo), mantener el TypeScript como "referencia" se volvió activamente engañoso, no solo redundante.
- Sin backend/Cloudflare de cómputo — confirmado explícitamente, todo el cálculo sigue dependiendo de la máquina del usuario, costo $0.
- **Pregunta 4 (algoritmo genético) — aprobada e implementada en M109, refinada en M110**: tras ver capturas de la búsqueda de una herramienta comparable (gráfico de "generaciones" convergiendo), el usuario pidió explícitamente ir directo a producción sin prototipo aislado ("HAZ EL ALGORITMO HIPERMEGA GENETICO... CAMBIA TODO"). Ver la sección 6.5 actualizada para el resultado honesto final, tras arreglar un defecto real en la función de puntaje (no solo ajuste de parámetros) en M110.
- **Sección 5 (progreso en vivo + botón "usar este resultado ahora") — aprobada e implementada en M110**, tras un pedido explícito del usuario ("hacer eso en el front... que sea mucho más interactivo") al ver que esperar 4+ minutos sin ninguna señal de progreso seguía sintiéndose roto incluso con el motor genético ya en producción. Ver el detalle técnico actualizado en la sección 5 más abajo.
- Sección 4 (arnés de validación sistemática) — **pendiente de implementar**, el único punto de este plan que sigue sin tocar.

Además, en el camino se encontraron y arreglaron varios bugs adicionales (fuera del plan original): el stat genérico "Daños" (plano, no elemental) no heredaba prioridad de los daños elementales, igual que ya le pasaba a Potencia antes de M100 — mismo patrón, mismo arreglo (M108); los checkboxes "Exo PA/PM/Alcance" solo subían el mínimo exigido sin acreditar el bonus asumido de un anillo forjado, pidiendo de hecho más de lo que la función promete (M109); la función de puntaje (`constraint_satisfaction`) premiaba mal "cumplir completo" vs. "acercarse" (M110); y el pulido final garantizado no respetaba el límite de tiempo configurado, ni la cancelación del usuario, pudiendo agregar hasta ~20-30s extra después de pedir "usar ahora" (M110, encontrado validando en vivo contra un navegador real, no solo con tests unitarios).

Este documento es la respuesta a un pedido explícito: antes de seguir tocando código, investigar a fondo, validar con evidencia, y dejar un plan completo y comentado de qué cambiar, por qué, y cómo verificar que de verdad funciona — no solo "lo probé una vez y anduvo".

No se nombran aquí herramientas de terceros específicas (dominios, marcas) porque este archivo vive en un repositorio público — las conclusiones de esa investigación sí están incorporadas, en términos genéricos.

---

## 1. Diagnóstico: ¿por qué persiste la sensación de "siempre da lo mismo"?

Repaso honesto de todo lo que ya se investigó y arregló en esta misma sesión, porque es la evidencia que sostiene el diagnóstico:

| Causa raíz encontrada | Síntoma que producía | Commit |
|---|---|---|
| `rank()` todo-o-nada (sin gradiente hacia requisitos duros parcialmente cumplidos) | Resultado idéntico sin importar el objetivo pedido | M99 |
| Filtro de items no-obtenibles basado en texto del nombre (se rompe en ES/FR/PT) | Un anillo GM de stats absurdos se colaba SIEMPRE en idiomas no-ingleses | M100 |
| Forjamagia de slots bloqueados nunca se sumaba al cálculo | Stats subestimados en builds con equipo ya forjado | M100 |
| Potencia solo contaba si tenía prioridad propia, no sinergía con daño elemental | Builds de daño sistemáticamente peor valoradas | M100 |
| El motor podía recomendar un Trofeo + un set de bonus activos simultáneamente (ilegal en el juego) | "Mejor build" que en realidad no se puede equipar | M105 |
| Profundidad de búsqueda insuficiente por defecto (pocos seeds, pools chicos) | Combos de 9+ requisitos simultáneos no se alcanzaban aunque existieran | M106 |
| Vitalidad no heredaba peso de un objetivo de "PV" | Pedir PV alto nunca invertía puntos de característica en Vitalidad | M106 |
| El repartidor de puntos no sabía de múltiples umbrales obligatorios a la vez | Dos características con mínimo propio: una quedaba en 0 | M107 |

**Conclusión del diagnóstico**: cada vez que se investigó a fondo con un caso concreto y datos reales, apareció un bug real y puntual — nunca "el algoritmo es incapaz de esto". El patrón no es que el motor esté fundamentalmente mal diseñado; es que la superficie de combinaciones posibles (decenas de miles de items, cientos de sets, 6 características, docenas de stats combinables) es tan grande que bugs específicos de una combinación quedan invisibles hasta que alguien prueba esa combinación exacta.

**Esto implica que seguir arreglando "un caso a la vez" nunca termina.** Por eso la sección 4 (validación sistemática) es la parte más importante de este plan, no un extra — es la forma de dejar de depender de que el usuario encuentre el próximo bug a mano.

---

## 2. Qué SÍ es un límite real (no un bug) — y cómo comunicarlo bien

Hay una diferencia real entre "el motor falla" y "el pedido es matemáticamente demasiado exigente para el catálogo actual del juego". Confirmado con evidencia (ver ROADMAP.md M106/M107): pedir 9-11 requisitos simultáneos muy altos en familias de stats distintas (movilidad completa + característica alta + varias resistencias altas + daño + vida alta) puede no tener solución exacta, sin importar cuánto se busque, porque 17 slots de equipo no alcanzan para maximizar todo a la vez.

Herramientas comparables del mismo género (investigadas, no nombradas aquí) manejan esto de dos maneras, ambas válidas y nada exóticas:
- Mostrar explícitamente un contador de "requisitos no satisfechos" o un puntaje de qué tan lejos está el mejor resultado posible, en vez de solo tachar en rojo el número que falta.
- Tratar la búsqueda como un proceso "en cualquier momento" (anytime): el resultado mejora con el tiempo, se puede ver mejorando en vivo, y el usuario decide cuándo "ya es suficiente" en vez de esperar un corte fijo arbitrario.

Esto no es una falla a imitar — es la forma estándar y honesta de comunicar un problema de optimización combinatoria que no siempre tiene solución perfecta. **Dofus Forge ya calcula internamente casi toda esta información** (`meetsRequired`, cuántos de los N requisitos se cumplen, qué tan lejos está cada uno) — el problema hoy es que no se muestra de forma clara, no que falte calcularla.

---

## 3. Arquitectura: consolidar todo en Rust, nada de lógica duplicada en TypeScript

### 3.1 Qué hay hoy

- `src/engine/optimizer.ts` + `src/engine/stats.ts` (~955 líneas): motor completo en TypeScript, usado como **fallback** si WASM no carga.
- `rust-optimizer/src/optimizer.rs` + `stats.rs` (~1885 líneas): motor completo en Rust, compilado a WASM, **motor principal** desde M102.
- Cada bug de esta sesión (M100, M106, M107) tuvo que arreglarse **dos veces**, una por motor, porque son dos implementaciones independientes del mismo algoritmo. El motor Rust además tiene funcionalidades que el de TypeScript nunca tuvo (triples/cuádruples de sets, reparación de conflictos de trofeos) — los dos motores ya no son equivalentes, divergieron.
- Esto es: (a) doble trabajo de mantenimiento permanente, (b) riesgo real de que un fix se aplique en uno y se olvide en el otro (ya pasó dentro de esta sesión más de una vez, detectado a tiempo porque se revisaba a propósito), (c) el fallback da resultados de **peor calidad** que el motor principal sin que el usuario lo sepa (no busca triples/cuádruples ni repara conflictos de trofeos).

### 3.2 Propuesta: WASM como único motor, sin fallback computacional en TypeScript

- Eliminar `src/engine/optimizer.ts` y `src/engine/stats.ts` como motor de cálculo. El Worker (`src/workers/optimizer.worker.ts`) deja de tener un "plan B" que recalcula todo en JS.
- Si WASM no carga o falla (navegador muy viejo, asset bloqueado, bug), el Worker reporta un error claro a la UI ("Tu navegador no puede ejecutar el optimizador" / "Hubo un error, probá de nuevo") en vez de recalcular en silencio con un motor más débil.
- Justificación para aceptar ese trade-off: soporte de WebAssembly en navegadores modernos (todo lo que no sea Internet Explorer o versiones ya sin soporte) está prácticamente universal desde hace varios años. El resto de la aplicación (planner, catálogo, etc.) no depende de WASM, así que este cambio no vuelve "todo el sitio" dependiente de WASM, solo La Forjadora.
- Beneficio directo y permanente: **cada bug se arregla una sola vez**, en un solo lugar, y el fallback nunca vuelve a quedar desactualizado silenciosamente.
- Costo: reescribir/eliminar ~955 líneas de TypeScript y sus tests asociados (los tests de `optimizer.test.ts` que ejercitan el motor TS directamente dejan de tener sentido tal cual están — hay que decidir si se migran a ejercitar el motor Rust vía los bindings de WASM en el entorno de test, o si se asume que la cobertura Rust nativa (`cargo test`) ya es suficiente y los tests TS se reducen a solo UI/integración).

### 3.3 Alternativa más conservadora (si el punto anterior se considera demasiado riesgoso)

Mantener el fallback pero generarlo automáticamente a partir de Rust compilando a una segunda build de WASM específica para Node/test (ya existe parcialmente: `wasm-pack build --target nodejs` se usa en los tests). Esto NO elimina la duplicación de código fuente, pero sí permite que los tests de TypeScript corran contra el MISMO binario que producción, eliminando el riesgo de drift silencioso sin borrar nada. Es un paso intermedio, no la solución completa que se pidió ("todo en Rust, nada en el front"), pero es más barato y reversible.

**Recomendación de este plan: opción 3.2 (eliminar el fallback TS por completo).** Es la que de verdad cumple "todo en Rust, nada en el front" y la que elimina el patrón de bugs duplicados de raíz, no solo lo mitiga.

---

## 4. Validación sistemática — dejar de depender de "un caso a la vez"

Esta es la parte que responde directamente a "hay demasiadas combinaciones, hay que validar muy bien". Probar manualmente una combinación a la vez (como se hizo toda esta sesión) encuentra bugs reales, pero nunca termina — siempre hay una combinación más que no se probó.

Propuesta: un arnés de pruebas automáticas que genera **cientos de configuraciones aleatorias** (pesos y mínimos al azar sobre los ~20-60 stats disponibles) y las corre contra el catálogo real, verificando automáticamente propiedades que SIEMPRE deben cumplirse, sin importar qué configuración se haya generado:

1. **Legalidad siempre**: para cualquier configuración, el mejor resultado devuelto nunca debe tener `conditionsOk: false` (el bug de M105, pero verificado contra cientos de combinaciones en vez de una sola armada a mano).
2. **Sensibilidad a los pesos**: si dos configuraciones difieren solo en qué stat tiene más prioridad, los equipos resultantes deben diferir en una cantidad mínima de slots (detecta automáticamente el patrón "siempre da lo mismo" si alguna vez reaparece, en vez de esperar a que el usuario lo note).
3. **Alcanzabilidad de combos moderados**: generar combinaciones de 2-4 requisitos con márgenes generosos (fáciles de cumplir individualmente, como se probó a mano en M106/M107) y verificar que el resultado los cumple TODOS — si alguna falla, es una señal automática de que hay otro bug tipo M106/M107 esperando a ser encontrado.
4. **Determinismo**: correr la misma configuración dos veces debe dar exactamente el mismo resultado (ya se arregló una vez con `BTreeMap` — esto lo vuelve una garantía verificada, no una suposición).
5. **Monotonía básica**: subir el peso de un stat no debería nunca hacer que ese stat termine más bajo que con un peso menor, a igualdad de lo demás.

Esto se implementaría como un archivo de test en Rust (`#[ignore]` por defecto, igual que `real_catalog_bench.rs` y `user_reported_case.rs` ya existentes), pensado para correrse manualmente antes de cada cambio grande al motor, no en cada commit (correr contra el catálogo real con cientos de configuraciones es lento, del orden de minutos a horas según cuántas se prueben). Es la versión automatizada y repetible de exactamente el trabajo manual que se hizo toda esta sesión.

---

## 5. UX: búsqueda "en cualquier momento" con progreso en vivo — ✅ implementada en M110

Lo descrito abajo era la propuesta original; quedó implementada tal cual, con dos matices encontrados solo al validar en vivo contra un navegador real (no solo con tests unitarios de Rust):

- **El motor Rust reporta progreso periódicamente** — no solo durante las generaciones del algoritmo genético, sino TAMBIÉN durante las fases 0/1/2/2.5 (greedy, sets individuales, pares, triples) que corren antes. Esto no estaba en la propuesta original y resultó ser necesario: esas fases por sí solas pueden tardar una cantidad real de segundos en el catálogo completo, y sin progreso ahí el usuario seguía sin ninguna señal durante ese tramo — exactamente el problema que esta sección buscaba resolver.
- **La interfaz muestra esto en vivo**: "X de Y requisitos cumplidos" más una vista previa real del mejor build encontrado hasta el momento — se reutilizó `BuildResultCard` (el mismo componente de la pantalla de resultados final) en vez de construir una vista paralela, así que "ver cómo van cambiando los objetos" (pedido explícito del usuario) se resolvió sin duplicar UI.
- **Botón "Usar este resultado ahora"** corta la búsqueda y entrega el mejor resultado encontrado — pero no instantáneamente: pedía hasta ~20-30s en la primera versión porque ni el pulido final garantizado ni el resto de la generación en curso revisaban la señal de cancelación. Arreglado revisando la señal mucho más seguido (antes de cada candidato del pulido final, y cada 50 individuos dentro de una generación, no solo al terminarla) — la espera real bajó a ~7-9s en pruebas repetidas. Sigue sin ser instantáneo porque es cancelación cooperativa (Rust solo puede parar en un punto de control, no a mitad de un cálculo), pero es un cambio radical frente a la espera fija original.
- No cambió el algoritmo de búsqueda en sí — es una capa de comunicación sobre el mismo motor.
- Técnicamente: la función de Rust que corre la búsqueda acepta una función de JavaScript como parámetro (`js_sys::Function`, soportado nativamente por wasm-bindgen), llamada periódicamente con el estado actual; su valor de retorno le dice a Rust si debe seguir o cortar ahí.

---

## 6. Resumen de qué tocar, archivo por archivo (si se aprueba todo)

| Archivo | Qué cambia |
|---|---|
| `rust-optimizer/src/optimizer.rs` | Agregar parámetro de callback de progreso + chequeo de "cortar ahora" en los puntos de control ya existentes (fases 0-2.75, cada seed del hill-climbing) |
| `rust-optimizer/src/lib.rs` | `run_optimizer_wasm` acepta la función de progreso de JS y la reenvía |
| `src/workers/optimizer.worker.ts` | Deja de tener el `import { runOptimizer }` de TypeScript como plan B; construye la función de progreso y la pasa a WASM; reenvía los mensajes de progreso al hilo principal |
| `src/features/optimizer/OptimizerModal.tsx` | Pantalla de "corriendo" muestra el progreso real (requisitos cumplidos, puntaje) y un botón "usar este resultado ahora" |
| `src/engine/optimizer.ts`, `src/engine/stats.ts` | Eliminar (si se aprueba 3.2) o dejar sin tocar (si se prefiere 3.3) |
| `src/engine/__tests__/optimizer.test.ts` | Reestructurar para probar contra el motor Rust (si se aprueba 3.2) |
| `rust-optimizer/tests/fuzz_validation.rs` (nuevo) | El arnés de validación sistemática de la sección 4 |

---

## 6.5. Evidencia nueva: comparación directa contra un caso real de 11 requisitos

Reproducido el caso exacto que el usuario armó en una herramienta comparable (11 requisitos: PA, PM, PV, 4 resistencias elementales, resistencia neutra, Alcance, Fuerza, Daño de Tierra — pesos e ids reales, no inventados).

**Resultado con el motor ANTERIOR** (búsqueda acotada exhaustiva de sets + ascenso de colina, M106/M107 + fix de sinergia de Daños):
- **8 de 11 requisitos se cumplen exactos o de sobra** (incluyendo Daño de Tierra en el valor EXACTO pedido).
- **3 quedan cortos**: PA (10 de 12), PV (4003 de 5000), Fuerza (1268 de 1350).
- **Tiempo: ~116 segundos.**

La herramienta comparable encontró una solución que cumple los 11 en ~8 segundos, usando un algoritmo genético (población de builds evolucionando por generaciones). Esta brecha pareció demasiado grande para explicarla solo por "más tiempo de búsqueda" — llevó directamente a la decisión de implementar un motor genético propio (M109), aprobada por el usuario sin pedir un prototipo aislado primero.

**Resultado con el motor GENÉTICO/MEMÉTICO nuevo (M109)**, sobre el MISMO caso:
- **6-7 de 11 según la corrida exacta** (el motor usa una semilla determinística por configuración, pero operadores de cruce/mutación distintos entre ajustes de esta misma sesión dieron 5, 6 y 7 — la brecha entre "casi lo mismo" y "un punto más" en un problema así de ajustado resultó ser sensible a detalles finos del algoritmo).
- **Tiempo: ~90-130 segundos** — más rápido que antes, pero no cerca de los ~8s de la herramienta comparable.
- Es decir: el cambio de algoritmo **no cerró la brecha en este caso específico** — de hecho, en su número de requisitos cumplidos, quedó ligeramente por debajo del motor anterior (6-7 vs 8).

**Por qué se implementó de todos modos**: este caso de 11 requisitos es deliberadamente adversarial (pesos extremos, objetivos simultáneos que compiten entre sí por los mismos slots). En CUALQUIER otro caso probado contra el catálogo real — 2 a 5 stats, el tipo de pedido que un usuario real hace la gran mayoría de las veces — el motor nuevo iguala o supera claramente al anterior, y además resuelve el problema estructural que de verdad motivó el pedido: pesos de prioridad distintos ahora producen builds genuinamente distintos (16-17 de 17 slots difieren entre priorizar Vitalidad vs. Fuerza vs. Agilidad, con el stat priorizado maximizado con fuerza — antes, las pools de candidatos se recortaban a un top-250 por una heurística aproximada que apenas cambiaba entre pesos parecidos, así que pedidos distintos convergían en los mismos ítems "genéricamente buenos"). Esa causa raíz específica queda eliminada: el motor nuevo samplea del pool COMPLETO cada generación, nunca con un corte duro.

**Validación honesta, no solo la mejor corrida**: durante el ajuste de parámetros se encontró y corrigió una regresión real — una tasa de operadores de sets más agresiva (pensada para ayudar al caso de 11 requisitos) rompió un caso simple que antes funcionaba perfecto (Vitalidad+Fuerza sin ningún set de por medio). Se revirtió a una tasa más conservadora que no sacrifica lo simple por lo adversarial. Lección para cualquier ajuste futuro de este motor: correr SIEMPRE el set completo de casos (no solo el que se está persiguiendo) antes de declarar una mejora.

**Conclusión de M109**: el algoritmo genético no fue una bala de plata para el caso más extremo probado, pero sí resolvió el problema real y reportado ("siempre recomienda lo mismo") con evidencia directa y reproducible. Se anotó como trabajo futuro: "una función de puntaje que distinga mejor entre 'casi cumplido' y 'sobra margen' en vez de tratar cada requisito como todo-o-nada una vez cruzado su umbral".

**Actualización M110 — ese trabajo futuro se hizo, y sí cerró la brecha**: `constraint_satisfaction` (la función de puntaje) promediaba qué tan cerca estaba cada requisito, sin ninguna recompensa específica por cruzarlo del todo — confirmado como el problema real, no solo un síntoma de tuning insuficiente. Se agregó un bono fijo por cada requisito completamente cumplido (dobla su aporte al puntaje), haciendo que "cuántos requisitos se cumplen" domine por sobre "cuánto margen sobra en los ya cumplidos". Sobre el MISMO caso de 11 requisitos:
- **8 de 11 — empata al motor viejo** (antes 5-7 de 11 con el motor genético sin este arreglo).
- **Tiempo: ~70-90 segundos** — más rápido que el motor viejo (116s) Y mejor en requisitos cumplidos que las corridas previas del motor genético.
- Y, a diferencia de los ajustes de M109 (que mejoraban el caso difícil a costa de romper uno simple), este arreglo mejoró TODOS los casos probados a la vez — A, B, C, D y la prueba de diversidad de pesos — sin ninguna contrapartida medida. Es la señal más clara de que era un defecto estructural de la función de puntaje, no un parámetro a calibrar.

**Conclusión final honesta**: con este arreglo, el motor nuevo iguala al viejo en el caso más adversarial probado y lo supera claramente en todo lo demás (velocidad, diversidad, y ahora también calidad en casos simples/moderados). Alcanzar los 11 de 11 que logra la herramienta comparable en este caso específico sigue sin estar confirmado como posible con el catálogo real — no se descarta que sea un límite genuino del catálogo, no del algoritmo, pero tampoco se investigó a fondo esa pregunta puntual.

## 7. Preguntas para decidir antes de implementar

1. ~~¿Se aprueba eliminar el motor de respaldo en TypeScript?~~ — **Resuelto (M109): sí, y además se borró el archivo por completo**, no solo se dejó de usar.
2. ~~¿El botón "usar este resultado ahora" (sección 5) es prioridad?~~ — **Resuelto (M110): sí, implementado**, tras un pedido explícito del usuario de hacer la búsqueda más interactiva. Ver la sección 5 para el detalle de los dos bugs reales (no solo features faltantes) que la validación en vivo encontró y corrigió.
3. ¿Cuántas configuraciones aleatorias es razonable correr en el arnés de validación (sección 4) antes de cada release grande — decenas (rápido, minutos) o cientos (más confianza, puede tardar bastante más)? — **la única pregunta de este plan que sigue abierta.**
4. ~~¿Se invierte en evaluar/implementar un algoritmo genético como motor de búsqueda?~~ — **Resuelto (M109, refinado en M110): sí.** Resultado honesto final en la sección 6.5: tras arreglar un defecto real en la función de puntaje (no solo ajuste de parámetros), el motor nuevo empata al viejo en el caso más adversarial probado (8 de 11) y lo supera en todo lo demás (velocidad, diversidad de resultados, y calidad en casos simples/moderados).
