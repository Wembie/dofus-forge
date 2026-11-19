# Acceso y correos · revisión del 17 de noviembre de 2026

El login y el registro tienen composición propia en el estudio. La interfaz de producción conserva su presentación actual; `useAuthFlow` y `authRules` preparan una lógica compartida para integrar el diseño después. Los HTML de `supabase/email-templates` están actualizados en el repositorio; todavía deben instalarse en el panel de Supabase.

## Revisar

Con el servidor habitual del estudio abierto, ir a `http://127.0.0.1:4404/surfaces.html` y elegir el diálogo **Iniciar sesión**, **Crear una cuenta**, **Recuperar acceso**, **Nueva contraseña** o **Tus preferencias legales**. También se puede abrir **Iniciar sesión** desde «Todas las acciones» del taller, conservando el equipo abierto.

Las pestañas de acceso conservan el correo y limpian la contraseña. El formulario no navega al iniciar sesión: vuelve al contexto que lo abrió. La columna de identidad muestra la clase y el nivel actuales. En móvil se reduce a una cabecera; los campos tienen 16 px y controles principales de 48 px.

«Controles de revisión» permite elegir respuesta del servicio, estado de verificación e idioma. Son respuestas locales: no se crean cuentas, no se llama al servicio de autenticación y no se envían correos. El token de estudio nunca llega a Supabase. El captcha real permanece en la interfaz de producción.

## Paridad

| Parte | Contrato |
|---|---|
| Login | Correo, contraseña de 6 o más caracteres, mostrar/ocultar, autocompletado, challenge válido, error y reintento |
| Registro | Usuario público de 3–30 caracteres; minúsculas, números, guion y guion bajo; normalización del nombre al enviar; dos consentimientos independientes |
| Confirmación de cuenta | Explica que hay que confirmar el correo antes de entrar; permite corregir la dirección; no inicia una sesión ficticia |
| Recuperar acceso | Mensaje neutro que no revela si existe una cuenta; enlace nuevo enviado por el flujo actual al integrar |
| Nueva contraseña | Dos campos, comparación antes de enviar, error recuperable y confirmación; el estudio permite volver a pedir un enlace |
| Consentimiento | Documentos abiertos en otra pestaña sin perder la build; ambos consentimientos requeridos; la aplicación del bloqueo real queda a `ConsentGate` al migrar |
| Solicitudes | Evita envío duplicado, descarta respuestas de una tarea anterior y renueva el challenge tras un error |
| Idiomas | Textos del acceso en español, inglés, francés y portugués |

Login, registro y recuperación usan el mismo hook que `AuthModal`. Nueva contraseña y consentimiento son demostraciones locales de presentación: faltan conectar `PASSWORD_RECOVERY`, `updatePassword`, `pendingLegalDocs`, `acceptLegal` y cierre de sesión al migrar. El estudio no simula permisos persistentes ni sustituye el store de cuenta.

## Evidencia

- `checks/auth.json`: 55 comprobaciones: 50 vistas (cinco diálogos × cinco tamaños × dos temas), cuatro idiomas y un recorrido funcional. Sin infracciones automáticas WCAG A/AA ni desbordamientos en esas comprobaciones. El foco vuelve al control que abrió el diálogo.
- `captures/acceso/`: capturas de formularios, errores y confirmaciones. [Login escritorio](captures/acceso/signin-desktop-tinta.png), [registro móvil](captures/acceso/signup-mobile-tinta.png).
- `checks/emails.json`: seis plantillas a 600 y 360 px, con variables, botón y enlace de respaldo cuando corresponde; sin infracciones automáticas ni desbordamientos.
- `captures/correos/`: [confirmación](captures/correos/confirm-signup-600.png), [código de verificación](captures/correos/reauthentication-360.png).
- Pruebas del proyecto: 451 aprobadas, incluidas seis pruebas nuevas del flujo compartido; TypeScript y build de producción aprobados. La presentación de producción sigue siendo la anterior.

Ejecutar con el servidor del estudio abierto:

```sh
node docs/design-v0.4/tools/check-auth.mjs
node docs/design-v0.4/tools/check-email-templates.mjs
```

## Antes de integrar

1. Revisar con jugadores el acceso desde publicar/guardar, errores y regreso al trabajo. Evaluar lector de pantalla, teclado virtual y zoom en dispositivos reales.
2. Conectar los eventos reales de confirmación/recuperación y el captcha, incluidos expiración y fallo de carga; conservar el borrador al volver desde un correo. No tratar la demostración local de éxito como una sesión.
3. Mantener la versión de cada documento y registrar la aceptación con el servicio actual. Los documentos legales no se modificaron.
4. Instalar y probar los correos en un entorno de prueba. El cambio en Git no modifica la configuración alojada. Revisar Gmail, Outlook y Apple Mail, imágenes bloqueadas y modo oscuro.
5. Continuar la revisión de estos formularios en el prototipo local. Figma queda archivado y su sincronización deja de ser un pendiente.

Contrato de variables de correo contrastado con la [documentación de Supabase](https://supabase.com/docs/guides/auth/auth-email-templates). La reautenticación usa `{{ .Token }}`; las otras cinco acciones conservan `{{ .ConfirmationURL }}`. Los correos permanecen en inglés como antes; la localización del envío requiere trabajo adicional.
