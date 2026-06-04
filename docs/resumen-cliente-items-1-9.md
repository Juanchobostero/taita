# Taita Soluciones — Resumen de funcionalidades implementadas
**Entrega:** Junio 2026 | **Desarrollado por:** JOTADEV

---

## Resumen general

Se completaron los 9 ítems del alcance acordado. La plataforma cuenta con registro verificado de clientes y técnicos, flujo de solicitudes de servicio, panel de administración completo y páginas legales.

---

## Ítem 1 — Botones "Contactanos" y "Reclamos" en la landing

El pie de la página principal ahora incluye accesos directos a las páginas de contacto y reclamos, junto con los botones de solicitud de servicio y registro de técnico.

---

## Ítem 2 — Aceptación de Términos y Política de privacidad en registro de cliente

Al registrarse como cliente, el usuario debe marcar obligatoriamente dos checkboxes:
- Acepto los **Términos y condiciones**
- He leído la **Política de privacidad**

Ambos documentos están disponibles como páginas del sitio (`/terminos` y `/privacidad`) y se abren en una nueva pestaña.

---

## Ítem 3 — CVU/CBU obligatorio en registro de técnico

El campo de CVU o CBU (22 dígitos) es ahora **obligatorio** en el formulario de registro de técnico. Es necesario para poder procesar pagos por los servicios realizados.

---

## Ítem 4 — Nick/Alias y control de nombre visible en perfil del técnico

El técnico puede configurar:
- **NickTaita** (opcional): nombre de empresa o alias que aparecerá en el perfil público. Ej: "JuanRepara", "El Frío S.A."
- **Toggle "Mostrar nombre completo"**: si no tiene nick, puede elegir si su nombre real aparece visible para los clientes.

---

## Ítem 5 — Mensaje informativo al pie del formulario de registro técnico

Al final del formulario de registro de técnico, se muestra un mensaje que informa que la plataforma validará su identidad y solicitará documentación de respaldo (DNI, matrícula, etc.) para garantizar la seguridad de los clientes.

---

## Ítem 6 — Página de Contacto y Reclamos

Se crearon dos páginas accesibles desde el footer de la landing:

- **`/contacto`**: formulario con nombre, email, teléfono y mensaje. Muestra confirmación al enviarse.
- **`/reclamos`**: formulario específico para reclamos con los mismos campos. Muestra confirmación al enviarse.

Ambos formularios muestran el email de contacto de la plataforma como referencia. La integración de envío real de emails queda para una próxima etapa.

---

## Ítem 7 — Subcategorías por especialidad en registro de técnico

Al seleccionar una especialidad en el formulario de registro, se expande una sección donde el técnico puede describir subcategorías de su trabajo. Por ejemplo:

> ✓ **REFRIGERACIÓN**
> 1. Reparación
> 2. Instalación
> 3. Mantenimiento

Se pueden agregar hasta 5 subcategorías por especialidad y el técnico puede seleccionar múltiples especialidades.

---

## Ítem 8 — Verificación de email al registrarse

Tanto clientes como técnicos deben verificar su correo electrónico antes de operar en la plataforma:

1. El usuario completa el formulario de registro.
2. Es redirigido a la pantalla **"¡Casi listo! Revisá tu correo"** que muestra la dirección de email ingresada.
3. Supabase envía automáticamente un correo con un enlace de verificación (válido 24 horas).
4. Si no llega el correo, el usuario puede reenviarlo desde la misma pantalla.
5. Al hacer click en el enlace, la cuenta queda verificada y el usuario puede ingresar.

> **Nota para técnicos:** la verificación de email es independiente de la aprobación del administrador. El técnico debe verificar su email Y esperar la aprobación del admin para aparecer como disponible en la plataforma.

---

## Ítem 9 — Técnicos disponibles al solicitar un servicio

Al ingresar al formulario de solicitud de servicio y seleccionar una categoría, el cliente ve una sección con los **técnicos disponibles para esa categoría**, ordenados por calificación y cantidad de servicios realizados.

**Comportamiento:**
- Se muestran hasta 4 técnicos como tarjetas con foto/avatar, nombre, calificación y zona.
- Si hay más de 4, aparece un botón "Ver más técnicos".
- Cada tarjeta tiene un link "Ver perfil" para ver el detalle del técnico.
- Esta sección es **informativa**: el cliente puede ver quiénes trabajan en la plataforma, pero el técnico asignado es confirmado por el equipo de administración.

---

## Funcionalidades adicionales implementadas en etapas previas

| Funcionalidad | Descripción |
|---|---|
| Imágenes por categoría | Cada categoría puede tener una imagen PNG/WebP subida desde el panel admin |
| Panel admin sin recarga | La gestión de categorías (editar, activar/desactivar, eliminar, crear) se hace sin recargar la página |
| Múltiples categorías por técnico | El técnico puede cubrir más de una categoría de servicio |
| Flujo admin asigna técnico | El cliente solicita sin elegir técnico; el admin asigna desde el panel |
| Validación de estado en admin | No se puede avanzar el estado de una solicitud (Aceptada, En curso, Completada) sin antes asignar un técnico |
| Técnicos filtrados por categoría | Al asignar técnico desde el detalle de solicitud, el dropdown solo muestra técnicos con esa especialidad |

---

## Estado del sistema

| Módulo | Estado |
|---|---|
| Registro de clientes con verificación de email | ✅ Operativo |
| Registro de técnicos con verificación de email | ✅ Operativo |
| Solicitud de servicio sin técnico pre-asignado | ✅ Operativo |
| Panel admin — gestión de solicitudes | ✅ Operativo |
| Panel admin — gestión de categorías e imágenes | ✅ Operativo |
| Panel admin — gestión de técnicos | ✅ Operativo |
| Dashboard del cliente | ✅ Operativo |
| Dashboard del técnico | ✅ Operativo |
| Páginas legales (Términos, Privacidad) | ✅ Publicadas |
| Formularios de Contacto y Reclamos | ✅ UI lista — envío de email pendiente de configuración |
| Notificaciones por email/WhatsApp | ⏳ Próxima etapa |

---

*Taita Soluciones — Desarrollado por JOTADEV*
