# Dofus Forge — Diseño de membresía de apoyo

> **Estado:** propuesta de producto y arquitectura. No hay pagos ni membresías implementados todavía.
> **Objetivo:** permitir que quien quiera ayude a sostener Dofus Forge, manteniendo gratuitas las herramientas principales.

## 1. Resumen ejecutivo

Dofus Forge debe seguir siendo útil sin pagar. La membresía se plantea como una forma voluntaria de contribuir a los costos y al desarrollo del sitio, no como una llave para desbloquear el creador, el optimizador o información del juego.

La propuesta combina **dos mecanismos distintos, con propósitos distintos**:

- **Aportador** — un aporte único, desde US$1 hacia arriba, cualquier monto que la persona quiera dar. Sin renovación, sin vencimiento, sin mínimo que dependa de que la comisión del proveedor sea rentable mes a mes: es un regalo puntual, no un ingreso recurrente. Su única función es dar una forma simple y de fricción mínima para decir "gracias" una vez.
- **Escalera de suscripción** (Aprendiz, Artesano, Forjador, Maestro de la Forja) — cobro recurrente mensual, trimestral o anual. Esta es la que debe sostener el sitio de forma predecible (hosting, dominio, servicios). Por eso su precio más bajo **no puede ser US$1/mes**: una comisión fija de ~US$0.50 por cobro se come más de la mitad de un cargo de US$1 **cada mes**, indefinidamente — eso no sostiene nada, solo regala el apoyo de la persona al proveedor de pagos. El piso de la escalera recurrente arranca en **US$3/mes**, donde la comisión ya baja a un rango razonable (~22-24%, ver §9).

Ambos mecanismos conviven: alguien puede dar un aporte único sin nunca suscribirse, suscribirse sin haber dado nunca un aporte único, o hacer ambas cosas. Son reconocimientos independientes.

1. Mantener el acceso gratuito a las funciones principales.
2. Ofrecer el aporte único **Aportador** y cuatro niveles de membresía recurrente con cobro mensual, trimestral o anual.
3. Hacer que cada nivel de la escalera recurrente herede lo anterior y sume reconocimiento, comodidad o personalización.
4. Mostrar una insignia pública opcional que corresponda al aporte único y/o al nivel de suscripción elegido.
5. Mantener los roles de moderación y administración separados de los niveles de membresía y del aporte único.
6. Cuando termine el periodo pagado de una suscripción sin una renovación válida, devolver automáticamente la cuenta a Free. El aporte único nunca vence ni se revierte: es permanente desde el momento en que se confirma el pago.

Se incluye una escalera de precios inicial en USD para que la propuesta sea concreta. Es una hipótesis para un piloto, no una disposición a pagar ya validada; debe probarse con la comunidad y revisar el neto por proveedor antes de habilitar cobros.

## 2. La promesa del producto

> **Dofus Forge seguirá siendo gratis para crear, planear y optimizar builds. Si la herramienta te sirve, puedes apoyarla para ayudar a mantenerla y mejorarla. Apoyar es opcional.**

Esta promesa debe aparecer de forma clara en la página de apoyo y antes de confirmar cualquier pago. La experiencia gratuita no debe sentirse como una prueba que empuja al usuario a pagar.

### Objetivos

- Crear una vía sostenible para que la comunidad ayude con los costos del proyecto.
- Reconocer a las personas que contribuyen, si desean mostrarlo.
- Explicar de forma honesta qué sostiene el apoyo y qué beneficios concretos ofrece.
- Mantener las funciones centrales accesibles aunque alguien nunca pague.
- Hacer que cancelaciones, vencimientos y cambios de plan sean previsibles.

### Fuera de alcance

- Vender mejores resultados, prioridad del algoritmo o builds más fuertes.
- Vender ventajas de moderación, administración o control sobre otros usuarios.
- Hacer que likes, ratings, seguidores o posicionamiento en Explore dependan de un pago.
- Publicar el monto aportado, los datos de facturación o la identidad de pago de una persona.
- Lanzar cobros antes de definir proveedor, precio, condiciones y flujo de cancelación.

## 3. Separar los conceptos

La interfaz puede llamar a esto “membresía” o “nivel de apoyo”, pero en los datos no debe confundirse con el rol de la cuenta.

| Concepto | Para qué sirve | Ejemplos | ¿Se muestra en el perfil público? |
| --- | --- | --- | --- |
| Rol de cuenta | Permisos administrativos y de moderación | `user`, `moderator`, `admin` | No como insignia de apoyo |
| Aporte único | Reconoce un regalo puntual, sin recurrencia ni vencimiento | `supporter` (Aportador) | Solo una insignia segura y opcional |
| Nivel de membresía | Refleja el nivel de apoyo **recurrente** y calcula sus beneficios | `free`, `apprentice`, `artisan`, `forger`, `master` | Solo una insignia segura y opcional |
| Reconocimiento comunitario | Reconoce aportes no económicos en el futuro | colaborador, traductor, creador destacado | Puede mostrarse, con criterios propios |

En el esquema actual, `profiles.role` controla privilegios de la cuenta. **No debe reutilizarse para representar una membresía ni un aporte único.** Pagar nunca debe convertir una cuenta en moderador o administrador. El comentario de tiers en `supabase/schema.sql` es un boceto no implementado, no una función disponible.

En la interfaz sí puede hablarse de **Aportador** para el aporte único y de **rangos de apoyo** —Aprendiz, Artesano, Forjador y Maestro— para la escalera recurrente, porque ese es el lenguaje visual que se busca. En el modelo de permisos, ninguno de los dos es un rol de seguridad: Aportador no es un nivel de la escalera de suscripción ni hereda ni otorga sus beneficios, es un reconocimiento aparte. La insignia debe explicar que representa apoyo al proyecto, no autoridad, habilidad en el juego ni reputación comunitaria.

## 4. Propuesta de niveles

### Aportador — aporte único

| Concepto | Detalle |
| --- | --- |
| Monto | Lo que la persona quiera dar, desde **US$1**. No hay escalones de precio: el checkout sugiere montos rápidos (US$1, US$3, US$5, US$10, US$20…) pero acepta cualquier cifra igual o mayor a US$1 |
| Recurrencia | Ninguna. Un cobro, una vez. No crea suscripción, no renueva, no vence |
| Qué otorga | La insignia **Aportador** (icono y color propios, distintos de la escalera de rangos) y la fecha del primer aporte (“Aportando desde marzo 2026”) |
| Relación con la escalera de rangos | Ninguna. Dar un aporte único no otorga ni cuenta para Aprendiz/Artesano/Forjador/Maestro, y viceversa — son reconocimientos independientes |
| Por qué funciona a US$1 | Es un cobro único, no uno que se repite. Que el proveedor se quede con la mitad de un regalo puntual es aceptable; que se quede con la mitad de un cobro que se repite cada mes no lo es (ver la escalera recurrente abajo) |

### Escalera de suscripción

La propuesta combina reconocimiento visible, personalización que se usa dentro de la página y más espacio para organizar el trabajo. Las herramientas principales siguen completas en Free. Los precios base son en USD; el usuario puede elegir cobro mensual, trimestral o anual. Conviene localizar el checkout y validar precios por región, no asumir que una misma cifra es accesible en todos los países.

El piso de esta escalera es **US$3/mes**, no US$1: esta es la vía pensada para sostener el sitio con ingreso recurrente, y un cobro mensual de US$1 pierde la mayoría de su valor en comisión fija cada mes (ver §9). Quien quiera apoyar con exactamente US$1 lo hace como Aportador (arriba), no suscribiéndose.

| Nivel visible | Precio mensual base | Experiencia dentro de Dofus Forge | Límite de builds sugerido |
| --- | ---: | --- | ---: |
| **Free** | **US$0** | Builder y optimizador completos, perfil público y 1 build destacada | 50 |
| **Aprendiz de la Forja** | **US$3/mes** | Insignia y marco Aprendiz, paleta básica, racha e hitos de apoyo | 50 |
| **Artesano** | **US$6/mes** | Todo Aprendiz; color y título de perfil, 2 builds destacadas y más espacio | 100 |
| **Forjador** | **US$10/mes** | Todo Artesano; portada de perfil, 3 builds destacadas y aún más espacio | 250 |
| **Maestro de la Forja** | **US$18/mes** | Todo Forjador; tema premium con efecto animado sutil, 5 builds destacadas, mayor capacidad y analíticas privadas ampliadas | 1.000 |

### Periodicidad y ahorro

Propuesta simple para mostrar en el selector de pago: el trimestre tiene **5% de descuento** frente a tres pagos mensuales y el año cuesta lo mismo que **10 meses**, es decir, **2 meses gratis / 16.7% de ahorro** frente a doce cobros mensuales.

| Rango | Mensual | Trimestral (ahorra 5%) | Anual (ahorra 16.7%) |
| --- | ---: | ---: | ---: |
| **Aprendiz** | US$3/mes | US$8.55 cada 3 meses (ahorra US$0.45) | US$30/año (ahorra US$6; equivale a US$2.50/mes) |
| **Artesano** | US$6/mes | US$17.10 cada 3 meses (ahorra US$0.90) | US$60/año (ahorra US$12; equivale a US$5/mes) |
| **Forjador** | US$10/mes | US$28.50 cada 3 meses (ahorra US$1.50) | US$100/año (ahorra US$20; equivale a US$8.33/mes) |
| **Maestro** | US$18/mes | US$51.30 cada 3 meses (ahorra US$2.70) | US$180/año (ahorra US$36; equivale a US$15/mes) |

Los totales son antes de impuestos que el proveedor pueda añadir o incluir y de la conversión de moneda. Si se activan precios locales distintos, recalcular el ahorro usando el precio mensual de esa región. El checkout debe mostrar con el mismo tamaño visual el total que se cobra hoy, su periodicidad, el equivalente mensual, cuándo renueva y cómo cancelar. No presentar el anual como “16.7%” solamente: destacar también **“2 meses gratis”** y el ahorro en moneda.

La parte “wow” debe ser una **Forja de perfil** con vista previa inmediata: emblema, marco, portada, paleta y título se ven en el perfil y en las tarjetas de build. La racha desbloquea recuerdos cosméticos permanentes. Las analíticas muestran solo totales agregados, nunca quién visitó o guardó una build. Los efectos animados deben respetar `prefers-reduced-motion`.

Las cuotas superiores a Free son hipótesis: medir almacenamiento y uso, aplicar límites en Supabase y comprobar que el costo siga siendo sostenible antes de prometer 100/250/1.000 builds en los rangos de pago. Las analíticas y el editor de portadas son beneficios de una fase posterior, sujetos a instrumentación y revisión de privacidad; el piloto puede empezar con insignias, racha, paletas predefinidas y builds destacadas.

No cobrar por una tarjeta que prometa una función todavía no disponible. Publicar cada beneficio como incluido solo después de implementarlo y probar sus límites, privacidad y accesibilidad.

### Racha de apoyo y reconocimientos

- Mostrar el total de meses consecutivos cubiertos por una membresía pagada y los meses consecutivos cubiertos en el nivel actual. Ejemplo: **“8 meses apoyando · 4 como Forjador”**.
- Calcular la racha por meses de servicio cubiertos, no por número de transacciones: un cobro trimestral puede sumar hasta 3 meses conforme transcurre el periodo y uno anual hasta 12; no adelantar los hitos del año el primer día del cobro anual.
- Mantener una racha total de apoyo y otra del nivel actual. Cambiar de nivel conserva la racha total, reinicia la racha del nivel y deja guardados los meses históricos de cada uno.
- Si termina el periodo pagado sin renovación, se vuelve a Free y la racha activa se cierra. El historial y los cosméticos de hitos ya obtenidos se conservan; una nueva membresía inicia otra racha.
- Hitos sugeridos: 3, 6 y 12 meses consecutivos, con sellos/títulos cosméticos permanentes. La insignia que indica el nivel actual y sus beneficios recurrentes sí desaparecen al vencer.
- Mostrar también el contador de permanencia del rango actual; a los 3, 6 y 12 meses cubiertos en ese rango, se pueden desbloquear variantes cosméticas conmemorativas de ese rango.
- No publicar el monto pagado ni usar alarmas, pérdida de objetos, mensajes de culpa o temporizadores para presionar a mantener la renovación.
- La persona elige si muestra nivel, racha y reconocimientos en su perfil. Por defecto, no hacer pública la antigüedad del pago.

### Validación de precios

La escalera recurrente de **US$3/US$6/US$10/US$18** es una hipótesis para un piloto, no una conclusión de cuánto pagaría la comunidad. Partir de US$3 (no US$1) es deliberado: a US$1/mes la comisión fija se come más de la mitad del cobro, mes tras mes — quien quiera apoyar con US$1 lo hace como **Aportador** (aporte único, §4), no suscribiéndose. Los rangos superiores suman capacidad y personalización. Antes de lanzar, probar el selector con usuarios y comparar conversión, cancelación, periodicidad elegida y neto por país.

Estimación de comisiones con los precios propuestos, calculada sobre el cargo antes de impuestos:

| Cobro | Precio | Paddle, referencia 5% + US$0.50 | Lemon Squeezy, tarjeta internacional, referencia US$0.50 + 7% |
| --- | ---: | ---: | ---: |
| Aprendiz mensual | US$3 | US$0.65 (21.7%) | US$0.71 (23.7%) |
| Artesano mensual | US$6 | US$0.80 (13.3%) | US$0.92 (15.3%) |
| Forjador mensual | US$10 | US$1.00 (10%) | US$1.20 (12%) |
| Maestro mensual | US$18 | US$1.40 (7.8%) | US$1.76 (9.8%) |
| Aprendiz trimestral | US$8.55 | US$0.93 (10.8%) | US$1.10 (12.8%) |
| Artesano trimestral | US$17.10 | US$1.36 (7.9%) | US$1.70 (9.9%) |
| Forjador trimestral | US$28.50 | US$1.93 (6.8%) | US$2.50 (8.8%) |
| Maestro trimestral | US$51.30 | US$3.07 (6%) | US$4.09 (8%) |
| Aprendiz anual | US$30 | US$2.00 (6.7%) | US$2.60 (8.7%) |
| Artesano anual | US$60 | US$3.50 (5.8%) | US$4.70 (7.8%) |
| Forjador anual | US$100 | US$5.50 (5.5%) | US$7.50 (7.5%) |
| Maestro anual | US$180 | US$9.50 (5.3%) | US$13.10 (7.3%) |

Paddle publica 5% + US$0.50 por transacción y pide cotización para cargos menores de US$10. Lemon Squeezy publica US$0.50 + 5%, con +1.5% internacional y +0.5% por suscripción; también pide cotización para productos bajo US$10. La tarifa de Lemon se calcula sobre el total del pedido, por lo que impuestos pueden aumentarla; PayPal y ciertos payouts agregan más cargos. Las cifras de la tabla no son cotizaciones ni el neto final. **Confirmar el neto real con cada proveedor antes de aprobar el piloto**, en especial para el tier Aprendiz (US$3), que sigue siendo el que proporcionalmente más paga en comisión. Un aporte único de Aportador (p. ej. US$1) no tiene este problema porque no se repite: perder la mitad de un regalo puntual es aceptable, perder la mitad de un cobro mensual indefinidamente no lo es.

### Cobro recurrente, aporte único y fundador

- **Membresía:** puede cobrarse mensual, trimestral o anualmente; cada opción renueva con su intervalo y precio visibles antes de confirmar.
- **Cancelación:** detiene la siguiente renovación. Los beneficios siguen activos hasta el final del periodo ya pagado (mes, trimestre o año); entonces la cuenta vuelve a Free automáticamente.
- **Renovación fallida:** cuando ya no quede un periodo pagado vigente y el proveedor informe que la renovación no se completó, la cuenta vuelve a Free sin un periodo de gracia. Si luego se recupera el pago, el webhook restaura el nivel confirmado y la racha se retoma según los periodos realmente cubiertos.
- **Aportador (aporte único):** ver la sección dedicada al inicio de §4. No crea renovación, no concede cuotas recurrentes ni cuenta para la escalera de membresía, y no vence — es la única de las dos vías que nunca vuelve a "Free" porque nunca fue una suscripción.
- **Fundador:** reconocimiento de lanzamiento separado del nivel de seguridad, de la membresía y del Aportador. Si se ofrece, definir con exactitud quién lo obtiene, en qué fechas y si permanece después de cancelar una suscripción.

### Qué significa “más beneficios”

Cada nivel superior incluye lo del nivel anterior y añade ventajas concretas de identidad y capacidad. Ningún nivel ofrece mejores stats de combate, más poder al optimizador, mejor posición en Explore ni acceso a herramientas esenciales. El valor es apoyar, personalizar el perfil, mostrar más builds y entender el rendimiento agregado de las propias publicaciones.

Las membresías por niveles con precio y lista de beneficios son un formato común en páginas de apoyo como [Ko-fi](https://help.ko-fi.com/hc/en-us/articles/4402945994001-Ko-fi-Memberships-and-Membership-Tiers) y [Patreon](https://support.patreon.com/hc/en-us/articles/203913559-How-to-set-up-paid-tiers-and-benefits); esas páginas sirven como referencia de estructura, no validan estos precios ni obligan a usar esas plataformas.

## 5. Beneficios que encajan con el proyecto

### Beneficios recomendados

1. **Insignias distintas y progresivas**, con nombre, icono y color reconocibles, sin imitar insignias oficiales del juego.
2. **Forja de perfil con vista previa**, paletas y marcos predefinidos en el primer lanzamiento; portadas, títulos y efectos sutiles en niveles superiores.
3. **Racha e hitos de apoyo**, con cosméticos permanentes por antigüedad y una insignia actual que refleje el nivel vigente.
4. **Más builds destacadas y más espacio para guardarlas**, con límites verificados en base de datos.
5. **Analíticas privadas y agregadas** para autores: visitas y guardados de sus propias builds, si el costo de medición y la política de privacidad lo permiten.
6. **Agradecimiento de fundador** en una campaña de lanzamiento, sujeto a condiciones claras y consentimiento.
7. **Resumen periódico del proyecto**, con mejoras publicadas y costos cubiertos solo cuando haya cifras confiables.

### Beneficios que conviene evitar

- Boost de ranking, likes, ratings o alcance en Explore.
- Recomendaciones mejores o más rápidas para miembros.
- Información del juego o datos de objetos exclusivos para miembros.
- Acceso anticipado obligatorio que fragmente builds o resultados entre usuarios.
- Atención personalizada garantizada si no hay capacidad para cumplirla.
- Ventajas de moderación, insignias que parezcan oficiales de Ankama o promesas de funciones no construidas.

El optimizador se ejecuta localmente en el navegador. Por eso, “más potencia de servidor” no sería una ventaja clara ni honesta para vender en el estado actual.

## 6. Experiencia de usuario

### Página “Apoya Dofus Forge”

Debe explicar en una pantalla:

- Que apoyar es completamente opcional.
- Que el builder y el optimizador principales siguen gratis.
- Una vista previa real de cómo cambian la insignia, la portada y el perfil en cada nivel.
- Que los hitos cosméticos de antigüedad se conservan, mientras que la insignia del nivel activo y las cuotas recurrentes vencen con la membresía.
- Qué costos ayuda a cubrir el apoyo, sin inventar cifras.
- Qué recibe la persona a cambio.
- Si el cobro es único o recurrente, cuánto y con qué periodicidad.
- Cómo cancelar o cambiar la contribución.
- Qué información aparece públicamente y cómo ocultar la insignia.

La página debe presentar, como dos bloques claramente separados: (1) **Aportador**, el aporte único, con un campo de monto libre desde US$1 y botones de montos rápidos (US$1, US$3, US$5, US$10, US$20…); y (2) tarjetas comparables para **Aprendiz**, **Artesano**, **Forjador** y **Maestro de la Forja**, con un selector **Mensual / Trimestral / Anual** que actualice el total, equivalente mensual y ahorro en cada tarjeta. La propuesta muestra “Ahorra 5%” al elegir trimestre y **“2 meses gratis · ahorra 16.7%”** en el anual. Ningún monto de Aportador se convierte en un rango recurrente ni cuenta para la escalera de membresía.

Copy comercial sugerido, sin ocultar las condiciones:

> **Tu forja. Tu estilo. Tu apoyo desde US$1.**
>
> ¿Quieres dar las gracias una vez? Aporta lo que quieras desde US$1 como Aportador — sin suscripción, sin vencimiento. ¿Prefieres apoyar mes a mes y llevar tu rango contigo? Elige Aprendiz, Artesano, Forjador o Maestro desde US$3 y paga cada mes, cada 3 meses o una vez al año. Con el anual pagas 10 meses y recibes 12. Dofus Forge mantiene gratis sus herramientas principales; puedes cancelar cuando quieras y conservarás los hitos cosméticos que ya ganaste.

En el selector, el anual puede llevar la etiqueta **“Mejor ahorro”**; no marcar un plan “más popular” hasta tener datos reales. Mostrar importe total a pagar hoy y fecha/importe de la próxima renovación junto a cada llamada a la acción.

### Experiencia de compra dentro de Dofus Forge

La página de membresías, las tarjetas de rangos, el selector mensual/trimestral/anual, la vista previa de insignias y la explicación de beneficios viven en la propia app, con el diseño de Dofus Forge. El proveedor aparece al momento de pagar para procesar el cobro de forma segura; no hace falta alojar la página de membresías en Lemon Squeezy.

Flujo esperado con Lemon Squeezy:

1. La persona inicia sesión y abre la página de apoyo dentro de Dofus Forge.
2. Elige rango y periodicidad; la app muestra el importe y las condiciones antes de continuar.
3. El botón **Apoyar** llama a un endpoint del servidor. El servidor valida el usuario y el rango/periodicidad contra una lista permitida, crea un checkout con la API de Lemon Squeezy y devuelve su URL. La clave API permanece solo en el servidor.
4. El navegador redirige al checkout seguro de Lemon Squeezy. Un overlay de Lemon.js podría ser una alternativa visual futura; la opción inicial propuesta es el redireccionamiento sencillo.
5. Tras el pago, el proveedor devuelve al usuario a una ruta de Dofus Forge, por ejemplo `/membership/thanks`. Esa pantalla explica que el pago se está confirmando y luego muestra el estado actualizado.
6. Un webhook HTTPS firmado del proveedor confirma el resultado. El servidor verifica la firma, relaciona el evento con el usuario mediante metadata personalizada, registra el periodo pagado y actualiza la membresía de forma idempotente. **La redirección del navegador por sí sola nunca activa beneficios.**
7. Desde la cuenta, la persona consulta el estado y puede abrir el portal del proveedor para cambiar el método de pago o cancelar.

El dominio personalizado de Lemon Squeezy es opcional: solo cambia el dominio visible de sus páginas de checkout/portal. Se puede empezar usando el checkout alojado del proveedor y mantener la experiencia de selección y explicación dentro de Dofus Forge. Si luego se quiere una URL de checkout con marca propia, se puede usar un subdominio dedicado como `store.dofusforge.com`; ese registro DNS no reemplaza ni modifica el dominio principal de la app. El endpoint de creación de checkout y el webhook sí deben funcionar desde el backend de Dofus Forge en cualquier caso.

### Perfil público

La insignia correspondiente puede aparecer al lado del nombre en el encabezado del perfil, con el lenguaje visual oscuro, dorado y metálico de Dofus Forge. Ejemplos conceptuales:

> ❤ Aportador · ✦ Aprendiz · ⚒ Forjador · ✹ Maestro de la Forja

La insignia de Aportador usa su propio icono y color, visualmente distinto de la escalera de rangos, para que quede claro que es un reconocimiento aparte (aporte único), no un nivel de suscripción. Al pasar el cursor o enfocarla, el texto debe aclarar: “Apoya a mantener Dofus Forge gratuito”. No se muestra el monto pagado, el proveedor, la fecha del último pago ni información financiera. Ninguna de las dos insignias debe alterar la visibilidad o el ranking de las builds.

La persona debe poder ocultar la insignia sin cancelar la membresía. El perfil no debe mostrar una etiqueta “Gratis” que convierta a quienes no aportan en usuarios de segunda clase.

### Cuenta y administración

En la cuenta autenticada se mostraría:

- Nivel y estado de la membresía recurrente: Aprendiz/Artesano/Forjador/Maestro, activo, cancelado al finalizar el periodo o vencido; y, aparte, si hizo algún aporte único como Aportador (no tiene "estado", es permanente).
- Periodicidad elegida, importe total del próximo cobro, fecha de renovación y ahorro frente a pagar mensualmente.
- Meses consecutivos de apoyo, meses en el nivel actual, meses históricos por nivel e hitos cosméticos ya obtenidos.
- Comparación entre niveles y opción de mejorar o bajar de plan.
- Próxima fecha de renovación, si aplica.
- Enlace para gestionar/cancelar en el portal del proveedor.
- Control de visibilidad de la insignia.
- Explicación de qué pasa con el límite de builds si la membresía expira.

La aplicación no debería pedir ni almacenar números de tarjeta. Esa información corresponde al proveedor de pagos.

### Copy de lanzamiento sugerido

> **Ayuda a mantener Dofus Forge gratuito**
>
> Dofus Forge se construye para que cualquiera pueda planear y optimizar sus builds sin pagar. Si te ha servido, hay dos formas de apoyar: un aporte único como **Aportador** desde US$1, sin suscripción ni vencimiento; o una membresía desde US$3/mes como Aprendiz, Artesano, Forjador o Maestro, que personaliza tu perfil, muestra tus builds favoritas y celebra tu racha mientras ayuda con los costos y el desarrollo de forma continua. Elige cobro mensual, trimestral o anual; el anual cuesta 10 meses y cubre 12. Las herramientas principales siguen gratis. Cancela la membresía cuando quieras; conservas tus beneficios hasta terminar el periodo pagado y los hitos cosméticos que ya desbloqueaste. Tú decides qué aparece en tu perfil.

El texto final debe ajustarse a los costos reales y al proveedor seleccionado antes de publicar la opción de pago.

## 7. Modelo de datos y autorización

### Estado actual

- `profiles.role` usa `user`, `moderator` y `admin` para permisos.
- `profiles.builds_count` se mantiene mediante triggers.
- Un trigger bloquea la build número 51, sin importar si es pública, privada o no listada.
- El perfil público `/u/:username` ya tiene una pantalla donde podría mostrarse la insignia.
- La membresía aparece solo como idea en comentarios del schema; no hay una suscripción activa en la app.

### Separación sugerida

La información de facturación debería vivir en una tabla privada de membresías, en vez de convertir `profiles.role` en un plan. Diseño conceptual:

| Campo/dato | Propósito | Exposición |
| --- | --- | --- |
| `user_id` | Cuenta propietaria | Privada |
| `tier` | `free`, `apprentice`, `artisan`, `forger`, `master` | Privado; de aquí se derivan beneficios e insignia |
| `status` | Estado sincronizado con el proveedor | Privada |
| `provider` | Proveedor que procesa el cobro | Privada |
| `provider_customer_id` | Referencia del cliente en el proveedor | Privada |
| `provider_subscription_id` | Referencia de la suscripción, si existe | Privada |
| `current_period_end` | Fin del periodo ya pagado | Privada |
| `billing_interval` | Unidad y frecuencia: `month/1`, `month/3` o `year/1`, con precio y moneda aplicables | Privada |
| `cancel_at_period_end` | Indica si ya se pidió cancelar | Privada |
| Registro de periodos pagados | Inicio/fin de cobertura, nivel, intervalo, importe/moneda y referencia idempotente del pago | Privada |
| Racha y reconocimientos | Derivados del registro de periodos; hitos desbloqueados | Privados salvo los campos públicos que el usuario consienta |
| `created_at`, `updated_at` | Auditoría y sincronización | Privada |

La API del perfil público debería devolver únicamente datos derivados seguros y consentidos, como `supporter_badge`, `supporter_streak_months`, `current_tier_months` y `earned_cosmetics`. No debe exponer IDs del proveedor, historial de cobros, correo de facturación, monto pagado ni el estado detallado de pago.

Las cuotas y el número de builds destacadas deben calcularse desde funciones de entitlements del servidor, por ejemplo `build_limit_for_tier(tier)` y `featured_build_limit_for_tier(tier)`. Esos resultados deben ser la fuente de las validaciones de base de datos y de la UI.

### Aportador (aporte único) — tabla separada

El aporte único no tiene estado, periodo ni renovación, así que no debería vivir en la misma tabla que la membresía recurrente — mezclar ambos obligaría a rellenar campos de suscripción (`status`, `current_period_end`, `billing_interval`...) que no aplican. Diseño conceptual, mucho más simple que el de membresía:

| Campo/dato | Propósito | Exposición |
| --- | --- | --- |
| `user_id` | Cuenta que hizo el aporte | Privada |
| `amount`, `currency` | Monto exacto dado, antes de comisión | Privada; nunca pública |
| `provider`, `provider_payment_id` | Referencia del pago, usada para idempotencia (un mismo evento de webhook no debe duplicar el registro) | Privada |
| `created_at` | Fecha del aporte (base de "Aportando desde...") | Privada; la fecha derivada sí puede mostrarse si la persona lo permite |

El estado público derivado es simplemente `is_supporter` (booleano: ¿hizo al menos un aporte confirmado?) y `supporter_since` (fecha del primer aporte, opcional y consentida). No existe un "nivel" de Aportador por monto: es binario, tuvo un aporte confirmado o no. Si más adelante se quisiera reconocer montos grandes de forma distinta, sería un reconocimiento nuevo y explícito, no una reutilización de los rangos de membresía.

### Regla de autoridad

- El navegador nunca decide que una cuenta es miembro ni su límite.
- La fuente de verdad es el backend después de verificar eventos del proveedor.
- Los webhooks deben verificar firma, procesar eventos de manera idempotente y tolerar reintentos.
- La clave `service_role` se mantiene exclusivamente en el servidor; jamás en variables `VITE_*` ni en el bundle del navegador.
- Las políticas RLS deben permitir al usuario consultar su propio estado de cuenta sin permitir que lo actualice.
- Un endpoint o vista pública debe exponer solo la insignia, la racha y los hitos que la persona haya elegido mostrar; nunca datos de facturación.

## 8. Renovación, cancelación y pagos fallidos

Toda esta sección aplica solo a la **escalera de membresía recurrente**. El aporte único de Aportador no tiene nada de esto: no hay renovación que falle, no hay periodo que vencer, no hay "volver a Free" porque nunca fue una suscripción — un aporte confirmado es permanente.

El comportamiento debe estar decidido antes de cobrar:

| Situación | Comportamiento recomendado |
| --- | --- |
| Suscripción activa | Mantiene la insignia y los beneficios vigentes |
| Mejora de nivel | Aplicar el nuevo nivel después de la confirmación del proveedor; definir si la diferencia se prorratea |
| Cambio a un rango inferior | Mantener el rango actual hasta el final del periodo pagado; aplicar la cuota inferior al renovar |
| Cambio de periodicidad | Aplicar en la siguiente renovación y mostrar el precio/ahorro nuevo antes de confirmar |
| Cancelación solicitada | Mantiene beneficios hasta el fin del periodo pagado; no renueva |
| Renovación fallida | Mantener beneficios solo hasta el último instante del periodo ya pagado; luego volver a Free sin periodo de gracia |
| Periodo vencido | Retirar beneficios recurrentes; nunca borrar builds |
| Cobro anual o trimestral | Mantener el acceso durante todo el periodo comprado, aunque se cancele la siguiente renovación |
| Hito de racha obtenido | Conservar el cosmético/hito desbloqueado aunque la membresía termine |
| Racha interrumpida | Cerrar la racha activa al acabar el periodo pagado; conservar total histórico e hitos |
| Aporte único | Registrar el reconocimiento definido; no crear una renovación automática |
| Reembolso o contracargo | Sincronizar el estado desde el proveedor y retirar el beneficio asociado de forma consistente |
| Error o retraso de webhook | Reintentar y permitir reconciliación; no confiar en lo que diga el cliente |

La fecha de expiración debe ser la referencia para mantener el acceso hasta el último día pagado. La interfaz debe evitar cambios de estado contradictorios cuando el proveedor reenvía el mismo evento.

## 9. Pagos, costos y transparencia

No se debe escoger un precio solo por intuición. Antes de abrir pagos, preparar una hoja sencilla con:

- Costos fijos: dominio, hosting, servicios externos y herramientas necesarias.
- Costos variables: almacenamiento, ancho de banda, base de datos, correos y procesamiento de pagos.
- Comisiones y moneda de cobro del proveedor.
- Ingreso neto estimado después de comisiones, reembolsos e impuestos aplicables.
- Margen de seguridad para meses de uso alto.

Los textos deben decir que las contribuciones ayudan a sostener el proyecto, sin afirmar que se destinan exclusivamente a un gasto específico si no se lleva esa contabilidad. Se puede publicar un resumen mensual o trimestral cuando haya datos suficientes.

### Comparación inicial de proveedores

**Premisa de investigación:** el proyecto se administra desde Colombia y quiere aceptar miembros de tantos países como sea posible. Si la persona o empresa que cobrará está legalmente establecida en otro país, hay que repetir la comparación para ese país.

Esta comparación documental se revisó el **18 de octubre de 2026**. La disponibilidad, los países bloqueados y las comisiones pueden cambiar; hay que confirmarlos durante el alta del comercio y antes de habilitar cobros.

Hay dos coberturas distintas que siempre se deben validar: (1) que el proveedor acepte como vendedor a la persona/empresa y pueda pagarle en su país; (2) que permita cobrar a los países donde están los miembros. “Global” no significa todos los países: sanciones, reglas bancarias y métodos disponibles dejan excepciones.

| Proveedor | Vendedor desde Colombia | Países de los miembros | Mensualidad y manejo fiscal | Evaluación inicial |
| --- | --- | --- | --- | --- |
| **Paddle** | Su ayuda dice que trabaja con negocios de software de todo el mundo salvo una lista de países restringidos; Colombia no aparece en esa lista. La aprobación y el método de payout igual requieren onboarding. | Publica ventas en más de 200 países y territorios; bloquea países restringidos. | Suscripciones mensuales, trimestrales y anuales, portal de cliente, cancelación y webhooks. Es Merchant of Record y gestiona impuestos indirectos de las ventas. Tarifa publicada: 5% + US$0.50 por transacción; pide contactar para importes menores a US$10. | **Primera opción a probar**, pendiente de aprobación y cotización para membresías de bajo precio. |
| **Lemon Squeezy** | Colombia aparece en la lista publicada de países con payout bancario; PayPal también puede estar disponible. Hay que confirmar durante el onboarding que acepten la cuenta concreta y el banco elegido. | Permite compras desde todos los países salvo su lista de países no admitidos. | Suscripciones mensuales, trimestrales (cada 3 meses) y anuales, portal de cliente; actúa como Merchant of Record para impuestos indirectos. Tarifa publicada: US$0.50 + 5%, con recargos de 1.5% para pagos internacionales y 0.5% para suscripciones. El payout bancario fuera de EE. UU. puede costar 1%; el de PayPal, 3% hasta US$30. Hay un mínimo de payout de US$50. | **Opción viable para probar desde Colombia**, pendiente de aprobación y cotización para membresías bajo US$10. |
| **PayPal Business directo** | La página de PayPal Colombia anuncia cobros internacionales y pagos recurrentes. | La página comercial anuncia más de 200 mercados y más de 100 monedas; métodos y límites dependen del país. | No es Merchant of Record: la app se encargaría de más obligaciones de impuestos, reembolsos y soporte de cobro. Hay funciones nuevas de pagos recurrentes tokenizados cuya elegibilidad publicada está limitada a vendedores/compradores de EE. UU.; confirmar por escrito el producto mensual disponible para Colombia antes de adoptarlo. | **Posible respaldo**, pero no elegirlo hasta confirmar la suscripción mensual y su API para la cuenta colombiana. |
| **Stripe directo** | Colombia no aparece en la lista actual de países donde Stripe Payments permite abrir una cuenta comercial directamente. | Una cuenta abierta en un país admitido puede vender a clientes globalmente, con restricciones por país y método. | Suscripciones maduras, pero el bloqueo para abrir la cuenta desde Colombia lo hace inviable como integración directa bajo esta premisa. | **No recomendado como cuenta directa colombiana**. Solo reconsiderarlo con una entidad real en país admitido y evaluación legal/fiscal propia. |

Fuentes oficiales consultadas el **18 de octubre de 2026**: [países admitidos por Stripe](https://stripe.com/global); [países de vendedores de Paddle](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle), [países de compradores y monedas localizadas](https://developer.paddle.com/concepts/sell/supported-countries-locales/), [intervalos trimestral/anual de Paddle](https://developer.paddle.com/build/reports/subscriptions/), [suscripciones y portal](https://developer.paddle.com/concepts/sell/customer-portal/) y [precios](https://www.paddle.com/pricing); [países/payouts de Lemon Squeezy](https://docs.lemonsqueezy.com/help/getting-started/supported-countries), [suscripciones](https://docs.lemonsqueezy.com/help/products/subscriptions), [intervalo cada 3 meses](https://docs.lemonsqueezy.com/api/variants/the-variant-object), [API para crear checkouts y configurar URL de regreso](https://docs.lemonsqueezy.com/api/checkouts/create-checkout), [metadata personalizada en el checkout](https://docs.lemonsqueezy.com/help/checkout/passing-custom-data), [webhooks de suscripción](https://docs.lemonsqueezy.com/guides/developer-guide/webhooks) y [comisiones y payout](https://docs.lemonsqueezy.com/help/getting-started/fees); [PayPal Colombia para comercios](https://www.paypal.com/co/business/accept-payments?locale.x=en_US), [países y funciones de PayPal](https://developer.paypal.com/payouts/supported-features/) y [elegibilidad del módulo de cobros recurrentes](https://developer.paypal.com/docs/checkout/standard/customize/recurring-payments-module/).

### Recomendación de validación

1. Solicitar onboarding de vendedor a **Paddle** y confirmar por escrito que admite la entidad/persona colombiana, los retiros disponibles y cualquier requisito fiscal.
2. Completar onboarding de **Lemon Squeezy** y confirmar aprobación, banco colombiano admitido, tarifa y conversión del payout, mínimo de US$50 y documentación exigida.
3. Comparar el neto recibido por cada nivel después de tarifa fija, porcentaje, recargos internacionales/suscripción, payout, conversión de moneda y tributos aplicables.
4. Probar cobros y renovaciones mensuales, trimestrales y anuales; también cancelación, cambio de periodicidad, pago fallido y webhooks.
5. Publicar el checkout solo para los países que el proveedor confirme como admitidos; ofrecer métodos locales varía por país y dispositivo.

Las tarifas fijas pesan especialmente en el nivel de US$1; Paddle y Lemon Squeezy invitan a solicitar cotización para productos de menos de US$10, y Lemon publica recargos de suscripción e internacionales. **No aprobar los precios piloto hasta calcular el neto real o recibir cotizaciones para los cobros mensuales, trimestrales y anuales.** Un Merchant of Record puede encargarse de recaudar/remitir impuestos indirectos de ventas, pero eso no determina por sí solo los impuestos sobre los ingresos del proyecto en Colombia. No se deben guardar datos de tarjeta en Supabase.

## 10. Plan de implementación por fases

### Fase 0 — Decisiones de producto

- Confirmar o ajustar los nombres de los cuatro rangos: Aprendiz, Artesano, Forjador y Maestro de la Forja.
- Validar los rangos de US$3/US$6/US$10/US$18 y los descuentos trimestral (5%) y anual (16.7% / 2 meses gratis), con encuesta, piloto y neto por proveedor; probar precios localizados.
- Ofrecer cobro mensual, trimestral y anual; cada periodicidad renueva automáticamente hasta que la persona cancele.
- Ofrecer Aportador (aporte único, desde US$1) como opción separada, sin activar ni extender una membresía. **Recomendación de secuencia:** Aportador no tiene estados de suscripción, renovación ni racha — puede construirse y lanzarse antes que la escalera recurrente, con mucho menos riesgo, y validar el flujo de pago/webhook en producción antes de construir la máquina de estados más compleja de la membresía.
- Hacer opt-in la publicación de insignia, racha y hitos.
- Validar las cuotas de 50 Free / 50 Aprendiz / 100 Artesano / 250 Forjador / 1.000 Maestro y los límites 1/1/2/3/5 de builds destacadas.
- Definir y diseñar los cosméticos de hitos de 3/6/12 meses consecutivos, contando el tiempo cubierto por trimestre/año mes a mes.
- Confirmar onboarding, país de cobro, payout y costos con Paddle; comparar con Lemon Squeezy antes de elegir.
- Revisar cancelaciones, reembolsos, renovación fallida y textos legales.

### Fase 1 — Base segura

- Añadir la tabla de aportes únicos (Aportador) y la de membresías con sus estados, sin cambiar `profiles.role`. Son dos tablas separadas (§7): la de Aportador no necesita estado, periodo ni intervalo.
- Definir entitlements por nivel en un lugar centralizado y aplicar el mismo resultado en la UI y Supabase.
- Crear la integración del proveedor en backend y la recepción verificada de webhooks. El webhook de Aportador solo procesa "pago confirmado" una vez; el de membresía además reconcilia renovaciones, cancelaciones y pagos fallidos.
- Proteger los campos de membresía y de aportes con RLS y restricciones de actualización.
- Resolver el límite de builds en la base de datos a partir del estado confirmado, si se aprueba ese beneficio.
- Implementar reconciliación/reintentos para eventos duplicados o retrasados.

### Fase 2 — Experiencia visible

- Crear la página de apoyo con la promesa de gratuidad.
- Añadir la Forja de perfil, la racha, los hitos y la insignia opcional en el perfil público.
- Añadir estado y enlace de gestión en la cuenta.
- Incluir mensajes claros para cancelar, vencer o superar el límite gratuito.
- Añadir enlaces de política de privacidad, términos y soporte.

### Fase 3 — Piloto y apertura

- Probar compras, renovaciones, cancelaciones, pagos fallidos, reembolsos y eventos duplicados en modo de prueba.
- Probar ascensos y descensos entre los cuatro rangos, incluyendo cambios al renovar los periodos mensuales, trimestrales y anuales.
- Verificar que nadie pueda elevar su membresía editando el perfil desde el navegador.
- Confirmar que un usuario gratuito conserva el mismo acceso al builder y al optimizador.
- Lanzar primero a un grupo pequeño, revisar incidencias y costos reales.
- Abrir a todos cuando cancelación, recuperación y soporte estén claros.

## 11. Criterios de aceptación del MVP

- La página explica que pagar es opcional y que las funciones principales siguen gratis.
- La página compara los cuatro rangos, precios, periodicidad y beneficios acumulados.
- La selección y explicación de membresías sucede dentro de Dofus Forge; el checkout abre en el proveedor y regresa a una página de confirmación de la app.
- Una redirección de regreso nunca concede beneficios sin la confirmación de un webhook verificado.
- El selector calcula y muestra correctamente los totales trimestral/anual, el equivalente mensual y el ahorro respecto a 12 o 3 pagos mensuales.
- Una suscripción trimestral o anual conserva beneficios hasta el fin de su periodo ya pagado tras pedir cancelación.
- Cada beneficio anunciado en el checkout ya está disponible para ese nivel; las funciones futuras no se venden por adelantado.
- Una persona puede elegir, cambiar o cancelar su nivel de forma comprensible.
- La insignia coincide con el nivel activo y puede ocultarse.
- La racha total y la racha del nivel actual reflejan meses de servicio ya cubiertos por periodos pagados confirmados y pueden ocultarse independientemente.
- Los hitos cosméticos obtenidos se conservan después de volver a Free; las cuotas y la insignia de nivel activo no.
- El público no puede consultar montos, referencias de pago ni correo de facturación.
- Un usuario no puede concederse una membresía ni un aporte de Aportador desde el cliente.
- Un reintento del webhook no duplica membresías, aportes únicos ni extiende beneficios incorrectamente.
- Un aporte único como Aportador se puede hacer desde cualquier monto igual o mayor a US$1, no crea ni extiende una membresía, y su insignia nunca vence.
- Las builds existentes no se borran por vencimiento o cancelación.
- Los roles `user`, `moderator` y `admin` conservan sus permisos actuales e independientes.
- Los usuarios gratuitos pueden seguir usando el builder y el optimizador.
- El límite de builds se aplica en Supabase, no solo en el frontend, si cambia por membresía.

## 12. Decisiones pendientes

| Decisión | Recomendación inicial | Estado |
| --- | --- | --- |
| Propósito | Apoyo voluntario para sostener Dofus Forge | Acordado por el producto |
| Acceso a herramientas principales | Gratis para todos | Principio de diseño |
| Rangos | Aprendiz, Artesano, Forjador y Maestro de la Forja; beneficios acumulables | Propuesta |
| Precios mensuales | US$3 Aprendiz / US$6 Artesano / US$10 Forjador / US$18 Maestro; piso movido de US$1 a US$3 porque la comisión fija hace inviable un cobro recurrente de US$1/mes; localizar y probar por región | Propuesta piloto; falta validar demanda y neto |
| Aportador | Aporte único desde US$1, sin tope, sin recurrencia; cubre el punto de entrada de US$1 que ya no está en la escalera mensual | Acordado por el producto |
| Periodicidad | Mensual, trimestral y anual, con renovación automática cancelable | Acordado |
| Descuento trimestral | 5% frente a tres pagos mensuales | Propuesta piloto |
| Descuento anual | Pagar 10 meses y recibir 12: 2 meses gratis / 16.7% de ahorro | Propuesta piloto |
| Fin de membresía | Al cancelar, conservar beneficios hasta el fin del periodo cubierto (mes/trimestre/año) y volver a Free | Acordado |
| Reconocimiento fundador | Insignia de lanzamiento con fechas y reglas explícitas | Propuesta |
| Insignia en perfil | Visible solo con consentimiento; nunca mostrar montos | Propuesta |
| Límite por rango | 50 Free / 50 Aprendiz / 100 Artesano / 250 Forjador / 1.000 Maestro | Hipótesis por medir |
| Builds destacadas | 1 Free/Aprendiz / 2 Artesano / 3 Forjador / 5 Maestro | Hipótesis por medir |
| Racha de apoyo | Meses de servicio cubiertos consecutivos y meses en el nivel actual; trimestre/año suman con el paso de cada mes | Propuesta; privacidad opt-in |
| Cosméticos por hitos | Recompensas permanentes a los 3, 6 y 12 meses consecutivos | Propuesta |
| Personalización de perfil | Editor visual progresivo; animaciones sutiles y accesibles en Maestro | Propuesta por fases |
| Analíticas de builds | Estadísticas privadas agregadas de visitas/guardados, sin identificar visitantes | Fase posterior; revisar privacidad/costo |
| Proveedor de pagos | Probar onboarding y cotización de Paddle; comparar con Lemon Squeezy | Pendiente de validación |
| Privacidad de insignia | La persona puede ocultarla sin cancelar | Propuesta |
| Roles de sistema | `user`/`moderator`/`admin` separados de la membresía | Principio de seguridad |

## 13. Resumen de la recomendación

Lanzar **dos mecanismos separados**: (1) **Aportador**, un aporte único desde US$1 sin tope, sin suscripción ni vencimiento, pensado como la forma de apoyar con fricción mínima y como punto de entrada de bajo costo; y (2) una escalera de **cuatro rangos de suscripción recurrente desde US$3/mes** (Aprendiz US$3, Artesano US$6, Forjador US$10, Maestro US$18), pensada para sostener el sitio con ingreso predecible — el piso se mueve de US$1 a US$3 porque un cobro recurrente de US$1/mes pierde más de la mitad de su valor en comisión fija cada mes, mientras que un aporte único de US$1 no tiene ese problema por no repetirse. Permitir cobro mensual, trimestral con 5% de descuento y anual por el precio de 10 meses (2 meses gratis; ahorro del 16.7%) en la escalera recurrente. Mantener gratis el builder y el optimizador. Hacer atractivos los rangos con una Forja de perfil, racha e hitos cosméticos, más capacidad de guardar y destacar builds y analíticas agregadas en una fase posterior. Los beneficios deben seguir bajo control del servidor, con publicación opt-in y sin ventajas de combate, ranking o moderación. Por su simplicidad (sin estados de suscripción, sin racha, sin renovación), Aportador puede construirse y lanzarse antes que la escalera recurrente completa.

