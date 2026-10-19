# Rangos especiales personalizados

> Diseño implementado en la versión 0.3.96. La pantalla administrativa está en `/admin/ranks`; aplica una vez `supabase/migrations/20261018_custom_ranks.sql` en Supabase.

## 1. Objetivo

Permitir que una persona administradora cree rangos especiales para personas concretas del equipo o colaboradores. Cada rango puede tener nombre, insignia, color y beneficios seleccionados por quien administra el sitio. La asignación puede ser permanente o tener una fecha de vencimiento.

Ejemplos iniciales:

- **Owner**: reconocimiento público de la persona propietaria del proyecto.
- **Diseñadora**: reconocimiento público de la persona que diseña la identidad y la experiencia visual.

Estos rangos se crean y se asignan manualmente. No dependen de una compra, una suscripción ni un proveedor de pagos.

## 2. Conceptos que deben mantenerse separados

La aplicación tiene tres conceptos con propósitos distintos:

| Concepto | Propósito | Ejemplos |
| --- | --- | --- |
| Permiso de cuenta | Decide qué acciones administrativas puede realizar una cuenta | `user`, `moderator`, `admin` |
| Membresía | Representa el plan de apoyo que la persona paga y su estado de facturación | `free`, `apprentice`, `artisan`, `forger`, `master` |
| Rango especial | Reconoce una función o relación particular con el proyecto y puede otorgar beneficios configurados | `Owner`, `Diseñadora`, `Colaborador` |

El rango **Owner** que aparece en el perfil es una insignia. El acceso administrativo se controla con los permisos de cuenta existentes. Una membresía pagada y un rango especial pueden coexistir.

## 3. Experiencia administrativa

### Pantalla administrativa implementada

La sección privada **`/admin/ranks`** está disponible solo para cuentas con permiso `admin`.

La pantalla permite:

1. Crear, editar, activar y archivar definiciones de rangos.
2. Buscar una cuenta por nombre de usuario y asignarle un rango.
3. Elegir cuándo empieza y, opcionalmente, cuándo vence la asignación.
4. Añadir una nota interna para recordar por qué se otorgó el rango.
5. Revocar una asignación sin borrar el historial.
6. Ver qué rangos están activos y a qué cuentas se asignaron.

La asignación puede hacerse desde el formulario de edición del rango o desde la ficha de una persona. En ambos casos, el servidor debe validar la operación.

### Campos de una definición

- Identificador interno estable (`slug`), por ejemplo `owner` o `designer`.
- Nombre visible y, si se desea, traducciones para los idiomas de la app.
- Descripción breve del rango.
- Icono elegido de una lista segura de iconos disponibles.
- Color de insignia validado.
- Orden visual y estado activo/archivado.
- Indicador de si se muestra públicamente.
- Beneficios seleccionados del catálogo de beneficios implementados.

No se debe aceptar HTML, SVG arbitrario, scripts ni URLs de iconos ingresadas libremente. Para la primera versión, el panel puede ofrecer solo iconos y colores aprobados por la app.

## 4. Beneficios

El administrador puede armar rangos con beneficios del catálogo que la aplicación realmente sabe aplicar. Ejemplos posibles:

| Clave de beneficio | Ejemplo de valor | Efecto |
| --- | --- | --- |
| `build_limit` | `200` | Aumenta el máximo de builds guardadas (de 1 a 100.000) |
| `profile_badge_style` | `founder` | Cambia el acabado de la insignia (`standard`, `founder` o `creator`) |

Los beneficios visuales se reflejan en la interfaz. Los beneficios que cambian límites o acceso a funciones también deben aplicarse en las validaciones del servidor y de la base de datos; ocultar o habilitar un botón en el frontend no es suficiente.

Un beneficio completamente nuevo requiere trabajo de desarrollo para agregar su clave, validación y comportamiento. El panel permite combinar beneficios ya implementados; no convierte una descripción libre en una función ejecutable.

### Reglas para combinar beneficios

- La membresía y el rango son independientes y pueden estar activos al mismo tiempo. La insignia de membresía y la del rango pueden mostrarse juntas.
- Para el cupo de builds, usar `max(cupo_de_membresía, cupo_del_rango_activo)`. Los valores no se suman; si el rango no define `build_limit`, se usa solo la membresía.
- El cupo representa el total de builds guardadas por la cuenta, sin importar si son públicas, privadas o no listadas.
- Para permisos de funciones, activar el acceso si lo concede la membresía o el rango especial.
- Para elementos visuales, usar el estilo especial asignado cuando corresponda.

Ejemplos con los cupos actuales de membresía:

| Membresía | Cupo del rango | Cupo efectivo |
| --- | ---: | ---: |
| Free (50) | Sin límite configurado | 50 |
| Free (50) | 200 | 200 |
| Artesano (100) | 200 | 200 |
| Maestro (1.000) | 200 | 1.000 |

Al vencer, revocar o archivar el rango, su beneficio deja de aplicar y el cupo se recalcula con la membresía vigente. Las builds ya guardadas no se eliminan; si la cuenta queda por encima del nuevo cupo, no podrá guardar builds nuevas hasta volver a estar por debajo del límite. Actualmente, cada cuenta puede tener un solo rango especial abierto a la vez.

## 5. Modelo de datos sugerido

El esquema exacto se definirá al implementar la funcionalidad. Como base, usar tablas separadas de `profiles` y `memberships`:

### `custom_rank_definitions`

Contiene las definiciones creadas por administradores: `id`, `slug`, nombre, descripción, icono, color, visibilidad pública, estado, orden y fechas de creación/actualización.

### `custom_rank_benefits`

Relaciona una definición con beneficios permitidos, por ejemplo `rank_id`, `benefit_key` y `benefit_value`. La aplicación valida cada clave y su tipo de valor contra el catálogo implementado.

### `custom_rank_assignments`

Registra a quién se asignó un rango: `user_id`, `rank_id`, `assigned_by`, fecha de inicio, fecha de vencimiento opcional, fecha de revocación y nota interna. La fila se conserva como historial cuando la asignación vence o se revoca.

La primera versión puede permitir un rango especial activo por persona. La membresía pagada se mantiene independiente. Si más adelante una persona necesita varios rangos especiales simultáneos, la tabla de asignaciones permite ampliar la regla sin convertirlos en permisos de cuenta.

## 6. Perfiles públicos

El perfil público debe recibir solo la información necesaria para mostrar el rango activo:

- Nombre del rango.
- Insignia, icono y color.
- Descripción pública, si existe.
- Beneficios públicos que tenga sentido anunciar.

No debe exponer quién asignó el rango, la nota interna, datos de facturación ni fechas o decisiones administrativas privadas. La persona administradora decide si cada rango es visible; los detalles públicos de beneficios deben ser claros y no prometer capacidades que todavía no existan.

La vista `/u/:username` carga el perfil y consulta `get_public_custom_rank`, una función RPC pública que devuelve únicamente el rango activo y publicable, siguiendo el patrón de `get_public_membership_tier`.

## 7. Seguridad y autoridad

- Solo una cuenta con permiso `admin` puede crear rangos, editar beneficios o asignarlos.
- El navegador nunca puede asignar o cambiar un rango por sí solo.
- Las escrituras se realizan mediante una ruta o función de servidor que verifica la sesión y el permiso administrativo, o mediante una operación protegida equivalente.
- Las políticas RLS deben bloquear escrituras de usuarios normales y limitar la lectura pública a los campos publicables.
- Los beneficios se resuelven en el servidor/base de datos y no se confía en valores enviados por el cliente.
- Conservar un registro de quién otorgó, cambió o revocó cada asignación.
- El rango **Owner** no debe elevar automáticamente `profiles.role`; los permisos administrativos se conceden como una operación separada.

### Primer administrador del proyecto

Actualmente no existe una pantalla para conceder el permiso `admin`. La primera cuenta administradora se configura manualmente desde **Supabase → SQL Editor**, después de que esa cuenta ya tenga un perfil:

```sql
update public.profiles
set role = 'admin'
where username = 'wembie';
```

Cambiar `wembie` por el nombre de usuario exacto de la cuenta que debe administrar el proyecto y comprobar el resultado antes de continuar:

```sql
select username, role
from public.profiles
where username = 'wembie';
```

El trigger `profile_system_fields_guard` evita que una actualización normal desde el navegador cambie `profiles.role`. El SQL Editor sirve para este alta inicial. Las cuentas `admin` pueden administrar rangos especiales desde `/admin/ranks`, pero eso no debe permitir que se asignen `admin` a sí mismas ni a otras cuentas desde el formulario de rangos.

## 8. Estado actual del proyecto

La pantalla administrativa, las insignias públicas y los límites de builds están implementados. Ejecuta la migración `supabase/migrations/20261018_custom_ranks.sql` en el SQL Editor de Supabase antes de usar el panel.

- `profiles.role` sigue controlando permisos de cuenta (`user`, `moderator`, `admin`) y se carga en el estado de la sesión.
- La biblioteca permite crear, editar, ordenar, activar y archivar rangos; iconos y colores vienen de catálogos seguros de la app.
- Los beneficios configurables son `profile_badge_style` (`standard`, `founder`, `creator`) y `build_limit` (de 1 a 100.000 builds guardadas).
- La cuota se valida en el trigger de base de datos al crear cada build; para combinarla con la membresía se usa el valor más alto.
- La asignación valida admin en el servidor, admite fecha de inicio y vencimiento opcional, conserva nota privada e historial de revocación.
- El perfil público recibe el rango mediante `get_public_custom_rank`, que no devuelve notas internas ni datos de administración.
- Membresías y rangos especiales siguen separados; un rango puede aumentar el cupo de builds, pero no cambia el estado de membresía ni los permisos de cuenta.

Referencias actuales: `supabase/migrations/20261018_custom_ranks.sql`, `supabase/schema.sql`, `src/features/ranks/` y `src/pages/AdminRanksPage.tsx`.

## 9. Próximos pasos opcionales

1. Ejecutar la migración de rangos en el proyecto Supabase.
2. Crear desde el panel los rangos iniciales de Owner, Diseñadora y Colaborador.
3. Agregar beneficios nuevos solo cuando la app también implemente su validación y efecto real.

## 10. Criterios de aceptación

- Un administrador puede crear un rango con nombre, icono, color y beneficios del catálogo.
- Un administrador puede asignar el rango a una cuenta y opcionalmente definir su vencimiento.
- La persona no puede asignarse rangos a sí misma ni modificar sus beneficios.
- El rango activo aparece en el perfil público solo si está marcado como visible.
- La expiración o revocación elimina los beneficios efectivos y conserva el historial.
- Una membresía puede coexistir con un rango especial sin alterar su estado, pagos o racha.
- El rango `Owner` no concede permisos administrativos automáticamente.
- Las cuotas reales se validan también en el servidor/base de datos.

