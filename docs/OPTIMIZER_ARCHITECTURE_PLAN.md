# Plan — La Forjadora: motor único en Rust, búsqueda validada, progreso en vivo

**Estado: aprobado parcialmente, en ejecución.**

Decisiones ya confirmadas por el usuario:
- Sección 3.2 (eliminar el motor de respaldo en TypeScript del camino de ejecución) — **aprobada e implementada**. `src/engine/optimizer.ts` ya no se importa desde `optimizer.worker.ts` — no viaja al navegador, no se usa en producción. Se mantiene el archivo + su suite de 37 tests como implementación de referencia para comparar comportamiento, no como motor real.
- Sin backend/Cloudflare de cómputo — confirmado explícitamente, todo el cálculo sigue dependiendo de la máquina del usuario, costo $0.
- Sección 5 (progreso en vivo + botón "usar este resultado ahora") — **pendiente de implementar**, siguiente paso.
- Sección 4 (arnés de validación sistemática) — **pendiente de implementar**.

Además, en el camino se encontró y arregló un bug adicional (fuera del plan original): el stat genérico "Daños" (plano, no elemental) no heredaba prioridad de los daños elementales, igual que ya le pasaba a Potencia antes de M100 — mismo patrón, mismo arreglo, en los dos motores.

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

## 5. UX: búsqueda "en cualquier momento" con progreso en vivo

Hoy la búsqueda es una sola llamada síncrona a WASM: no hay forma de ver progreso real, ni de aceptar un resultado parcial antes de que termine. Para pedidos exigentes esto puede tardar hasta un par de minutos sin ninguna señal de qué está pasando (ya se mejoró el spinner con mensajes rotativos y contador de tiempo, pero sigue siendo "esperar a ciegas hasta el final").

Propuesta:
- El motor Rust reporta progreso periódicamente durante la búsqueda (no solo al final): mejor puntaje encontrado hasta el momento, cuántos de los requisitos obligatorios ya se cumplen, en qué fase de la búsqueda está.
- La interfaz muestra esto en vivo: un número ("7 de 9 requisitos cumplidos"), opcionalmente un gráfico simple de cómo mejora el puntaje con el tiempo.
- Botón para **cortar la búsqueda ahí mismo y usar el mejor resultado encontrado hasta ese momento**, en vez de esperar el corte automático fijo.
- Esto no cambia el algoritmo de búsqueda en sí — es una capa de comunicación sobre el mismo motor, que además resuelve el problema de "parece que está trabado" sin tener que adivinar cuánto tiempo darle.
- Técnicamente: requiere que la función de Rust que corre la búsqueda acepte una función de JavaScript como parámetro (algo totalmente soportado por la tecnología que conecta Rust con el navegador), que se llama periódicamente durante la búsqueda con el estado actual, y cuyo valor de retorno le dice a Rust si debe seguir o cortar ahí. Es un cambio acotado al "borde" entre Rust y JavaScript — no toca la lógica de búsqueda interna.

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

Reproducido el caso exacto que el usuario armó en una herramienta comparable (11 requisitos: PA, PM, PV, 4 resistencias elementales, resistencia neutra, Alcance, Fuerza, Daño de Tierra — pesos e ids reales, no inventados). Resultado contra nuestro catálogo real, con el motor actual ya mejorado (M106/M107 + el fix de sinergia de Daños de esta misma vuelta):

- **8 de 11 requisitos se cumplen exactos o de sobra** (incluyendo Daño de Tierra en el valor EXACTO pedido).
- **3 quedan cortos**: PA (10 de 12), PV (4003 de 5000), Fuerza (1268 de 1350).
- **Tiempo: ~116 segundos.**

La herramienta comparable encontró una solución que cumple los 11 en ~8 segundos, usando una combinación de 3 sets reales. Esta brecha (116s y 3 de 11 sin cumplir, contra 8s y 11 de 11) es demasiado grande para explicarla solo por "hay que darle más tiempo" — ya se probó extensamente subir seeds/pools/tiempo (ver M106 en ROADMAP.md) con retornos cada vez más chicos. Es una señal real de que el ENFOQUE del algoritmo (búsqueda acotada exhaustiva de sets + ascenso de colina) puede no ser el más eficiente para este tipo de problema específico, no solo un problema de parámetros.

La herramienta comparable usa un algoritmo genético (población de builds que evoluciona generación a generación, con mutación y selección) — una familia de algoritmo distinta a la que usamos hoy. No se investigó a fondo si migrar o agregar esto resolvería la brecha, porque es un cambio de bastante más riesgo/esfuerzo que lo demás de este plan (reemplazar o complementar el núcleo del algoritmo de búsqueda, no solo ajustar parámetros o agregar una capa de progreso visual). Se deja como pregunta abierta explícita en la sección 7.

## 7. Preguntas para decidir antes de implementar

1. ¿Se aprueba eliminar el motor de respaldo en TypeScript (sección 3.2), o se prefiere la alternativa más conservadora (3.3)?
2. ¿El botón "usar este resultado ahora" (sección 5) es prioridad junto con lo del backend/Rust, o se puede hacer en una segunda etapa?
3. ¿Cuántas configuraciones aleatorias es razonable correr en el arnés de validación (sección 4) antes de cada release grande — decenas (rápido, minutos) o cientos (más confianza, puede tardar bastante más)?
4. **La más importante dado el hallazgo de la sección 6.5**: ¿se invierte en evaluar/implementar un algoritmo genético (o similar) como motor de búsqueda, en paralelo o en reemplazo del actual? Es un cambio bastante más grande que todo lo demás de este plan — tocaría el núcleo del algoritmo, no solo parámetros o UX. Antes de tocar código ahí, se puede armar un prototipo aislado (un solo archivo de test en Rust, sin tocar el motor en producción) para medir si de verdad cierra la brecha de velocidad/calidad antes de comprometerse a reescribir el motor real.
