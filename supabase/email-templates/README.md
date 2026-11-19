# Correos de acceso · Dofus Forge

Las seis plantillas usan el tema oscuro de 0.4.0, el mismo del sitio: fondo #111615, tarjeta #191e1c, texto #e9e8df, acento #e4b28b, titulares serif y tablas con estilos inline (`color-scheme: dark`). La cabecera lleva el logo (`https://dofusforge.com/brand/mark-256.png`, 28 px, URL fija para no depender del Site URL de Supabase) junto al nombre en texto, que sigue legible si el cliente bloquea imágenes. No dependen de fuentes externas, SVG ni JavaScript.

**Pegar en Supabase (0.4.0 ya está en producción):** después de pegar, enviar un correo de prueba y comprobar que el logo carga; si el cliente bloquea imágenes, aceptar "mostrar imágenes".

| Archivo | Plantilla en Supabase | Asunto sugerido |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Confirm your Dofus Forge account |
| `reset-password.html` | Reset Password | Reset your Dofus Forge password |
| `magic-link.html` | Magic Link | Your Dofus Forge sign-in link |
| `invite-user.html` | Invite User | You are invited to Dofus Forge |
| `change-email.html` | Change Email Address | Confirm your Dofus Forge email change |
| `reauthentication.html` | Reauthentication | Your Dofus Forge verification code |

Regenerar desde la raíz: `node supabase/email-templates/build.mjs`. `build.mjs` contiene el layout y los textos; los HTML resultantes están listos para pegar en el editor de código de Supabase → Authentication → Email Templates. El cambio en Git no actualiza automáticamente el proyecto alojado.

Se conservan `{{ .ConfirmationURL }}` para las cinco acciones con enlace, `{{ .Token }}` exclusivamente para reautenticación y `{{ .SiteURL }}` para volver al taller. No se construyen enlaces de verificación propios ni se sustituyen por el enlace de portada. El cambio de correo usa una redacción neutra porque la configuración de cambio seguro puede enviar confirmaciones a ambas direcciones. No se fija un plazo de expiración que pueda contradecir la configuración del proyecto.

Los mensajes permanecen en inglés, como las plantillas anteriores. No se añadió un selector de idioma que el envío actual no consume. Los formularios sí tienen traducciones en los cuatro idiomas. La localización del envío requiere una estrategia de metadatos y/o un Send Email Hook con pruebas de entrega.

La comprobación local cubre variables, enlaces de respaldo, reflow a 360 px, contraste y HTML renderizado con datos ficticios. Falta comprobar entrega y visualización en Gmail, Outlook y Apple Mail reales, incluido modo oscuro. No se enviaron correos ni se modificó el panel de Supabase.

Contrato de variables: [Email Templates — Supabase](https://supabase.com/docs/guides/auth/auth-email-templates).
