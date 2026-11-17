# Mi cuenta y perfil · estudio local

Revisión del 17 de noviembre de 2026. La referencia vigente es el prototipo local. No hay sincronización con Figma pendiente para este trabajo.

## Abrir

Con el servidor habitual del estudio abierto:

- `http://127.0.0.1:4404/surfaces.html?view=account`: edición privada, seguridad y sesión.
- `http://127.0.0.1:4404/surfaces.html?view=profile`: perfil propio o de otro jugador, builds, colecciones, seguimiento y listas de personas.

«Revisión local de cuenta» permite elegir respuesta del servicio, sesión de ejemplo, idioma y listas vacías. Las respuestas viven en memoria y no modifican cuentas reales. Las fichas de personas son ejemplos, no datos de usuarios.

## Composición

La cuenta se organiza en Perfil, Seguridad y Sesión. El nombre de usuario es la identidad principal, como en el producto; el nombre visible es secundario. El resumen muestra actividad y accesos a seguidores, seguidos y builds. El perfil público conserva biografía, fecha de incorporación, actividad pública, rango y membresía cuando existen. Las tarjetas reutilizan el personaje y equipo de `BuildSheet`.

En móvil el formulario ocupa el ancho disponible. La barra de guardado se fija al tener cambios; al estar limpio permanece en el flujo de lectura. La referencia lateral de escritorio muestra los datos ya guardados. El correo solo aparece en áreas privadas. El avatar permanece sin edición porque la funcionalidad actual de producción está desactivada; no se añade una subida que el producto todavía no tiene habilitada.

## Contratos conservados

| Acción | Comportamiento del estudio |
|---|---|
| Usuario | 3–30 caracteres, minúsculas, números, guion y guion bajo; usa `authRules`; normaliza al enviar |
| Nombre visible | Opcional, máximo 50 caracteres; vacío se representa como `null` |
| Biografía | Opcional, máximo 300 caracteres, contador y saltos de línea conservados |
| Guardar perfil | Cambia primero el usuario y después los demás datos, igual que el producto. Si la segunda operación falla, informa el resultado parcial y conserva el resto del formulario para reintentar |
| Nombre ocupado / conexión | Error visible, valores escritos conservados y reintento explícito |
| Cambios pendientes | Conservados entre pestañas. Navegación interna con confirmación para seguir editando o descartar; aviso nativo al recargar/cerrar con cambios |
| Contraseña | Mínimo actual de 6 caracteres; mostrar/ocultar, confirmación exacta antes de enviar y campos vaciados únicamente al completar el cambio |
| Cierre de sesión | Confirmación, estado ocupado y error recuperable; un fallo conserva la sesión de ejemplo |
| Seguidores / siguiendo | Carga, búsqueda, vacío, error, reintento y acceso al perfil del jugador, con cierre y retorno de foco |
| Seguir | Solo con sesión, nunca al propio perfil; actualización inmediata y restauración del contador/estado si falla; evita solicitudes duplicadas por jugador |
| Perfil público | No muestra el correo; distingue perfil propio/otro; contenido público, rango y membresía, paginación de ejemplos y perfil no encontrado |
| Volver al taller | Snapshot del equipo guardado en `sessionStorage` al abandonar el documento y recuperado al volver. No sustituye el guardado explícito en el dispositivo |

## Implementación y límites

`prototype/Account.tsx` contiene las composiciones, listas y confirmaciones. `prototype/account-model.ts` es un servicio de ejemplo aislado del store real de autenticación. Consume los tipos y restricciones del producto, pero no pretende ser su API: la sesión de ejemplo nunca se instala en `useAuthStore`.

La integración de producción debe reutilizar `updateUsername`, `updateProfile`, `updatePassword`, consultas públicas y acciones de seguimiento, incluyendo sus permisos. Debe conservar el manejo de guardado parcial sin perder datos al actualizar el store. Las listas, contadores, rangos y membresías del estudio son fixtures; no sustituyen comprobaciones de servidor.

Los nuevos textos tienen español, inglés, francés y portugués. Parte del shell y las tarjetas comunes conserva los textos del estudio anterior: esa migración general continúa pendiente. No hay cambio de correo, eliminación de cuenta ni controles de facturación añadidos a este bloque: no forman parte de la pantalla de cuenta actual auditada.

## Comprobaciones

`tools/check-account.mjs` genera las capturas de `captures/cuenta/` y el informe `checks/account.json`. Revisa cuenta, seguridad, sesión, confirmación de cierre, seguidores y perfiles propio/ajeno en cinco tamaños y ambos temas; además ejecuta los recorridos de guardado, errores, contraseña, navegación, seguimiento y acceso en cuatro idiomas.

Resultado: 79 comprobaciones sin fallos (78 revisiones de vista y un recorrido funcional con varias acciones). No se detectaron desbordamientos, errores de JavaScript ni infracciones automáticas WCAG A/AA en ese alcance. Se comprobó también cancelar el acceso sin iniciar sesión, recuperar el foco al cerrar listas, mostrar listas vacías y reintentar después de errores.

```sh
node docs/design-v0.4/tools/check-account.mjs
node node_modules/typescript/bin/tsc --project docs/design-v0.4/prototype/tsconfig.json
```

La comprobación usa Chromium; no equivale a una certificación de accesibilidad ni a pruebas con jugadores o con un servidor real. Quedan por revisar lector de pantalla, teclado virtual, zoom y escenarios reales de permisos y sesión caducada al integrar.

La compilación de producción y TypeScript del estudio pasan. Las 451 pruebas existentes del producto pasan. El recorrido taller → otras vistas → taller conserva el snapshot del equipo. El bundle del estudio mantiene el aviso previo de tamaño de chunk; no es el bundle de despliegue.
