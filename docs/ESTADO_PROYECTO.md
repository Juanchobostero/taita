# Taita Soluciones — Estado del proyecto

> Documento vivo. Se actualiza al cerrar cada tanda de trabajo. Para el detalle de qué falta
> hacer y en qué orden, ver `docs/taita-backlog-tecnico.md` y el plan de tandas más abajo.

**Última actualización:** 2026-07-24

---

## Resumen

Plataforma operativa con registro de clientes/técnicos, flujo completo de solicitud de
servicio, panel admin/cliente/técnico, y páginas legales. Pendiente: capa de notificaciones,
gestión de horarios con solapamiento, timeline de estados para el cliente, conformidad final y
Mercado Pago.

---

## Pendientes externos (cuentas de terceros — no bloquean el código)

Todo lo de código está listo; esto son pasos que hay que hacer en paneles/cuentas externas
cuando haya tiempo, cada uno a su ritmo. El detalle de cada uno está más abajo en este documento.

- [ ] **Email real (Resend)** — verificar dominio `taitasoluciones.com.ar` en Resend (requiere
      antes migrar el DNS a Cloudflare y vincularlo a Vercel) y cargar `RESEND_API_KEY` real.
      Ver sección "SQL pendiente... → Tanda 2".
- [ ] **Cron externo (cron-job.org)** — para que el cambio automático de estado por fecha/hora
      (Tanda 4) funcione en producción. Generar `CRON_SECRET` y configurar el servicio. Jota
      ayuda con esto cuando Agustín/vos lo pidan. Ver sección "Tanda 4" más abajo.
- [ ] **WhatsApp** — cuenta Twilio/WhatsApp Cloud API, después de validar que el email ya
      funciona bien.
- [ ] **Mercado Pago** — credenciales de Agustín, se coordina al llegar a la Tanda 7 (al final,
      a propósito).

---

## Cómo probar cada tanda (manual, en local o en el preview de Vercel)

### Tanda 1 — Link de técnico + mail de contacto
1. Entrar a `/solicitud`, elegir una categoría, y en "Técnicos disponibles" click en **"Ver perfil"**
   de alguno → tiene que navegar en la misma pestaña (no abrir una nueva).
2. Entrar a `/contacto` → el mail que se muestra tiene que ser `taitasoluciones@gmail.com`.
3. ✅ Ya probado y confirmado por Jota (2026-07-23).

### Tanda 2 — Notificaciones por email + historial de estados
1. Enviar el formulario de `/contacto` o `/reclamos` → tiene que mostrar "¡Mensaje enviado!".
   Si no cargaste `RESEND_API_KEY` todavía, no llega ningún mail de verdad — es esperado, revisá
   la terminal donde corre `npm run dev`: tiene que aparecer un log tipo
   `[email] RESEND_API_KEY no configurada — se omite envío a ...`. Si ves eso, está funcionando bien.
2. Como cliente, crear una solicitud nueva → mismo chequeo en la terminal (log de "nueva solicitud").
3. Como admin, entrar al detalle de una solicitud y cambiar el estado (o asignar un técnico) →
   de nuevo, log en la terminal en vez de mail real.
4. (Ya con `RESEND_API_KEY` cargada) repetir los pasos de arriba y esta vez sí debería llegar el
   mail real a la casilla que corresponda.

### Tanda 3 — Horarios y solapamiento
Para que se note el conflicto hace falta que el técnico ya tenga **una solicitud en estado
"Aceptada"** en ese horario (mientras está en "Pendiente" no cuenta como agenda ocupada todavía).

1. Como cliente: entrar al perfil de un técnico puntual → "Solicitar servicio" → completar el
   formulario **incluyendo el horario nuevo** (selector de franjas de 30') → enviar.
2. Como admin: entrar al detalle de esa solicitud y cambiar el estado a **"Aceptada"** (ya tiene
   técnico asignado, así que el dropdown lo permite).
3. Como cliente de nuevo: pedirle **al mismo técnico**, **la misma fecha**, un horario que se pise
   con el de la solicitud del paso 1 (ej. si la primera es 10:00 con 2hs, probar con 11:00) →
   al enviar tiene que aparecer un aviso ámbar de conflicto con un horario sugerido, y no debería
   crearse la solicitud hasta que elijas otro horario (o uses el sugerido).
4. Para probar el lado del admin: crear una solicitud en el **flujo libre** (sin elegir técnico,
   desde `/solicitud` sin venir de un perfil), y en su detalle intentar asignarle el técnico que ya
   quedó ocupado en el paso 2, en el mismo horario → debería aparecer el mismo aviso con el botón
   "Asignar igual" (por si el admin quiere forzarlo a propósito).

### Tanda 5 — Vista de detalle + timeline para el cliente
1. Como cliente, entrar a "Mis solicitudes" y hacer click en el **título** de cualquier solicitud
   (ahora es un link) → tiene que navegar a `/dashboard/cliente/solicitud/[id]`.
2. Verificar que se ve: timeline de "Seguimiento" con cada cambio de estado y su fecha/hora, técnico
   asignado, detalles del trabajo, desglose financiero (sin el detalle interno de cuánto retiene la
   plataforma — eso queda solo para el admin) y, si la solicitud ya está completada, las fotos y
   gastos extras del cierre.
3. Probar con una solicitud vieja (creada antes de la Tanda 2, sin historial de estados registrado)
   → el timeline igual tiene que mostrar al menos el paso "Pendiente" con la fecha de creación,
   sin romperse.
4. Si la solicitud está en Pendiente/Aceptada/En curso, tiene que aparecer el botón de cancelar acá
   también (mismo componente ya probado en la Tanda 4).
5. Entrar a una solicitud **de otro cliente** manualmente por URL (copiar un id de otra cuenta) →
   tiene que redirigir a `/dashboard/cliente`, no mostrar los datos.

---

## Estado por módulo

| Módulo | Estado |
|---|---|
| Registro de clientes con verificación de email | ✅ Operativo |
| Registro de técnicos (con aprobación admin) | ✅ Operativo |
| Solicitud de servicio (sin técnico o con técnico pre-elegido) | ✅ Operativo |
| Técnicos candidatos al solicitar (informativo) | ✅ Operativo |
| Flujo de aceptación del técnico (asignada → aceptada/pendiente) | ✅ Operativo |
| Cierre de trabajo: fotos + gastos extras | ✅ Operativo |
| Panel admin — solicitudes, categorías, sub-items, usuarios, T&C | ✅ Operativo |
| Panel cliente — historial de solicitudes, reseñas, perfil | ✅ Operativo |
| Panel técnico — solicitudes, especialidades, perfil público | ✅ Operativo |
| Páginas legales (Términos, Privacidad) | ✅ Publicadas |
| Formularios de Contacto y Reclamos (UI + envío real por Resend) | ✅ Operativo (Tanda 2) |
| Link de técnico en misma pestaña (form de solicitud) | ✅ Corregido (Tanda 1) |
| Notificaciones por email (nueva solicitud + cambios de estado) | ✅ Operativo (Tanda 2) — falta cargar `RESEND_API_KEY` real para que salgan en producción |
| Historial de estados con timestamp | ✅ Operativo (Tanda 2) |
| Notificaciones por WhatsApp | ⏳ Pendiente (después de validar email) |
| Campo de hora + validación de solapamiento de horarios | ✅ Operativo y probado (Tanda 3) |
| Cambio automático de estado por fecha/hora | ✅ Operativo (Tanda 4) — falta configurar el cron externo (ver abajo) |
| Cancelación con confirmación inline | ✅ Operativo (Tanda 4) |
| Timeline de estados para el cliente | ✅ Operativo y probado (Tanda 5) |
| Conformidad del cliente + registro de pago (sin cobro real) | ✅ Operativo y probado (Tanda 6) |
| Integración Mercado Pago | ⏳ Pendiente (Tanda 7, al final) |

---

## Backlog en curso (tandas)

Fuente: `docs/taita-backlog-tecnico.md`. Se despliega de a 2-3 cambios por tanda para que
Agustín pueda probar y dar feedback antes de seguir.

- [x] **Tanda 1** — Fix link técnico en misma pestaña + mail de contacto → `taitasoluciones@gmail.com` (verificada en local por Jota 2026-07-23; de paso se detectó y arregló que faltaba `SUPABASE_SERVICE_ROLE_KEY` en `.env`, no estaba documentada en el README)
- [x] **Tanda 2** — Notificaciones por email (Resend): nueva solicitud + cambios de estado,
      centralizados en `notificarCambioEstado()`, con historial de estados (`solicitud_historial_estados`).
      Contacto y Reclamos ahora envían el mail real. **Falta:** correr el SQL de abajo en Supabase
      y cargar `RESEND_API_KEY` (cuenta en resend.com) para que los emails salgan de verdad —
      hasta entonces solo quedan logueados en consola sin romper nada.
- [x] **Tanda 3** — Campo de hora en la solicitud + validación de solapamiento de horarios por técnico.
      Probada y confirmada en local por Jota 2026-07-23 (conflicto detectado, horario sugerido
      correcto, "Asignar igual" y el fix de "Pendiente desasigna técnico" funcionando).
      De paso se corrigieron dos bugs encontrados en la prueba:
      - "Pendiente" no le sacaba el técnico asignado (quedaba un estado inconsistente que le
        rompía la agenda al técnico) — ahora sí lo desasigna.
      - El horario sugerido mostraba "Invalid Date" porque `fecha_solicitada` es `timestamptz`
        en la base (no `date` simple) y la función de sugerencia no lo normalizaba — arreglado
        en `src/lib/disponibilidad.ts`.
      - Ajuste de UX pedido por Jota: "Asignar igual" ahora **reagenda la solicitud al horario
        sugerido** (actualiza `fecha_solicitada`/`hora_solicitada`) en vez de forzar el técnico en
        el horario original que chocaba. Se ve reflejado tanto en el panel admin (aviso verde de
        confirmación) como en el panel del cliente (fecha/hora actualizada) y en el email de
        "Aceptada" que recibe el cliente (ahora incluye el horario confirmado). Si no hay ningún
        horario libre en los próximos 14 días, queda como alternativa forzar en el horario
        original ("Asignar igual en el horario original").
      - **Bug de huso horario**: `fecha_solicitada` se guarda como medianoche UTC, y en esta PC
        (huso `America/Argentina/Buenos_Aires`, UTC-3) se mostraba **un día antes** del real en
        todos lados (panel admin, panel cliente, panel técnico) porque `toLocaleDateString()` sin
        especificar huso usa el huso local de la máquina. La fecha guardada y la lógica de
        conflictos de horario siempre estuvieron bien — era solo un problema de cómo se mostraba.
        Arreglado forzando `timeZone: 'UTC'` (o normalizando antes de formatear) en los 4 lugares
        que mostraban esta fecha: `dashboard/cliente.astro`, `dashboard/tecnico.astro`,
        `dashboard/admin/solicitud/[id].astro` y el email de nueva solicitud
        (`src/lib/notificaciones.ts`).
- [x] **Tanda 4** — Cambio automático de estado por fecha/hora (cron) + cancelación con confirmación inline.
      Probada y confirmada en local por Jota 2026-07-23/24 (cron Aceptada→En curso→Completada,
      cancelación cliente y admin, cierre de trabajo post-auto-completado). **Falta:** configurar
      el cron externo (ver abajo) y decidir/cargar `CRON_SECRET`.
      - De paso se corrigieron 2 bugs encontrados en la prueba:
        - **Cancelación desde el admin** no tenía confirmación inline (a diferencia del cliente) ni
          feedback posterior — se agregó el mismo patrón de aviso "¿seguro?" + banner de
          confirmación al cancelar. También se pusieron en rojo los badges de "Cancelada" (cliente
          y admin), antes en gris y poco visibles; en el panel cliente además se tiñe la card
          completa.
        - **`CompletarTrabajo.tsx`** descartaba fotos en silencio (sin avisar nada) cuando no eran
          imagen válida, pesaban más de 5MB, o fallaba la subida a Storage — parecía que el botón
          "+" no hacía nada. Ahora muestra el error correspondiente en cada caso.
      - Nuevo endpoint `GET /api/cron/actualizar-estados`: pasa `Aceptada → En curso` cuando ya
        llegó la fecha/hora, y `En curso → Completada` cuando ya pasó fecha/hora + horas
        estimadas. Usa `notificarCambioEstado` (mismo historial/emails que los cambios manuales).
      - El cambio manual del admin sigue funcionando exactamente igual y puede sobrescribir en
        cualquier momento — el cron no bloquea nada.
      - Decisión de Jota: si el cron auto-completa una solicitud antes de que el técnico cargue
        fotos/gastos extra, el botón "Completar trabajo" sigue disponible una vez más para que
        pueda cargar el cierre (no se pierde esa info). Una vez cargado el cierre, el botón
        desaparece.
      - Cancelación (Paso 3.4): nuevo botón "Cancelar solicitud" en el panel del cliente
        (`CancelarSolicitud.tsx`), con confirmación inline (sin `confirm()` nativo) y link a
        `/terminos`. Disponible mientras la solicitud esté Pendiente/Aceptada/En curso. Notifica
        por email al técnico si ya estaba asignado.
- [x] **Tanda 5** — Vista de detalle + timeline de estados para el cliente. Probada y confirmada
      por Jota 2026-07-24 (timeline con las 4 fechas reales, técnico, detalle, cierre del trabajo,
      solicitud vieja sin historial, botón cancelar, y redirección al intentar ver la de otro
      cliente por URL).
      - Nueva página `src/pages/dashboard/cliente/solicitud/[id].astro`, de solo lectura (sin
        dropdown de cambio de estado manual como tiene el admin).
      - Timeline armado a partir de `solicitud_historial_estados` (Tanda 2); como la creación de la
        solicitud no queda registrada ahí (nace directo en "pendiente"), se agrega ese primer paso
        a mano con `creado_en` para que el timeline arranque siempre desde el principio.
      - Reusa `GaleriaFotos` y `CancelarSolicitud` tal cual están, sin duplicar lógica.
      - Desglose financiero del cliente **no** muestra la distribución técnico/plataforma que sí ve
        el admin (decisión propia, a confirmar con Jota/Agustín: esa info es de margen interno).
      - Seguridad: la página valida `solicitud.cliente_id === userId` antes de mostrar nada; si no
        coincide, redirige a `/dashboard/cliente` (evita que un cliente vea la solicitud de otro
        cambiando el id en la URL).
      - El título de cada card en "Mis solicitudes" ahora es un link a esta vista nueva.
- [x] **Tanda 6** — Conformidad del cliente + registro de pago (mockeado). Implementada y probada
      por Jota 2026-07-24 (botón → confirmación inline → cartel de conformidad persistente, los 2
      emails logueados, aviso en panel técnico e indicador en panel admin, todo verificado).
      - El desglose completo (precio base, gastos extra, total) ya se mostraba desde la Tanda 5 en
        la vista de detalle del cliente — no se duplicó ahí, la conformidad se agrega debajo.
      - Botón "Dar conformidad" (`DarConformidad.tsx`, mismo patrón de confirmación inline que
        `CancelarSolicitud`) visible solo cuando `estado = 'completada'` y todavía no se confirmó.
      - Al confirmar: nuevas columnas `solicitudes.conformidad_cliente` / `conformidad_en`, se
        inserta un registro en la tabla nueva `pagos` (monto = total, estado `registrado` — mock,
        sin cobro real) y se notifica por email a admin y técnico (`notificarConformidad()`).
      - El link/checkout real de Mercado Pago queda pendiente para la Tanda 7; por ahora el cliente
        ve un aviso de "pago registrado, pendiente de acreditación".
      - Panel técnico: aviso en la solicitud cuando el cliente ya dio conformidad.
      - Panel admin: indicador de conformidad (dado/pendiente) en el detalle, además del email.
- [ ] **Tanda 7** — Integración Mercado Pago (al final, requiere credenciales de Agustín)

WhatsApp (parte del Paso 2 del backlog) se encara después de validar el email con Agustín —
requiere cuenta Twilio/WhatsApp Cloud API y, para producción, verificación de Meta.

---

## Decisiones técnicas tomadas

- **Proveedor de email:** Resend.
- **Horarios:** se agrega un campo de hora a `solicitudes` (hoy solo hay fecha) para poder
  validar solapamiento por franja horaria, no solo por día.
- Todos los cambios de esquema de Supabase son aditivos (`ADD COLUMN IF NOT EXISTS`,
  `CREATE TABLE IF NOT EXISTS`) — no se modifica ni elimina nada existente.
- El SQL a ejecutar en Supabase antes de cada deploy se documenta en este archivo, en la sección
  de la tanda correspondiente, una vez implementada.

---

## SQL pendiente de correr en Supabase

### Tanda 2 — historial de estados

Ejecutar en el SQL Editor de Supabase (aditivo, no rompe nada existente):

```sql
CREATE TABLE IF NOT EXISTS solicitud_historial_estados (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id  uuid NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  estado        text NOT NULL,
  cambiado_por  uuid REFERENCES usuarios(id),
  creado_en     timestamptz DEFAULT now()
);
```

Las políticas RLS de esta tabla ya están agregadas a `supabase/rls_policies.sql` (sección
`SOLICITUD_HISTORIAL_ESTADOS`) — correr ese bloque también (o el archivo completo, las políticas
usan `CREATE POLICY` simple, si ya corrieron el archivo antes van a chocar con las que ya existen;
en ese caso correr solo el bloque nuevo del final del archivo).

También hace falta, en el proyecto de Vercel (o `.env` local), cargar:
- `RESEND_API_KEY` — cuenta gratis en [resend.com](https://resend.com), API key desde el dashboard.
- `RESEND_FROM_EMAIL` — mientras no se verifique un dominio propio en Resend, se puede dejar
  `Taita Soluciones <onboarding@resend.dev>` (funciona pero solo para pruebas/bajo volumen).
- `PUBLIC_SITE_URL` — URL pública del sitio (para los links dentro de los emails).

Sin `RESEND_API_KEY`, la app sigue funcionando normal — los emails simplemente no se mandan y
queda un warning en el log del servidor.

> **Pendiente de Jota (fuera del código, cuentas externas — no bloquea el resto de las tandas):**
> 1. Migrar el DNS de `taitasoluciones.com.ar` a Cloudflare (para el SSL).
> 2. Vincular el dominio a Vercel (Project Settings → Domains).
> 3. Verificar el dominio en Resend (Domains → Add Domain) y cargar los registros TXT/CNAME en Cloudflare.
> 4. Una vez verificado, cargar `RESEND_API_KEY` real y `RESEND_FROM_EMAIL=Taita Soluciones <notificaciones@taitasoluciones.com.ar>`.
> Hasta entonces, los emails quedan solo logueados en consola (no rompe nada, pero no llegan de verdad).

### Tanda 3 — hora de la solicitud

Ejecutar en el SQL Editor de Supabase (aditivo, solicitudes viejas quedan con `hora_solicitada = NULL`
y siguen funcionando igual — el chequeo de solapamiento simplemente se omite si no hay hora cargada):

```sql
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS hora_solicitada time;
```

**Cómo funciona la validación de horarios:**
- El formulario de solicitud ahora pide un horario (franjas de 30' entre 08:00 y 20:00) además de
  la fecha.
- Cuando el cliente pide el servicio a un técnico puntual (desde el perfil del técnico, no en el
  flujo libre), se chequea al enviar si ese técnico ya tiene algo agendado en ese horario
  (`src/lib/disponibilidad.ts`, reutilizado también server-side en `crear-solicitud.ts` como
  defensa). Si choca, se avisa inline con el horario libre más cercano sugerido — el cliente puede
  usar la sugerencia o elegir otra fecha/hora libremente.
- Cuando el admin asigna o reasigna técnico desde el detalle de la solicitud, se hace el mismo
  chequeo contra la agenda de ese técnico. Si choca, no asigna automáticamente: muestra el aviso
  inline con el horario sugerido y un botón "Asignar igual" para que el admin decida forzarlo si
  hace falta.
- En el flujo libre (sin técnico elegido por el cliente) no se valida en el momento de crear —
  todavía no hay técnico asignado; el chequeo se hace cuando el admin lo asigna.

### Tanda 4 — cron de estados automáticos (sin SQL, pero requiere configuración externa)

No hay cambios de esquema en esta tanda. Lo que sí hace falta:

1. **Generar un secreto** cualquiera (ej. con `openssl rand -hex 32` o similar) y cargarlo como
   `CRON_SECRET` en el `.env` local y en las variables de entorno del proyecto en Vercel.
2. **Configurar un cron externo** que llame al endpoint cada 15-30 minutos — como están en el
   plan **Hobby** de Vercel, sus Cron Jobs nativos están limitados a una corrida por día, muy poco
   frecuente para este caso de uso. Alternativa gratuita: [cron-job.org](https://cron-job.org).
   - URL a llamar: `https://<tu-dominio-o-app>.vercel.app/api/cron/actualizar-estados?secret=EL_MISMO_CRON_SECRET`
   - Método: `GET`
   - Frecuencia sugerida: cada 15 minutos.
   - (Si el servicio que uses soporta headers custom, también podés mandar
     `Authorization: Bearer EL_MISMO_CRON_SECRET` en vez de `?secret=` en la URL — el endpoint
     acepta cualquiera de las dos formas.)

Mientras no se configure el `CRON_SECRET`, el endpoint queda sin proteger (cualquiera podría
llamarlo) — no rompe nada porque solo mueve estados según fecha/hora real, pero conviene cargarlo
antes de ir a producción.

### Tanda 6 — conformidad del cliente + registro de pago (mock)

Ejecutar en el SQL Editor de Supabase (aditivo, no rompe nada existente):

```sql
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS conformidad_cliente boolean DEFAULT false;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS conformidad_en timestamptz;

CREATE TABLE IF NOT EXISTS pagos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id  uuid NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  monto         numeric NOT NULL,
  estado        text NOT NULL DEFAULT 'registrado', -- registrado (mock) | pagado (con MP, Tanda 7)
  creado_en     timestamptz DEFAULT now()
);
```

Las políticas RLS de `pagos` ya están agregadas a `supabase/rls_policies.sql` (sección `PAGOS`) —
correr ese bloque también (o el archivo completo; si ya corrieron el resto antes, correr solo el
bloque nuevo del final para no chocar con policies existentes).

**Cómo funciona:**
- En la vista de detalle del cliente, cuando la solicitud está en estado **Completada** y todavía no
  se dio conformidad, aparece un botón "Dar conformidad" con el desglose (precio base, gastos extra,
  total) ya visible arriba, y una confirmación inline antes de mandar (mismo patrón que cancelar).
- Al confirmar: se marca `conformidad_cliente = true` con su timestamp, se inserta una fila en
  `pagos` (monto = total de la solicitud, estado `registrado`) y se avisa por email a admin y al
  técnico asignado (`notificarConformidad()` en `src/lib/notificaciones.ts`).
- El link/checkout real de Mercado Pago **no existe todavía** — queda mockeado como un aviso de
  "pago registrado, pendiente de acreditación". Eso se conecta en la Tanda 7.
- El panel del técnico muestra un aviso cuando el cliente ya dio conformidad en una de sus
  solicitudes completadas.
- El panel del admin muestra un indicador de conformidad en el detalle de la solicitud (además del
  email que ya recibe).

---

## Reportes de avance previos

- `docs/reporte-cliente-2026-06-10.html` — snapshot de funcionalidades entregadas al 10/06/2026.
- `docs/resumen-cliente-items-1-9.md` — resumen de los primeros 9 ítems del alcance original.
- `docs/sesion-2026-05-28.md` a `docs/sesion-2026-06-09.md` — bitácora técnica sesión a sesión.

Este archivo (`ESTADO_PROYECTO.md`) es la fuente de verdad del estado **actual** del proyecto;
los reportes fechados de arriba quedan como registro histórico de cada entrega.
