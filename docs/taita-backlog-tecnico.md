# Taita Soluciones — Backlog técnico (retomar proyecto)

Contexto para Claude Code: proyecto Next.js + Supabase (pnpm), deployado en Vercel (`taita-nu.vercel.app`).
Roles: cliente, técnico, admin. El admin ya tiene un panel de detalle de solicitud con dropdown de estado
manual (Aceptada / En curso / Completada) y un desglose financiero (precio base, tasa plataforma 10.5%,
distribución técnico/plataforma). El cliente solo ve una card resumida en "Mis solicitudes", sin vista de detalle.

Encarar en este orden. No avanzar al bloque de Mercado Pago hasta terminar el resto.

---

## PASO 1 — Fix: redirección de perfil de técnico en pestaña nueva

**Problema:** al hacer click en un técnico (ej. desde `/tecnicos`), el perfil (`/tecnicos/[id]`) se abre en
pestaña nueva en vez de navegar en la misma pestaña.

**Tareas:**
- Buscar el/los componentes donde se linkea a `/tecnicos/[id]` (probablemente un `<a target="_blank">`,
  `window.open()`, o un `Link` de Next mal usado dentro de un botón/card clickeable).
- Reemplazar por navegación normal en la misma pestaña (`next/link` sin `target="_blank"`, o `router.push`).
- Verificar que no rompa ningún caso donde sí se quiera pestaña nueva (si existiera alguno intencional, dejarlo).

**Criterio de aceptación:** click en un técnico navega en la misma pestaña, con botón "Volver a técnicos"
funcionando como hasta ahora.

---

## PASO 2 — Capa de notificaciones (email + WhatsApp)

**2.1 Email al crear una solicitud nueva**
- Trigger: creación de una nueva solicitud de servicio.
- Destinatarios: admin y cliente.
- Contenido mínimo: tipo de servicio, técnico (si ya asignado o pendiente), fecha/hora solicitada, y texto
  tipo "Revisá tu perfil para ver el detalle".
- Definir proveedor de envío (Resend, Nodemailer + SMTP, o el que ya esté configurado en el proyecto —
  revisar si hay alguna integración de mail existente antes de sumar una nueva).

**2.2 Extender a cambios de estado**
- Reusar el mismo mecanismo de envío para notificar cuando cambia el estado de una solicitud
  (Aceptada, En curso, Completada, Cancelada), tanto a cliente como a técnico según corresponda.
- Idealmente centralizar esto en una función `notificarCambioEstado(solicitud, estadoNuevo)` que dispare
  email (y más adelante WhatsApp) para no duplicar lógica.

**2.3 WhatsApp**
- Sumar el mismo set de notificaciones (nueva solicitud + cambios de estado) vía WhatsApp Business API
  o un proveedor tipo Twilio/WhatsApp Cloud API.
- Se puede dejar como "fase 2" de este mismo paso si el email ya cubre lo urgente.

**2.4 Cambiar mail de contacto**
- En el formulario de contacto, actualizar el mail destino a `taitasoluciones@gmail.com`.

**Criterio de aceptación:** crear una solicitud dispara mail a cliente y admin; cambiar estado desde el
panel admin dispara mail a las partes correspondientes; form de contacto envía a la casilla correcta.

---

## PASO 3 — Gestión de fechas, horarios y estados automáticos

Este es el bloque más grande. Dividir en sub-tareas:

**3.1 Validación de solapamiento de horarios**
- Al solicitar un servicio, si la fecha/hora elegida coincide con otra solicitud ya asignada al mismo
  técnico, avisar al cliente en el momento (antes de confirmar) y deshabilitar ese horario en el selector.
- Proponer automáticamente el próximo horario disponible de ese técnico como alternativa.
- Si el cliente no puede en esa alternativa, debe poder elegir libremente otra fecha/hora distinta.

**3.2 Reasignación de fechas ante conflicto**
- Mismo mecanismo aplicado también cuando el conflicto surge después (ej. admin reasigna técnico y ese
  técnico ya tiene otro servicio en ese horario).

**3.3 Cambio automático de estado por fecha/hora**
- Job o chequeo (cron, Supabase scheduled function, o similar) que:
  - Al llegar la fecha/hora de la solicitud → cambia estado a **EN CURSO** automáticamente.
  - Si pasó la hora estimada de finalización (fecha/hora + horas estimadas) → cambia a **COMPLETADA**.
- Definir cómo convive esto con el cambio manual de estado que ya existe en el panel admin (el manual
  debería poder seguir sobrescribiendo si hace falta).

**3.4 Cancelación**
- Botón simple de cancelar, disponible según lo que definan los Términos y Condiciones.
- Al cancelar, mostrar una descripción/aviso desplegable (no un `confirm()` del navegador — mismo criterio
  que ya se usó para el error de categorías, inline y no pop-up nativo).

**Criterio de aceptación:** no se pueden crear dos solicitudes al mismo técnico en el mismo horario sin
aviso; los estados EN CURSO / COMPLETADA se actualizan solos según fecha/hora; cancelar muestra confirmación
inline con el texto de T&C.

---

## PASO 4 — Timeline / más info para el cliente

**Contexto:** el cliente hoy solo ve la card resumida (ver imagen "Mis solicitudes"). No tiene una vista de
detalle equivalente a la del admin.

**Tareas:**
- Crear (o habilitar) una vista de detalle de solicitud para el cliente, similar a la del admin pero de
  solo lectura donde corresponda (sin dropdown de cambio de estado manual).
- Mostrar como timeline los estados por los que pasó la solicitud (Pendiente → Aceptada → En curso →
  Completada), idealmente con fecha/hora de cada cambio.
- Reusar los datos ya generados en el Paso 3 (los cambios de estado, automáticos o manuales, deberían
  quedar registrados con timestamp para poder pintarlos en el timeline).

**Criterio de aceptación:** el cliente puede entrar a una solicitud desde "Mis solicitudes" y ver un
timeline con el historial de estados, no solo el estado actual.

---

## PASO 5 — Conformidad del cliente y cierre del servicio

**Tareas:**
- En la vista de detalle del cliente, mostrar el desglose completo (precio base, gastos extra con
  descripción, tasa, total) antes de pedir conformidad — mismo desglose que ya existe en el panel admin,
  pero visible para el cliente.
- Botón "Dar conformidad" / OK, habilitado solo cuando el servicio está en estado COMPLETADA.
- Al confirmar:
  - Notificar a admin (y opcionalmente técnico) vía el mecanismo del Paso 2.
  - Mostrar en la UI del cliente el link/monto de pago correspondiente (el link real de MP se genera en
    el Paso 6; por ahora puede quedar mockeado o pendiente).
- Panel del técnico: una vez que el cliente dio conformidad, mostrar aviso de que el pago se reflejará
  próximamente en la cuenta declarada.
- Registrar el pago (tabla/estado de pago) aunque el cobro real todavía no esté integrado.

**Criterio de aceptación:** el cliente solo puede dar el OK final cuando el servicio está completado y ve
el detalle de gastos extra antes de confirmar; admin y técnico reciben notificación al confirmarse.

---

## PASO 6 — Integración de Mercado Pago (dejar para el final)

**Tareas:**
- Generar link de pago (MP Checkout Pro o Preferencias) una vez que el cliente dio conformidad y el
  admin aprobó.
- Mostrar el link y el total correspondiente en la UI del cliente.
- Webhook de confirmación de pago de MP para actualizar el registro de pago del Paso 5.

**Criterio de aceptación:** flujo completo end-to-end: conformidad del cliente → aprobación admin →
link de pago generado → pago confirmado vía webhook → reflejado en panel técnico y admin.

---

## Notas generales para Claude Code
- Antes de tocar cada bloque, revisar si ya existe lógica parcial (ej. tabla de solicitudes, tabla de
  técnicos, funciones de notificación) para no duplicar.
- Mantener el patrón de avisos inline (no `alert()`/`confirm()` nativos) que ya se usó para el error de
  categorías — aplica también a cancelación (Paso 3.4) y conformidad (Paso 5).
- Todo cambio de estado (manual o automático) debería, en lo posible, loguearse con timestamp para
  alimentar el timeline del Paso 4.
