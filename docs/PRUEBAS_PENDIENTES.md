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

### 1. Cancelación de solicitud (cliente) ✅ probado 2026-07-23

Funcionó del lado cliente y del lado admin (dropdown "Cambiar estado" → Cancelada). De paso se
agregaron mejoras de feedback visual que no estaban en el plan original:
- Cliente: card + badge rojo para solicitudes canceladas (antes quedaban en gris, poco visibles).
- Admin: badge rojo también; se agregó confirmación inline antes de cancelar (antes cambiaba de
  estado sin preguntar nada, a diferencia del lado cliente) y un banner de confirmación después de
  cancelar.
- Confirmado por código que el admin puede cancelar sin que la solicitud tenga técnico asignado
  (no estaba en la lista `requiereTecnico`).

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

### 2 y 3. Cron — Aceptada → En curso → Completada ✅ probado 2026-07-23

Se probaron juntas sin querer: la solicitud de prueba tenía tanto el inicio como el fin (hora +
horas estimadas) ya pasados, así que el mismo llamado al cron la hizo saltar Aceptada → En curso →
Completada de una sola vez — `{"aEnCurso":1,"aCompletada":1}`. Confirmado con badge verde
"Completada" en el panel del cliente y los 2 emails logueados en la terminal en el orden correcto
(En curso, después Completada).

Pasos originales (para repetir cada una por separado si hace falta):

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

1. Tomar esa misma solicitud (ya en "En curso") o una distinta.
2. Editar en Supabase `fecha_solicitada`/`hora_solicitada` de manera que "fecha+hora+horas
   estimadas" ya haya pasado (ej. si horas_estimadas = 2 y son las 15:00, poner la solicitud a
   las 10:00 de hoy).
3. Llamar de nuevo a `/api/cron/actualizar-estados`.
4. Respuesta esperada: `aCompletada: 1`.
5. Refrescar → estado **Completada**.

### 4. Técnico completa el cierre DESPUÉS del auto-completado — bug encontrado y arreglado 2026-07-23

**Bug real (no de config):** en `CompletarTrabajo.tsx`, si una foto no era imagen válida o pesaba
más de 5MB, el código la descartaba en el loop de subida **sin avisar nada** — no llegaba ni a
intentar la subida a Storage, por eso no se veía ningún request ni error, parecía que el botón "+"
no hacía nada. Pasó justo con una foto de celular (`IMG_0323.jpg`, > 5MB). Se agregó mensaje de
error visible para ambos casos (no-imagen / > 5MB). De paso también se corrigió que un error real
de subida (ej. falla de Storage) quedaba silenciado de la misma forma — ahora también se muestra.

✅ Probado de punta a punta: foto liviana + gasto extra ($10.000) subidos por el técnico, visibles
en el panel admin (sección "Cierre del trabajo", desglose financiero recalculado a $121.550), y el
botón "Completar trabajo" ya no aparece más en el panel técnico para esa solicitud.

---

## ✅ Tanda 5 — probada y confirmada 2026-07-24

### Vista de detalle + timeline para el cliente

1. Como cliente, entrar a "Mis solicitudes" y hacer click en el **título** de una solicitud
   (ahora es un link) → tiene que navegar a `/dashboard/cliente/solicitud/[id]`.
2. Verificar que se ve: timeline de "Seguimiento" (cada estado con fecha/hora), técnico asignado,
   detalles del trabajo, desglose financiero (sin el detalle de cuánto retiene la plataforma) y,
   si ya está completada, fotos/gastos del cierre.
3. Probar con una solicitud vieja (de antes de la Tanda 2, sin historial registrado) → el timeline
   igual tiene que arrancar con "Pendiente" en la fecha de creación, sin romperse.
4. Si la solicitud está en Pendiente/Aceptada/En curso, el botón de cancelar tiene que aparecer acá
   también.
5. Copiar el id de una solicitud de **otro cliente** y entrar por URL → tiene que redirigir a
   `/dashboard/cliente` sin mostrar nada.

---

## Notas rápidas

- `CRON_SECRET` está vacío en el `.env` a propósito — así en local no hace falta mandar ningún
  secret al llamar el endpoint del cron. En producción sí hay que cargarlo (ver
  `ESTADO_PROYECTO.md` → "Pendientes externos").
- Si algo no anda como se espera, anotalo acá abajo o directamente seguimos la conversación desde
  donde la dejamos.

## Encontrado en esta ronda de pruebas

_(agregar acá lo que vayas encontrando al retomar)_
