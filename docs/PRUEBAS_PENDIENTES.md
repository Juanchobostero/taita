# Pruebas pendientes — antes de avisarle a Agustín

> Checklist de QA propia (Jota) para retomar donde quedó. Una vez que todo esto esté ✅, recién
> ahí se le avisa a Agustín para que pruebe. El detalle técnico completo de cada tanda está en
> `docs/ESTADO_PROYECTO.md` — esto es solo la lista de qué falta clickear/verificar.

**Antes de arrancar:** `pnpm install` (el proyecto es pnpm-only, no usar `npm`) y confirmar que
el `.env` tiene `SUPABASE_SERVICE_ROLE_KEY` cargada (sin eso, todas las páginas tiran 500).

---

## ✅ Ya confirmado (no hace falta repetir)

- **Tanda 1** — Link de técnico en misma pestaña + mail de contacto.
- **Tanda 2** — Notificaciones por email (en modo log, sin `RESEND_API_KEY` real todavía).
- **Tanda 3** — Campo de hora + validación de solapamiento (conflicto, horario sugerido,
  "Reagendar y asignar", fix de "Pendiente desasigna técnico", fix de huso horario).

---

## ⏳ Falta probar — Tanda 4

### 1. Cancelación de solicitud (cliente)

1. Loguearse como cliente, ir a "Mis solicitudes".
2. En una solicitud en estado **Pendiente**, **Aceptada** o **En curso**, buscar el link
   "Cancelar solicitud" (chico, en rojo, debajo del bloque financiero de la card).
3. Click → tiene que desplegarse un aviso inline (no un popup del navegador) con el texto de
   confirmación y un link a Términos y condiciones.
4. Click en "Volver" → se cierra el aviso sin cancelar nada (verificar que no cambió el estado).
5. Click en "Sí, cancelar" → la página se recarga y la solicitud queda en estado **Cancelada**.
6. Si la solicitud ya tenía técnico asignado, revisar la terminal (`pnpm run dev`) — debería
   aparecer el log de "email" avisándole al técnico (sin `RESEND_API_KEY` no llega de verdad,
   pero el log tiene que estar).
7. Confirmar que una solicitud ya **Completada** o ya **Cancelada** NO muestra el link de cancelar.

### 2. Cron — cambio automático Aceptada → En curso

El selector de fecha del formulario no deja elegir fechas pasadas, así que para probar esto hay
que "adelantar el reloj" editando la fila directo en Supabase (Table Editor):

1. Crear o usar una solicitud ya en estado **Aceptada** (con técnico asignado).
2. En Supabase → Table Editor → `solicitudes` → esa fila → editar `fecha_solicitada` y
   `hora_solicitada` a algo que ya pasó (ej. hoy a una hora ya pasada, o ayer).
3. Llamar al endpoint del cron: entrar en el navegador (o `curl`) a
   `http://localhost:4321/api/cron/actualizar-estados` (en local no hace falta el secret si
   `CRON_SECRET` está vacío en el `.env`).
4. Respuesta esperada: `{"ok":true,"aEnCurso":1,"aCompletada":0,"errores":[]}` (el número puede
   variar si hay más de una solicitud vieja dando vueltas).
5. Refrescar el panel del cliente/admin de esa solicitud → estado tiene que decir **En curso**.
6. Revisar la terminal → tiene que haber logueado el email de aviso al cliente.

### 3. Cron — cambio automático En curso → Completada

1. Tomar esa misma solicitud (ya en "En curso") o una distinta.
2. Editar en Supabase `fecha_solicitada`/`hora_solicitada` de manera que "fecha+hora+horas
   estimadas" ya haya pasado (ej. si horas_estimadas = 2 y son las 15:00, poner la solicitud a
   las 10:00 de hoy).
3. Llamar de nuevo a `/api/cron/actualizar-estados`.
4. Respuesta esperada: `aCompletada: 1`.
5. Refrescar → estado **Completada**.

### 4. Técnico completa el cierre DESPUÉS del auto-completado

Este es el caso importante que pediste cuidar: que no se pierda la carga de fotos/gastos si el
sistema ya marcó "Completada" solo.

1. Con la solicitud del punto 3 (recién auto-completada, sin fotos ni gastos cargados todavía),
   entrar al panel del técnico.
2. El botón "✓ Completar trabajo" tiene que seguir apareciendo (aunque el estado ya diga
   "Completada").
3. Cargar una foto y/o un gasto extra, confirmar.
4. Refrescar → las fotos/gastos tienen que verse en el panel admin (sección "Cierre del
   trabajo"), y el botón "Completar trabajo" ya NO debería aparecer más en el panel técnico para
   esa solicitud (para evitar que la carguen dos veces).

---

## Notas rápidas

- `CRON_SECRET` está vacío en el `.env` a propósito — así en local no hace falta mandar ningún
  secret al llamar el endpoint del cron. En producción sí hay que cargarlo (ver
  `ESTADO_PROYECTO.md` → "Pendientes externos").
- Si algo no anda como se espera, anotalo acá abajo o directamente seguimos la conversación desde
  donde la dejamos.

## Encontrado en esta ronda de pruebas

_(agregar acá lo que vayas encontrando al retomar)_
