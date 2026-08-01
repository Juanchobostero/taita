# Taita Soluciones — Estado del proyecto

> Documento vivo. Se actualiza al cerrar cada tanda de trabajo. Para el detalle de qué falta
> hacer y en qué orden, ver `docs/taita-backlog-tecnico.md` y el plan de tandas más abajo.

**Última actualización:** 2026-07-31 — fix de husos horarios (todas las fechas/horas "reales" de
la app ahora se muestran siempre en hora de Argentina, sin importar en qué huso corra el servidor)
+ la columna "Fecha" del admin ahora muestra la fecha del servicio en vez de la de creación, **falta
probar**. Antes, el mismo día: categorías destacadas en la home + página "Ver más" (`/categorias`),
**falta correr el SQL y probar**. El 2026-07-30: 8 correcciones a partir del feedback de Agustín en
PDF (`TAITA_ERRORES.pdf`) y mejoras de SEO (sitemap, robots.txt, Open Graph, datos estructurados).
El 2026-07-29: Mercado Pago Fase 1 probada en producción con credenciales de test, flujo de
confirmación del técnico (asignada → aceptada/rechazo), fix definitivo del Realtime del panel del
cliente, y estilo de marca en los emails. Ver secciones correspondientes más abajo.

---

## Resumen

Plataforma operativa con registro de clientes/técnicos, flujo completo de solicitud de
servicio (incluyendo confirmación del técnico antes de comprometerse a un trabajo), panel
admin/cliente/técnico con notificaciones in-app en tiempo real, y páginas legales. **Ya publicada
en el dominio propio** (`taitasoluciones.com.ar`, vía Vercel + Cloudflare) **con envío de email
real funcionando** (Resend, con estilo de marca propio). Pendiente: WhatsApp, cron externo para
producción, y **Mercado Pago — el próximo frente de trabajo**.

Los 4 issues de la sesión 2026-07-28 (ver sección "Issues abiertos" más abajo) quedaron todos
implementados y probados. Ver también la sección "Confirmación del técnico + fix definitivo de
Realtime + estilo de emails" (2026-07-29) para lo más reciente.

---

## Pendientes externos (cuentas de terceros — no bloquean el código)

Todo lo de código está listo; esto son pasos que hay que hacer en paneles/cuentas externas
cuando haya tiempo, cada uno a su ritmo. El detalle de cada uno está más abajo en este documento.

- [x] **Dominio propio** — `taitasoluciones.com.ar` migrado de DonWeb a Cloudflare (nameservers) y
      conectado a Vercel (registros A/CNAME, ambos en "DNS only"). SSL emitido por Vercel, sitio
      accesible en `https://taitasoluciones.com.ar`. Hecho el 2026-07-25.
- [x] **Email real (Resend)** — dominio verificado en Resend (DKIM, SPF/MX de envío, DMARC, todos
      cargados en Cloudflare DNS). `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `PUBLIC_SITE_URL`
      cargadas tanto en `.env` local como en Vercel (Production + Preview). Probado de punta a
      punta: mail de `/contacto` llegó y figura "Delivered" en Resend → Logs. Hecho el 2026-07-25.
- [ ] **Cron externo (cron-job.org)** — para que el cambio automático **Aceptada → En curso**
      (Tanda 4) funcione en producción, no solo llamando la URL a mano. Sigue pendiente — ver
      checklist detallado en la sección "Tanda 4" más abajo. (El paso **En curso → Completada**
      quedó pausado a propósito, no depende de esto — ver "Sacar horas estimadas".)
- [ ] **WhatsApp** — cuenta Twilio/WhatsApp Cloud API, después de validar que el email ya
      funciona bien (✅ ya validado). Se puede encarar cuando haya tiempo.
- [ ] **Mercado Pago** — 🟢 Fase 1 completa en código: link de pago, reintento de pago rechazado, y
      manejo de todos los estados (pagado/rechazado/reembolsado/contracargo), cada uno con su
      notificación. **Falta re-probar en local** el tramo de reintento/rechazo antes de cerrar
      (2026-07-29). Después: cargar las credenciales de **prueba** en Vercel (Production) para que
      Agustín la pruebe en el dominio real — todavía sin credenciales reales, a propósito. Ver
      `docs/mercadopago-integracion.md` para el detalle completo, el checklist de progreso, y una
      guía paso a paso pensada para pasarle directo a Agustín.

---

## Issues abiertos — sesión 2026-07-28

Reportados por Jota después de las primeras pruebas en producción. Investigados y con causa raíz
encontrada para los primeros 3; el 4to es un pedido nuevo de Agustín. Orden de trabajo: 1 → 2 → 3 → 4.

**Estado:** 1, 2 y 3 con el código ya escrito y commiteado, **pero sin probar todavía** — se
implementaron en una PC que no tenía cargada `SUPABASE_SERVICE_ROLE_KEY` (ni el resto de envs no
críticas: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`), así que no se pudo levantar
`npm run dev` para probar en el momento. Al pullear en el entorno con las envs completas, probar
los 3 siguiendo el checklist de la sección "Cómo probar" más abajo antes de dar por cerrado el
issue. El 4 sigue sin arrancar (falta confirmar diseño).

### 1. Registro: sacar verificación de mail + validar duplicados

**✅ Código implementado + configuración de Supabase hecha (2026-07-28). Falta probar de punta a
punta** (registro cliente, registro técnico, y el caso de mail repetido).

**Causas raíz encontradas (investigado el 2026-07-28):**
- La verificación de mail **no bloquea nada en el código** — no hay ningún lugar (middleware, API,
  página) que chequee `email_confirmed_at` o similar. `/verificar-email` es solo una pantalla
  estática de "revisá tu correo" que nunca vuelve a consultar nada; el técnico ya se saltea este
  paso por completo y accede igual a su dashboard. Sacarla para el cliente es de bajo riesgo.
- El link del mail de confirmación apuntando a `localhost:4321` en producción es un tema de
  **configuración de Supabase**, no de código: el código ya arma `emailRedirectTo` dinámicamente
  con `window.location.origin`, pero el **Site URL** del proyecto en Supabase (Authentication →
  URL Configuration) probablemente sigue apuntando a `localhost:4321` de cuando se armó el
  proyecto, y si la URL pedida no está en la lista de "Redirect URLs", Supabase cae al Site URL
  por default.
- El bug de "deja registrar el mismo mail 2 veces sin avisar nada": en `RegistroForm.tsx`
  (`ClienteForm` y `TecnicoForm`), el `supabase.auth.signUp(...)` nunca revisa
  `data.user.identities`. Si el mail ya existe, Supabase **no tira error** — devuelve un usuario
  con `identities: []` vacío (a propósito, para no filtrar qué mails están registrados) y el
  código asume éxito y sigue igual, sin insertar nada nuevo ni avisar al usuario.

**Plan:**
- [x] `ClienteForm`: sacar el redirect a `/verificar-email` → manda directo a `/dashboard/cliente`
      (igual que ya hacía `TecnicoForm`).
- [x] Chequeo de `identities.length === 0` agregado en ambos formularios (`ClienteForm` y
      `TecnicoForm`) → muestra "Este mail ya está registrado, ¿ya tenés cuenta?" en vez de seguir
      como si nada.
- [x] Borrados `verificar-email.astro` y `ResendVerification.tsx` (código muerto, confirmado que
      no los usaba nadie más en el proyecto).
- [x] **Externo, en Supabase (hecho 2026-07-28):** se desactivó **"Confirm email"** en
      Authentication → Sign In / Providers → Email. Ya no se manda ningún mail de confirmación al
      registrarse, ni cliente ni técnico.
      - **Site URL / Redirect URLs**: se dejaron **sin cambiar** (siguen en `localhost:4321`), a
        propósito — con "Confirm email" desactivado no hay ningún flujo activo que las use hoy (el
        link de "¿Olvidaste tu contraseña?" en el login es un `href="#"` sin implementar todavía).
        Si en el futuro se agrega recuperar contraseña, magic link, o se reactiva la confirmación
        de mail, hay que volver a esta pantalla y cargar `https://taitasoluciones.com.ar` como
        Site URL + Redirect URL antes de que ese flujo dependa de ahí.

**Encontrado al probar (2026-07-28):** con "Confirm email" desactivado, Supabase para un mail ya
registrado **ya no devuelve el "usuario fantasma" con `identities: []`** (ese comportamiento es
solo para mails sin confirmar) — devuelve directo un `error` real (`"User already registered"`, en
inglés), que cortaba antes de llegar al chequeo de `identities`. El mensaje le llegaba al usuario
tal cual, en inglés y sin indicarle qué hacer. Se agregó `mensajeErrorAuth()` en
`RegistroForm.tsx` que detecta ese caso puntual (por `error.code === 'user_already_exists'` o el
texto del mensaje) y lo traduce a: *"Ese correo ya está registrado. Si ya tenés cuenta, iniciá
sesión — o si olvidaste tu contraseña, escribinos a taitasoluciones@gmail.com para recuperarla."*
Se mantiene el chequeo de `identities.length === 0` como respaldo para el caso de mail existente
sin confirmar (por si queda alguno de antes de desactivar "Confirm email").

**Falta probar (checklist para retomar en casa):**
- [ ] Registrar un cliente nuevo con un mail que no exista → tiene que crear la cuenta y mandar
      directo a `/dashboard/cliente`, sin pantalla de "revisá tu correo" ni mail de confirmación.
- [ ] Registrar un técnico nuevo con un mail que no exista → mismo resultado, manda a
      `/dashboard/tecnico` (ya lo hacía así antes, no debería haber cambiado).
- [ ] Intentar registrarse (cliente o técnico) con un mail que **ya existe** → tiene que aparecer
      el error "Este mail ya está registrado, ¿ya tenés cuenta?" y no crear nada nuevo ni duplicar
      la fila en `usuarios`/`tecnicos`.
- [ ] Confirmar que no queda ninguna referencia rota a `/verificar-email` (no debería, ya se
      verificó por código, pero vale un click manual).

### 2. Responsividad

**✅ Código implementado (2026-07-28). Falta probar** (achicar ventana / celular).

**Causa raíz encontrada:** en `admin.astro`, el header (título + botones "Categorías/T&C/Usuarios")
usaba `flex items-center gap-2` **sin** `flex-wrap` ni breakpoint, y cada botón tenía `shrink-0`
(le prohibía achicarse) — se amontonaban y desbordaban en mobile. El panel del cliente y del
técnico **ya tenían el patrón correcto** (`flex-col sm:flex-row`); el admin había quedado
desactualizado respecto a esos dos.

**Plan:**
- [x] Aplicado en `admin.astro` el mismo patrón `flex-col sm:flex-row` que ya usan `cliente.astro`
      y `tecnico.astro`, y agregado `flex-wrap` a la fila de botones de acceso rápido.
- [ ] **Falta probar:** entrar a `/dashboard/admin` con la ventana angosta o desde el celular →
      el título y los 3 botones (Categorías/T&C/Usuarios) tienen que acomodarse en columna (o
      envolver en varias líneas) en vez de desbordar horizontalmente.
- [ ] Resto de bugs de responsividad: no se pueden encontrar solo leyendo código — revisar
      página por página (Jota prueba en el celular / ventana angosta, manda captura de lo que se
      vea mal, se arregla de a una).

### 3. Botones más destacados (links poco visibles como acción)

**✅ Código implementado (2026-07-28). Falta probar** (visual, en cada pantalla listada abajo).

Alcance acordado con Jota: convertir a botón píldora (mismo
patrón que ya usaba "Ver detalle" en `MisSolicitudes.tsx`) todos los links de acción real que
eran texto plano sin fondo:
- `FormSolicitud.tsx` — "Ver perfil" en cards de técnicos candidatos.
- `TablaSolicitudesAdmin.tsx` — "Ver detalle" en la tabla del admin.
- `dashboard/tecnico.astro` — "Ver perfil" del perfil público propio, y nuevo "Ver detalle →" por
  solicitud (ver punto siguiente).
- `CancelarSolicitud.tsx` — "Cancelar solicitud" (disparador) y "Sí, cancelar" (confirmación).
- `DarConformidad.tsx` — "Sí, confirmar".
- `ResenaForm.tsx` — "⭐ Dejar reseña a…".
- `MisSolicitudes.tsx` — "Solicitá un servicio →" (estado vacío).
- `admin/solicitud/[id].astro` — botones de reagendar/asignar en conflicto de horario, y
  "Sí, cancelar".

Quedaron afuera a propósito (acciones secundarias tipo "Cancelar/Volver" que acompañan a un botón
primario, y la inconsistencia menor entre "← Panel admin" / "← Volver al panel") — se pueden
retomar más adelante si molesta en el uso real.

**De paso, gap encontrado y resuelto:** el técnico no tenía ninguna vista de detalle con timeline
de estados (a diferencia de cliente y admin, que sí la tienen desde la Tanda 5). Se agregó
`src/pages/dashboard/tecnico/solicitud/[id].astro`, mismo patrón que la vista del cliente:
timeline vía `solicitud_historial_estados`, datos del cliente, detalle del trabajo, cierre
(fotos/gastos si ya está completada), desglose de "tu ganancia" (precio base, tasa, gastos extra,
total a recibir) y el botón "Completar trabajo" cuando corresponde. Seguridad: valida
`solicitud.tecnico_id === tecnico.id` del usuario logueado antes de mostrar nada, mismo criterio
que la vista del cliente. Enlazada desde `dashboard/tecnico.astro` (título de la solicitud +
botón "Ver detalle →").

**Falta probar (checklist para retomar en casa):**
- [ ] `/solicitud` (con técnico puntual) → "Ver perfil" de cada candidato ahora se ve como botón
      con fondo, no texto suelto.
- [ ] Panel admin, tabla de solicitudes → "Ver detalle" ídem.
- [ ] Panel técnico → "Ver perfil" (perfil público propio) ídem.
- [ ] Panel cliente → "Cancelar solicitud" y su confirmación "Sí, cancelar" se ven como botones,
      y el flujo de cancelar sigue funcionando igual que antes (no se tocó la lógica, solo estilos).
- [ ] Vista de detalle del cliente, solicitud completada → "Sí, confirmar" (dar conformidad) ídem,
      confirmar que el flujo de conformidad sigue funcionando.
- [ ] Panel cliente, solicitud completada sin reseña → "⭐ Dejar reseña a…" ídem.
- [ ] Panel cliente sin ninguna solicitud → "Solicitá un servicio →" (estado vacío) ídem.
- [ ] Admin, detalle de una solicitud con conflicto de horario → los botones de
      "Reagendar a ese horario y asignar" / "Asignar igual" se ven como píldora ámbar, y el
      "Sí, cancelar" del admin como píldora roja.
- [ ] **Nuevo — panel técnico:** entrar a `/dashboard/tecnico`, click en el título de una
      solicitud o en "Ver detalle →" → tiene que abrir `/dashboard/tecnico/solicitud/[id]` con el
      timeline, datos del cliente, detalle del trabajo, "tu ganancia", y el botón "Completar
      trabajo" cuando corresponda (mismos casos que ya tenía en la lista: aceptada/en_curso, o
      completada sin cierre cargado).
- [ ] Entrar a esa URL nueva con el id de una solicitud de **otro técnico** → tiene que redirigir
      a `/dashboard/tecnico` (mismo chequeo de seguridad que la vista del cliente).

### 4. Notificaciones in-app en tiempo real (pedido de Agustín — 2026-07-28)

**✅ Código implementado (2026-07-28). Falta correr el SQL en Supabase, habilitar Realtime, y
probar de punta a punta.**

**Objetivo:** que cada usuario (cliente, técnico, admin) vea dentro de la web un historial de los
sucesos que le corresponden — mismo contenido que ya recibe por mail, pero también visible adentro
de la app (tipo campanita de Facebook/Instagram) y **en tiempo real**, sin recargar la página.

**A quién le llega cada notificación** (mapeo 1 a 1 con los 12 mails que ya existían — no se
inventaron sucesos nuevos):

| Evento | Cliente | Técnico | Admin |
|---|:---:|:---:|:---:|
| Nueva solicitud | ✅ | | ✅ (todos) |
| Aceptada / En curso / Completada | ✅ | | |
| Cancelada | ✅ | ✅ si asignado | |
| Vuelve a Pendiente | | | ✅ (todos) |
| Conformidad recibida | | ✅ si asignado | ✅ (todos) |
| Contacto / Reclamo | | | ✅ (todos) |

A diferencia del mail (que va a una casilla fija `taitasoluciones@gmail.com`), la notificación
in-app de "admin" se crea para **todos** los `usuarios.tipo = 'admin'` — pensado para si en algún
momento hay más de un admin logueado.

**Cómo funciona:**
- Tabla `notificaciones` (`usuario_id`, `solicitud_id` opcional, `titulo`, `mensaje`, `leida`,
  `creado_en`). Se inserta una fila en los mismos puntos donde ya se manda cada mail — nuevas
  funciones `crearNotificacion()` / `crearNotificacionesAdmin()` en `src/lib/notificaciones.ts`,
  llamadas desde `notificarCambioEstado()`, `notificarNuevaSolicitud()` y `notificarConformidad()`
  (mismo punto único de siempre) y desde `contacto.astro`/`reclamos.astro` (nueva función
  `notificarMensajeAdmin()`, sin `solicitud_id` porque no hay una solicitud asociada).
- **Tiempo real vía Supabase Realtime**: `NotificacionesBell.tsx` (nuevo) se suscribe a inserts en
  `notificaciones` filtrados por su propio `usuario_id` — apenas se inserta una fila, aparece en la
  campanita sin recargar ni hacer polling. La policy RLS de `SELECT` (`usuario_id = auth.uid()`) es
  la que Supabase usa también para filtrar qué le llega a cada conexión, así que es obligatoria
  para que Realtime funcione, no solo para el listado normal.
- Campanita sumada al `Navbar` (desktop y mobile), visible para los 3 roles logueados. Contador de
  no leídas, dropdown con las últimas 20, botón "Marcar todas como leídas". Click en una
  notificación con `solicitud_id` → marca como leída y navega a la vista de detalle
  correspondiente a su rol (`/dashboard/{cliente|tecnico|admin}/solicitud/[id]`); las de
  contacto/reclamo (sin `solicitud_id`) solo se marcan como leídas.
- Marcar como leída pasa por `POST /api/notificaciones/marcar-leida` (patrón ya establecido:
  mutaciones del cliente van por API route con `service_role`, no directo desde el browser) — el
  "marcar todas" también funciona ahí mismo.
- No sincroniza entre pestañas del mismo usuario (si marcás como leída en una pestaña, la otra no
  se entera hasta que la recargués) — no hacía falta para este caso de uso, se puede sumar después
  si molesta en el uso real.

**Bug encontrado y arreglado al probar (2026-07-28):** el `Navbar` renderiza la campanita **dos
veces** (versión desktop + versión mobile) — Tailwind solo oculta la que no corresponde con CSS
(`hidden`/`md:hidden`), las dos quedan montadas en React al mismo tiempo. Como las dos usaban el
mismo nombre de canal de Realtime (`notificaciones-{userId}`), la segunda instancia chocaba contra
la primera ya suscripta (`Uncaught Error: cannot add postgres_changes callbacks... after
subscribe()`), rompiendo el Navbar entero. Arreglado agregando `useId()` de React al nombre del
canal (`notificaciones-{userId}-{instanceId}`) para que cada instancia tenga su propio canal.

**Extensión — "Mis solicitudes" del cliente también en tiempo real (pedido de Jota, 2026-07-28):**
`MisSolicitudes.tsx` (la lista paginada del panel del cliente) ahora también se suscribe a
`postgres_changes` en `solicitudes` filtrado por `cliente_id`. Ante cualquier cambio (nueva
solicitud, cambio de estado, técnico asignado, etc.) re-trae la página actual sola, sin recargar
— refetch de la página completa vía la misma API de paginado, no un merge campo a campo, porque el
payload de Realtime trae columnas crudas sin los joins (técnico, categoría) que la lista necesita
para mostrarse bien. **No se tocaron** las tarjetitas de arriba (Pendientes/En curso/Completadas,
en `cliente.astro`) ni los paneles de técnico/admin — quedan para una extensión aparte si hace
falta, esto se hizo acotado a un solo componente para probarlo primero.

**SQL adicional para esto** (además del bloque de notificaciones de más abajo):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE solicitudes;
```
La política RLS de `solicitudes` para que el cliente vea las suyas **ya existe** desde el
principio del proyecto (`supabase/rls_policies.sql`, "solicitudes: cliente ve las suyas") — no
hace falta agregar nada de RLS nuevo, solo esa línea de `ALTER PUBLICATION`.

**Extensión 2 — replicado al resto de las pantallas (pedido de Jota, 2026-07-28):** después de
confirmar que "Mis solicitudes" funcionaba bien, se replicó el mismo espíritu (vivo, sin recargar)
al resto de las vistas que muestran datos de una solicitud, con dos patrones distintos según el
tipo de pantalla:

- **Componente `CambiosEnVivo.tsx`** — banner chico ("🔄 Hay cambios nuevos — Actualizar"), y
  ahora con una prop `autoReload` (default `false`): si se pasa, en vez de esperar el click
  **recarga sola a los 2.5s** — sumado a pedido de Jota ("no me gusta el botón, quiero que se
  actualice donde corresponda"). Se usa `autoReload` en las 3 pantallas de detalle (cliente,
  técnico, admin) y en el aviso de aprobación del técnico — son pantallas donde el riesgo de
  interrumpir un formulario a medio llenar es bajo/aceptable. Reusable — recibe una lista de
  `{tabla, filtro}` a escuchar. Sumado a:
  - `/dashboard/cliente/solicitud/[id].astro` — escucha esa solicitud puntual, `autoReload`.
  - `/dashboard/tecnico/solicitud/[id].astro` — ídem, `autoReload`.
  - `/dashboard/admin/solicitud/[id].astro` — ídem, `autoReload`.
  - `/dashboard/tecnico.astro` — solo para su propia fila en `tecnicos` (`id=eq.{id}`, cuando el
    admin lo aprueba), `autoReload`. Las solicitudes del técnico **ya no** usan este banner — ver
    el punto siguiente, ahí se resolvió con datos en vivo de verdad, no con un aviso para refrescar.
- **`SolicitudesTecnico.tsx`** (nuevo) — la lista "Solicitudes recibidas" del panel del técnico
  dejó de ser Astro estático y pasó a ser un componente React con el mismo patrón que
  `MisSolicitudes.tsx`/`TablaSolicitudesAdmin.tsx`: se suscribe a `solicitudes` filtrado por
  `tecnico_id` y, ante cualquier cambio (trabajo nuevo asignado, cambio de estado, cierre,
  conformidad), se re-trae sola vía la API nueva `GET /api/tecnico/solicitudes` — sin banner, sin
  click, sin recargar la página. Indicador chico "● En vivo" que se activa cuando sincroniza por
  primera vez.
- **`TablaSolicitudesAdmin.tsx`** (la tabla principal del dashboard del admin) — mismo patrón que
  `MisSolicitudes.tsx`: refetch silencioso de la página actual ante cualquier cambio en
  `solicitudes` (sin filtro, porque el admin ve todas). Indicador visual chico (punto verde) junto
  al conteo de resultados cuando ya sincronizó al menos una vez.
- **Bug real encontrado y arreglado al probar:** al asignarle un trabajo nuevo a un técnico, no le
  llegaba nada — ni mail, ni notificación in-app, ni el banner. La causa **no era de Realtime**:
  `AVISAR_TECNICO` en `notificaciones.ts` (la lista de estados que le avisan al técnico) nunca
  incluyó `"aceptada"`, solo `"cancelada"` — hueco del diseño original, de antes de esta sesión.
  Arreglado agregando `"aceptada"` a esa lista. **Cambio de comportamiento a tener en cuenta:** el
  técnico ahora también recibe mail (no solo notificación in-app) cuando le asignan un trabajo
  nuevo, cosa que antes no pasaba.
- **Lo que quedó afuera a propósito:** las tarjetitas de stats (`admin.astro` arriba de la tabla,
  y las de `cliente.astro`/`tecnico.astro`) y la lista de "técnicos pendientes de aprobación" del
  admin siguen siendo estáticas (se actualizan solo al recargar) — no se pidieron puntualmente y
  cada una implicaría convertir más código de Astro server-rendered a React con estado. Se pueden
  sumar después si hace falta, siguiendo el mismo patrón ya probado acá.

**✅ Confirmado con Jota al probar (2026-07-28):** la campanita funcionó perfecto (notificación de
"Aceptada" en tiempo real), pero la lista `SolicitudesTecnico.tsx` **no** se actualizaba sola.
Causa confirmada: la policy RLS `"solicitudes: tecnico ve las suyas"` usa un `EXISTS` contra
`tecnicos` (no una comparación directa de columna) para resolver de quién es la solicitud, y ese
tipo de policy con join **no le llega a Supabase Realtime** — el dato en sí es correcto para
queries normales, pero Realtime nunca entrega el evento. La política de `notificaciones`
(`usuario_id = auth.uid()`, comparación directa) sí funciona.

**Fix aplicado:** en vez de arriesgar tocar la policy de `solicitudes` (toca lecturas normales,
más superficie de riesgo), `SolicitudesTecnico.tsx` ahora escucha inserts en **`notificaciones`**
como disparador de refresco, no `solicitudes` directo — reusa el canal ya probado y funcionando.
Para que esto cubra todos los casos, se extendió `AVISAR_TECNICO` a los 4 estados
(`aceptada`, `en_curso`, `completada`, `cancelada` — antes solo `aceptada`/`cancelada`), así el
técnico siempre tiene una notificación disparando el refresco de su lista sin importar qué cambió.

**Segundo hallazgo (orden de la lista):** las listas ordenaban por `creado_en` (fecha en que el
*cliente* creó la solicitud), no por la última vez que algo cambió — por eso una solicitud vieja
recién asignada no subía al principio. Se agregó una columna `actualizado_en`, que se pisa en cada
escritura real sobre una solicitud (cambio de estado, asignación, cierre del técnico,
conformidad), y las 3 listas (cliente, técnico, admin) ahora ordenan por ahí en vez de por
`creado_en`.

**SQL adicional para esta extensión:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE tecnicos;

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS actualizado_en timestamptz DEFAULT now();
UPDATE solicitudes SET actualizado_en = creado_en WHERE actualizado_en IS NULL;
```
(La segunda línea es el backfill — sin ella, las solicitudes viejas quedarían todas con la misma
fecha "de ahora" en vez de su fecha real, y se irían todas juntas al principio del listado.)

La política RLS de `tecnicos` para que el técnico vea su propia fila **ya existe** ("tecnicos:
tecnico ve el suyo", `usuario_id = auth.uid()`) y la de admin también — no hace falta RLS nueva
para nada de esto.

**Falta probar (checklist para retomar):**
- [ ] Correr el SQL de arriba (columna `actualizado_en` + backfill; `ALTER PUBLICATION` de
      `tecnicos` puede tirar "ya existe", es esperado).
- [ ] Como técnico: dejar `/dashboard/tecnico` abierto, y desde el admin asignarle una solicitud
      → tiene que aparecer sola **arriba de todo** en la lista, sin recargar, con "● En vivo".
- [ ] Como técnico: que le asignen una solicitud **vieja** (creada hace tiempo, recién asignada
      ahora) → tiene que subir arriba de todo igual, no quedar por fecha de creación.
- [ ] Repetir con cambios de estado (en curso, completada, cancelada) → la lista del técnico se
      reordena sola en cada uno.
- [ ] Panel cliente: mismo chequeo de orden — una solicitud vieja que cambia de estado tiene que
      subir al principio de "Mis solicitudes".
- [ ] Panel admin: mismo chequeo en la tabla principal.
- [ ] Como técnico recién registrado (con `activo = false`): dejar `/dashboard/tecnico` abierto, y
      desde el admin aprobarlo → banner "actualizando..." y recarga sola a los ~2.5s.
- [ ] Como cliente/técnico/admin: dejar el **detalle** de una solicitud abierto, y desde otro lado
      cambiarle el estado → banner "actualizando..." y recarga sola a los ~2.5s con los datos
      nuevos.
- [ ] Confirmar que nada de esto rompió el flujo normal (crear, cancelar, asignar, completar,
      dar conformidad, "Completar trabajo" desde la lista del técnico) — debería seguir
      funcionando exactamente igual que antes de esta sesión.

**Falta probar (checklist original, Frente 4):**
- [x] Correr el SQL de abajo en Supabase (tabla + RLS + habilitar Realtime).
- [ ] Como cliente: crear una solicitud nueva → tiene que aparecer la notificación en la campanita
      **sin recargar la página** (dejar la pestaña abierta, hacer la acción desde otra
      pestaña/usuario, y ver que aparece sola).
- [ ] Como admin: asignar un técnico a esa solicitud → notificación de "Aceptada" le debe aparecer
      al cliente en tiempo real; abrir la solicitud como cliente y confirmar que el link de la
      notificación lleva al lugar correcto.
- [ ] Cancelar una solicitud con técnico asignado → notificación le debe llegar en tiempo real
      tanto al cliente como al técnico.
- [ ] Dar conformidad como cliente → notificación en tiempo real a técnico y a **todos** los admin
      (si hay más de un usuario admin, probar con dos).
- [ ] Enviar el formulario de `/contacto` y de `/reclamos` → notificación al admin, sin
      `solicitud_id` (no debe navegar a ningún lado al hacer click, solo marcarse como leída).
- [ ] Marcar una notificación como leída (click) y "Marcar todas como leídas" → confirmar que el
      contador de la campanita baja correctamente y que persiste al recargar la página.
- [ ] Confirmar que un usuario **no** ve notificaciones de otro (por las dudas, revisar en la
      pestaña Network que la suscripción de Realtime solo trae las propias).

---

## Confirmación del técnico + fix definitivo de Realtime + estilo de emails — sesión 2026-07-29

**✅ Implementado, probado en local por Jota y pusheado.**

### 1. Nuevo estado "asignada" — el técnico confirma o rechaza el trabajo

**Pedido de Agustín:** que asignar un técnico no lo comprometa automáticamente — tiene que poder
aceptar o rechazar el trabajo antes de que la solicitud pase a "Aceptada" de verdad.

**Flujo nuevo:** `pendiente` → (admin asigna técnico) → **`asignada`** (esperando que el técnico
responda) → el técnico **acepta** → `aceptada` (igual que antes: mail al cliente con horario
confirmado, bloquea la agenda) — o **rechaza** → vuelve a `pendiente` y se desasigna, reutilizando
el aviso al admin que ya existía para "solicitud volvió a pendiente".

- `tecnico_id` se asigna igual que antes, pero ya no dispara `aceptada` directo — dispara
  `asignada`, y le llega un mail + notificación in-app al técnico ("Nuevo trabajo asignado,
  confirmalo o rechazalo"). El cliente **no** se entera todavía en este paso.
- Nuevo endpoint `POST /api/tecnico/responder-asignacion` (`{ solicitudId, accion: 'aceptar' |
  'rechazar' }`), nuevo componente `ResponderAsignacion.tsx` (botones en la lista y en el detalle
  del técnico).
- **Vista del cliente sin cambios visuales:** mientras el estado es `asignada`, el cliente ve
  exactamente lo mismo que en `pendiente` (mismo badge, no se muestra el técnico todavía) — decisión
  tomada con Jota para no mostrar un estado a medio confirmar. Recién en `aceptada` ve el cambio real.
- El admin no puede reasignar mientras espera respuesta (el formulario de asignar solo aparece
  cuando no hay técnico asignado) y el dropdown manual de "Cambiar estado" no deja saltar a
  `aceptada`/`en_curso`/`completada` sin que el técnico haya confirmado al menos una vez.
- Si el admin desasigna manualmente (vuelve a "Pendiente" con un técnico ya confirmado), ahora se
  le avisa al técnico afectado (`notificarDesasignacion()`, nueva función) — antes no se enteraba
  de nada y su lista quedaba mostrando un trabajo que ya no era suyo hasta recargar.
- `disponibilidad.ts` ya traía `'asignada'` contemplado en los estados que ocupan la agenda del
  técnico desde antes (quedó preparado sin usarse) y la policy RLS `"solicitudes: tecnico actualiza
  estado"` ya mencionaba "aceptar/rechazar" en su comentario — este flujo ya estaba parcialmente
  previsto en el diseño original, solo faltaba conectarlo.

**⚠️ SQL obligatorio (ya corrido por Jota, dejar documentado):** la columna `estado` tenía un
`CHECK constraint` que no incluía `'asignada'` — sin este paso, asignar un técnico fallaba en
silencio (el técnico quedaba asignado pero el estado no cambiaba, sin mail ni notificación, sin
error visible para el admin). Si se clona el proyecto en otro entorno, correr:

```sql
ALTER TABLE solicitudes DROP CONSTRAINT solicitudes_estado_check;
ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_estado_check
  CHECK (estado = ANY (ARRAY['pendiente'::text, 'asignada'::text, 'aceptada'::text, 'en_curso'::text, 'completada'::text, 'cancelada'::text]));
```

No es aditivo en el sentido estricto (se borra y recrea el constraint), pero es seguro: solo amplía
los valores permitidos, no toca ninguna fila existente.

### 2. Fix definitivo — "Mis solicitudes" del cliente no se actualizaba en tiempo real

Extiende el hallazgo de la sesión anterior (técnico). Se confirmó con Jota, probando en limpio
(consola sin errores, suscripción en estado `SUBSCRIBED`, tabla `solicitudes` sí está en la
publicación de Realtime, permisos y `REPLICA IDENTITY` iguales a `notificaciones` que sí funciona)
que el problema **no es exclusivo de policies con JOIN afectando solo al rol dueño de esa policy**:
la tabla `solicitudes` tiene, además de la policy simple del cliente, las de técnico y admin que
hacen `EXISTS`/JOIN contra otras tablas — y alcanza con que **una sola** policy de la tabla use
JOIN para que Supabase Realtime deje de entregar eventos de esa tabla **a nadie**, ni siquiera a
roles cuya propia policy es simple. Queda actualizado el hallazgo en
`docs/guia-notificaciones-realtime-supabase.md` con esto.

**Fix aplicado (mismo patrón ya probado con el técnico):** `MisSolicitudes.tsx` dejó de escuchar
`solicitudes` directo y ahora escucha inserts en `notificaciones` (policy simple, sin JOIN) como
disparador de refresco. Para que cubra todos los casos relevantes del cliente, se agregó
`'pendiente'` a `AVISAR_CLIENTE` en `notificaciones.ts` — con una excepción: si el `'pendiente'`
viene de un **rechazo del técnico sobre una asignación todavía no confirmada**, no se le avisa al
cliente (nunca llegó a enterarse de que se le había asignado alguien, así que no corresponde
decirle que "volvió" a pendiente). Esto se resuelve con un parámetro nuevo y opcional
`estadoAnterior` en `notificarCambioEstado()` — los demás llamados no lo pasan, así que su
comportamiento no cambió.

**Pendiente de verificar (no confirmado en esta sesión, mismo tipo de policy con JOIN):**
`TablaSolicitudesAdmin.tsx` sigue escuchando `solicitudes` directo sin filtro — por la misma causa
raíz, es probable que tampoco reciba eventos en tiempo real. No reportado como roto todavía por
nadie; si se confirma, el fix sería análogo (escuchar `notificaciones`), pero ahí el admin no tiene
hoy una notificación para *todos* los eventos relevantes (solo nueva solicitud, conformidad, y
vuelta a pendiente) — habría que ampliar qué le llega antes de poder usarlo como disparador
confiable.

### 3. Estilo de marca en los emails

Pedido de Agustín: que los mails salgan con el logo y la identidad visual de Taita, no en texto
plano. Se resolvió en **un solo lugar** (`src/lib/email.ts`, función `plantillaEmail()`) que envuelve
el contenido de cada mail con header (logo + "Taita Soluciones" sobre fondo verde), fondo crema, y
footer — así ningún llamado a `enviarEmail()` en el resto del código necesitó tocarse. Layout con
tablas (no flex/grid) por compatibilidad con clientes de correo como Outlook.

- El logo (`public/images/taita-avatar.webp`) se referencia con la **URL fija de producción**
  (`https://taitasoluciones.com.ar/...`), no con `PUBLIC_SITE_URL` — ese último apunta a
  `localhost:4321` en el `.env` local (a propósito, para que los links internos funcionen en
  pruebas), y un cliente de correo externo no puede alcanzar `localhost` para mostrar la imagen.
- Se sacaron los links "Ver el detalle en tu panel" / "Ver en mi panel" de los mails de cambio de
  estado (quedan como texto simple) — encontrado por Jota que ese link llevaba siempre a
  `/dashboard/cliente` o `/dashboard/tecnico` genérico, sin importar qué sesión estuviera activa en
  el navegador donde se abriera, lo que podía llevar a una pantalla inconsistente (ej. abrir el
  link de un mail de cliente estando logueado como técnico). Se sacó la constante `SITE_URL` de
  `notificaciones.ts`, que quedó sin uso.
- **Pendiente, de baja prioridad, no es código:** el avatar que Gmail muestra al lado del
  remitente en la bandeja de entrada (distinto del logo de adentro del mail) requeriría Gravatar
  (simple, no garantizado en Gmail) o BIMI (requiere DNS + probablemente certificado VMC pago).
  Queda anotado, sin encarar por ahora.

---

## SEO — sitemap, robots.txt, Open Graph y datos estructurados — sesión 2026-07-30

**✅ Implementado y probado en local (`/robots.txt` y `/sitemap.xml` cargan bien). Pendiente de
probar en producción después del deploy.**

**Objetivo:** que el sitio indexe más rápido en Google y se vea mejor al compartirse por WhatsApp,
aprovechando que todavía está en etapa de prueba para "ganar terreno" antes del lanzamiento
público. Los 3 cambios son 100% aditivos — no tocan lógica ni UI existente, solo agregan archivos
nuevos y tags de `<head>`/`<script>` que el usuario final ni nota.

- **`public/robots.txt`** (nuevo) — permite todo, bloquea `/dashboard/*` y `/api/*` (privado, sin
  valor de indexación), apunta al sitemap.
- **`src/pages/sitemap.xml.ts`** (nuevo) — endpoint propio, no el plugin genérico
  `@astrojs/sitemap`. El sitio corre en modo SSR (`output: 'server'`), y ese plugin solo lista
  rutas estáticas conocidas en build time — no se entera de las páginas dinámicas (un perfil por
  técnico). El endpoint propio consulta los técnicos activos en cada request, así el sitemap
  siempre está al día sin depender de un redeploy cuando se suma o desactiva un técnico.
- **`astro.config.mjs`** — agregado `site: 'https://taitasoluciones.com.ar'` (Astro lo necesita
  para resolver URLs absolutas en el canonical/Open Graph).
- **`src/layouts/Layout.astro`** — nuevo prop opcional `image` (default `taita-avatar.webp`),
  agregado `<link rel="canonical">` + tags de Open Graph y Twitter Card. Todas las páginas que ya
  pasaban `title`/`description` siguen funcionando igual, sin cambios de código en ellas.
- **`src/pages/tecnicos/[id].astro`** — JSON-LD (`Service` + `Person` + `AggregateRating` cuando
  ya tiene servicios calificados), y la foto del técnico como imagen de Open Graph si tiene (si no,
  cae al avatar de Taita por default).
- **`src/pages/index.astro`** — JSON-LD `Organization`.

**Beneficios (para referencia futura, no todos son medibles de inmediato):**
- Sitemap → indexación más rápida (Google no tiene que descubrir las páginas solo siguiendo links).
- Open Graph/Twitter → vista previa con título/descripción/imagen al compartir un link por
  WhatsApp — antes probablemente no generaba ninguna preview.
- JSON-LD → Google puede llegar a mostrar la calificación con estrellitas directo en el resultado
  de búsqueda de cada técnico, lo que históricamente mejora el click-through.

**Pendiente, externo, no es código:** dar de alta el sitio en **Google Search Console** (verificar
dominio + enviar el sitemap manualmente para no esperar el rastreo orgánico) — Jota lo revisa
aparte.

---

## Feedback de Agustín (PDF) — 8 correcciones — sesión 2026-07-30

**✅ Implementado. Falta probar en local antes de dar por cerrado cada punto.** Fuente:
`TAITA_ERRORES.pdf` (capturas + texto de Agustín). Se investigó la causa raíz de cada uno antes de
tocar código — varios eran bugs reales, no solo pedidos de UI.

1. **Ícono de la campanita** — reemplazado el SVG de campana (parecido a Facebook) por uno de
   engranaje/herramienta, en `NotificacionesBell.tsx`.

2. **Admin necesita más datos del técnico antes de aprobar** — la tarjeta de "Técnicos pendientes
   de aprobación" (`admin.astro`) solo mostraba nombre/especialidad/zona. Ahora también muestra
   email, teléfono, CVU/CBU y descripción (todo lo que ya se pedía al registrarse pero no se
   mostraba). **No se agregó DNI** — Agustín no lo pidió en el PDF, queda pendiente si lo pide más
   adelante (requeriría columna nueva + campo obligatorio en el registro).

3. **Eliminar usuarios** — nueva acción `eliminar-usuario` en `api/admin/usuario.ts`, con botón +
   confirmación inline en `GestionUsuarios.tsx` (`/dashboard/admin/usuarios`), tanto para clientes
   como técnicos. **Bloqueada si el usuario tiene historial real** (solicitudes, reseñas, o
   cualquier cambio de estado que haya disparado, vía `solicitud_historial_estados.cambiado_por`)
   — en ese caso se sugiere desactivar en su lugar (ya existe para técnicos vía `activo`; para
   clientes con historial no hay equivalente de "deshabilitar" todavía, solo se bloquea el borrado
   con un mensaje claro). Si no tiene historial: borra `tecnicos` (si aplica) → `usuarios` →
   usuario de Supabase Auth, en ese orden.

4. **Categoría nueva no le aparece al técnico/admin (causa raíz encontrada)** — el registro de
   técnico identificaba las especialidades por **nombre** de categoría, no por `id`. Si un nombre
   no calzaba exacto en el momento de guardar (por ejemplo, si se editó el nombre de una categoría
   existente después de que la página de registro ya estaba cargada), la especialidad se perdía
   **en silencio**, sin error — el técnico quedaba sin esa categoría y ni él ni el admin la veían.
   Corregido de punta a punta para usar `id` (como ya hacía el resto de la app):
   `registro.astro` (trae `id, nombre` en vez de solo `nombre`, y filtra `activa = true`),
   `RegistroForm.tsx` (especialidades y subcategorías ahora se manejan por `id`), y
   `api/registro-tecnico.ts` (matchea por `id`, no por `nombre`). `GestionEspecialidades.tsx`
   (agregar especialidad después del registro, desde el panel del técnico) ya usaba `id`
   correctamente — no tenía este bug.

5. **Cliente ve "Pendiente" duplicado con fechas distintas** — confirmado: es un efecto colateral
   de la extensión reciente del flujo "asignada" (2026-07-29). Ese estado intermedio queda
   registrado en el historial real de la solicitud, y como al cliente se le muestra igual que
   "Pendiente" (a propósito, no debe enterarse de la asignación sin confirmar), el timeline le
   terminaba mostrando dos líneas de "Pendiente" con horarios distintos. Arreglado filtrando las
   entradas de `asignada` del timeline que ve el cliente (`dashboard/cliente/solicitud/[id].astro`)
   — técnico y admin siguen viendo su timeline real, sin cambios.

6. **Cliente ve el teléfono del técnico / le falta info** — sacado el teléfono (privacidad — el
   contacto pasa por la plataforma). Se agregó foto de perfil, calificación, descripción y chips de
   especialidades del técnico asignado. Para las reseñas, en vez de duplicar esa lógica ahí, se
   agregó un link "Ver perfil completo y reseñas →" al perfil público del técnico (que ya las
   muestra).

7. **Admin no recibe aviso de trabajo terminado** — sumado un bloque de notificación (mail +
   in-app) al admin cuando una solicitud pasa a `completada`, en el mismo punto único de
   `notificarCambioEstado()` donde ya se notifican los demás cambios — cubre tanto cuando lo
   completa el técnico como cuando lo cambia el admin a mano.

8. **Técnico no recibía el costo de los materiales (bug de plata real)** — el más importante.
   Cuando el técnico cargaba gastos extra (materiales), el cliente sí los pagaba, pero las
   pantallas de "Vas a recibir" (técnico) y "Técnico recibe" / "Plataforma retiene" (admin) solo
   calculaban con el precio base — la plataforma se estaba quedando de más con el valor de los
   materiales, en vez de que ese monto pasara íntegro al técnico. Corregido en
   `dashboard/tecnico/solicitud/[id].astro` y `dashboard/admin/solicitud/[id].astro`: el técnico
   ahora recibe precio base + gastos extra, y la plataforma retiene solo su comisión (%) real.
   **No afecta pagos ya procesados** — es una corrección de cómo se calcula/muestra, no de datos
   ya guardados.

**Falta probar (checklist):**
- [ ] Campanita: confirmar que se ve el ícono nuevo en las 3 vistas (desktop/mobile).
- [ ] Aprobar un técnico pendiente → confirmar que se ven email/teléfono/CVU/descripción antes de aprobar.
- [ ] Eliminar un cliente/técnico sin historial → se borra y no puede volver a loguearse.
- [ ] Intentar eliminar uno **con** historial → debe bloquear con el mensaje claro.
- [ ] Crear una categoría nueva → que un técnico la pueda elegir al registrarse y que quede guardada (chequear en el admin que aparece la especialidad).
- [ ] Editar el nombre de una categoría existente → confirmar que ya no rompe nada para técnicos que se registren después.
- [ ] Flujo completo asignar → confirmar como técnico → revisar que el cliente ve **una sola** línea de "Pendiente" en el timeline.
- [ ] Panel cliente, solicitud con técnico asignado → confirmar que no se ve el teléfono, y que sí se ve foto/descripción/especialidades + el link al perfil.
- [ ] Como técnico, completar un trabajo → confirmar que el admin recibe la notificación.
- [ ] Completar un trabajo con gastos extra → confirmar en pantalla de técnico y de admin que "vas a recibir"/"técnico recibe" incluye el precio base **más** los gastos extra, y que "plataforma retiene" es solo la comisión.

---

## Categorías destacadas en la home + página "Ver más" — sesión 2026-07-31

**✅ Implementado. Falta correr el SQL en Supabase y probar antes de dar por cerrado.**

**Motivo:** la sección de categorías de la página principal traía las categorías con
`.order('nombre').limit(9)` — ya con más de 9 categorías activas, algunas quedaban **ocultas en
silencio** en el index (las últimas en orden alfabético), sin ninguna forma de elegir cuáles se
mostraban ni de ver el resto. Encontrado a partir de un caso real reportado por Jota/Agustín
("agregué una categoría y no aparece en la principal").

**Cómo quedó, acordado con Agustín:**
- Nueva columna `categorias.destacada` (boolean) — el admin elige manualmente cuáles categorías
  aparecen en la home, con un **tope de 9** (se bloquea del lado del servidor si se intenta marcar
  una décima, no solo del lado visual).
- Nuevo botón "☆ Destacar" / "⭐ Destacada" en `/dashboard/admin/categorias`, junto a
  Activar/Desactivar. El encabezado de esa pantalla muestra un contador `X/9 destacadas`.
- La home (`index.astro`) ahora filtra `activa = true AND destacada = true` (antes solo `activa`
  + límite fijo).
- Nueva página pública **`/categorias`** — lista **todas** las categorías activas (no solo las
  destacadas), mismo estilo de tarjeta que la home. Sumada al `sitemap.xml`.
- Nuevo botón "Ver más categorías →" al final de la sección de categorías en la home, con el
  estilo de marca (píldora verde), que lleva a `/categorias`.
- **El click en cada categoría no cambió** — sigue llevando directo a `/solicitud?categoria=id`,
  tanto en la home como en `/categorias` (decisión explícita: no se agregó ningún modal ni
  selector de subitems por ahora, se evaluó y se descartó para esta vuelta).

**SQL a correr en Supabase (aditivo, no rompe nada existente):**

```sql
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS destacada boolean NOT NULL DEFAULT false;
```

**Importante:** como el default es `false`, después de correr esto **ninguna categoría va a
aparecer en la home** hasta que el admin entre a `/dashboard/admin/categorias` y marque manualmente
cuáles quiere destacar (hasta 9). Avisarle a Agustín de este paso antes de que se extrañe de ver la
sección de categorías vacía en la home.

**Falta probar:**
- [ ] Correr el SQL de arriba.
- [ ] Marcar 2-3 categorías como destacadas desde el admin → confirmar que aparecen en la home y
      el resto no.
- [ ] Intentar destacar una 10ma → debe bloquear con el mensaje de tope alcanzado.
- [ ] Desmarcar una destacada → confirmar que desaparece de la home.
- [ ] Entrar a `/categorias` → deben verse todas las categorías activas (destacadas o no).
- [ ] Click en una categoría, tanto desde la home como desde `/categorias` → debe seguir llevando
      igual que siempre a `/solicitud?categoria=id`.
- [ ] Confirmar que `/categorias` aparece en `/sitemap.xml`.

---

## Fix de husos horarios + fecha del admin — sesión 2026-07-31

**✅ Implementado. Falta probar en producción (en local casi no se nota, ver por qué abajo).**

**Causa raíz:** todas las fechas/horas "reales" de la app (`creado_en`, `actualizado_en`,
`conformidad_en`, fecha de reseñas, fecha de notificaciones, fecha del recibo de pago) se
formateaban con `.toLocaleString('es-AR', {...})` o `.toLocaleDateString('es-AR', {...})` **sin
especificar el huso horario** — en ese caso, JavaScript usa el huso horario de la máquina donde
corre el código. En tu PC (huso Argentina) esto nunca se nota, pero en producción el código corre
en el servidor de Vercel (confirmado que la base está en Oregon, EE.UU.), así que esas fechas se
mostraban con **la hora del servidor, no la de Argentina** — encontrado por Jota con un caso real
(conformidad marcada a la 1am ARG, mostrada como las 4am).

**Nota importante — esto NO afecta a `fecha_solicitada`** (la fecha que el cliente elige para el
servicio): esa ya se guarda como medianoche UTC a propósito y se muestra forzando
`timeZone: 'UTC'` en todos lados desde la Tanda 3, para que nunca se corra un día — ese patrón
sigue igual, no se tocó.

**Arreglado:** se agregó `timeZone: 'America/Argentina/Buenos_Aires'` explícito a los 13 lugares
que formateaban un instante real sin especificar huso:
- Timeline de seguimiento (cliente y técnico) y "Creada el" (cliente, técnico y admin)
- Fecha de conformidad del cliente (la que reportó Jota)
- Campanita de notificaciones (los 3 roles)
- Fecha de registro en Gestión de usuarios y en el panel admin
- Fecha de reseñas en el perfil público del técnico
- Fallback de fecha en las listas de "Mis solicitudes" (cliente) y "Solicitudes recibidas" (técnico)
- Fecha de pago en el recibo PDF

**Además, columna "Fecha" del admin corregida:** `TablaSolicitudesAdmin.tsx` mostraba
`creado_en` (fecha en que el cliente hizo el pedido) — ahora muestra `fecha_solicitada` (fecha en
que se va a realizar el servicio), que es lo que Agustín necesita ver de un vistazo. Se renombró
el encabezado de la columna a "Fecha del servicio" para que quede claro. Si una solicitud no
tuviera `fecha_solicitada` cargada (no debería pasar, es obligatoria al crear), cae de respaldo a
`creado_en` en hora de Argentina.

**Falta probar:**
- [ ] En producción: revisar el timeline de una solicitud, la campanita, y la conformidad del
      cliente → todas las horas deben coincidir con la hora real de Argentina al momento del hecho.
- [ ] Panel admin, tabla principal → la columna ahora dice "Fecha del servicio" y muestra la fecha
      elegida por el cliente, no la de creación.
- [ ] Descargar un recibo de pago → la fecha de pago debe estar en hora de Argentina.

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

### Tanda 3 — Horarios y solapamiento (⚠️ semántica cambiada el 2026-07-24, ver más abajo)
Para que se note el conflicto hace falta que el técnico ya tenga **una solicitud en estado
"Aceptada"** en ese horario (mientras está en "Pendiente" no cuenta como agenda ocupada todavía).

1. Como cliente: entrar al perfil de un técnico puntual → "Solicitar servicio" → completar el
   formulario **incluyendo el horario nuevo** (selector de franjas de 30') → enviar.
2. Como admin: entrar al detalle de esa solicitud y cambiar el estado a **"Aceptada"** (ya tiene
   técnico asignado, así que el dropdown lo permite).
3. Como cliente de nuevo: pedirle **al mismo técnico**, **la misma fecha** y **la misma hora exacta**
   que la solicitud del paso 1 (ej. si la primera es a las 10:00, volver a probar con 10:00) →
   al enviar tiene que aparecer un aviso ámbar de conflicto con un horario sugerido, y no debería
   crearse la solicitud hasta que elijas otro horario (o uses el sugerido). Un horario distinto
   aunque sea cercano (ej. 10:30) **ya no choca** — ver nota de la Tanda "Sacar horas estimadas".
4. Para probar el lado del admin: crear una solicitud en el **flujo libre** (sin elegir técnico,
   desde `/solicitud` sin venir de un perfil) a esa misma hora exacta, y en su detalle intentar
   asignarle el técnico que ya quedó ocupado en el paso 2 → debería aparecer el mismo aviso con el
   botón "Asignar igual" (por si el admin quiere forzarlo a propósito).

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
| Campo de hora + validación de solapamiento de horarios | ✅ Operativo — semántica cambiada 2026-07-24 (choque por hora exacta, ver abajo), falta probar |
| "Horas estimadas" del servicio | ❌ Sacado de la app (2026-07-24, a pedido de Agustín) |
| Cambio automático Aceptada → En curso (cron) | ✅ Operativo (Tanda 4) — falta configurar el cron externo (ver abajo) |
| Cambio automático En curso → Completada (cron) | ⏸️ Pausado (2026-07-24) — dependía de "horas estimadas"; el paso a Completada ahora es manual |
| Cancelación con confirmación inline | ✅ Operativo (Tanda 4) |
| Timeline de estados para el cliente | ✅ Operativo y probado (Tanda 5) |
| Conformidad del cliente + registro de pago (sin cobro real) | ✅ Operativo y probado (Tanda 6) |
| Notificaciones in-app en tiempo real (campanita) | ✅ Operativo y probado (2026-07-28/29) |
| Confirmación del técnico (asignada → aceptada/rechazo) | ✅ Operativo y probado (2026-07-29) |
| Estilo de marca (logo + colores) en los emails | ✅ Operativo (2026-07-29) |
| Integración Mercado Pago (Fase 1 — link de pago) | 🟢 Implementada y probada en local (2026-07-29) — falta probar en el dominio real con credenciales de prueba |

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
- [x] **Sacar "horas estimadas"** — a pedido de Agustín (2026-07-24): los trabajos no se van a medir
      por horas (van a usar m² u otra métrica a definir más adelante), así que se sacó el concepto
      de la app. **Falta probar** (ver checklist en `PRUEBAS_PENDIENTES.md`).
      - Se sacó el campo del formulario de solicitud (`FormSolicitud.tsx`) y el renglón de
        "Horas estimadas" de las vistas de detalle (admin y cliente).
      - La columna `solicitudes.horas_estimadas` **no se borró** de la base (evita un cambio
        destructivo) — simplemente ya no se pide ni se completa; queda `null` en las solicitudes
        nuevas y sin usar en el resto del código.
      - **Validación de solapamiento de horarios (Tanda 3)** — se simplificó: como ya no hay
        duración de trabajo, el choque de agenda pasa a ser **mismo técnico + misma fecha + misma
        hora exacta** (antes calculaba un rango de solapamiento con las horas estimadas). Dos
        horarios distintos, aunque sean consecutivos (ej. 10:00 y 10:30), ya no chocan entre sí.
        Reescrito en `src/lib/disponibilidad.ts`; sigue sugiriendo el próximo horario libre igual
        que antes. Se mantiene la validación tanto cuando el cliente pide un técnico puntual como
        cuando el admin asigna/reasigna técnico.
      - **Cron de auto-completado (Tanda 4)** — la transición automática **En curso → Completada**
        dependía de "horas estimadas" para saber cuándo terminaba el trabajo, así que **se pausó**
        (queda comentada en `src/pages/api/cron/actualizar-estados.ts`, no se borró, para retomarla
        si más adelante se define una métrica). La transición **Aceptada → En curso** sigue andando
        igual que antes, por fecha/hora de inicio. El paso a "Completada" ahora es siempre manual:
        el técnico lo hace vía "Completar trabajo" (no depende del cron) o el admin lo cambia a mano.
- [ ] **Tanda 7** — Integración Mercado Pago. 🟢 Fase 1 (link de pago tras conformidad)
      implementada y probada de punta a punta en local el 2026-07-29 (preferencia real, pago en
      sandbox, reconciliación, recibo en PDF, notificaciones). Ver `docs/mercadopago-integracion.md`
      para el detalle completo, el checklist de progreso, y qué falta (ampliar estados de
      reembolso/contracargo, cargar credenciales de prueba en Vercel Production, probar con
      Agustín). Fase 2 (split automático al técnico vía OAuth) queda documentada ahí como alcance
      futuro, sin arrancar.

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

> **✅ Hecho (2026-07-25):** dominio migrado a Cloudflare, vinculado a Vercel con SSL, dominio
> verificado en Resend, `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/`PUBLIC_SITE_URL` cargadas en local y
> en Vercel (Production + Preview). Probado en producción: mail de `/contacto` llegó y figura
> "Delivered" en Resend → Logs.

### Cron externo — lo único que falta para producción

El cambio automático **Aceptada → En curso** (`GET /api/cron/actualizar-estados`) ya funciona en
el código y está probado en local. Para que corra solo en producción, sin depender de que alguien
entre a la URL a mano, faltan estos 3 pasos (ninguno toca código):

1. **Generar un secreto** (ej. `openssl rand -hex 32` en una terminal, o cualquier string largo y
   random) y cargarlo como `CRON_SECRET` en Vercel → Settings → Environment Variables (Production).
   Mientras no esté cargado, el endpoint queda sin proteger — no rompe nada porque solo mueve
   estados según fecha/hora real, pero conviene cargarlo antes de depender de esto en el día a día.
2. **Redeploy** en Vercel para que la variable nueva quede activa.
3. **Crear cuenta gratis en [cron-job.org](https://cron-job.org)** y armar un cronjob:
   - URL: `https://taitasoluciones.com.ar/api/cron/actualizar-estados?secret=EL_CRON_SECRET`
     (o header `Authorization: Bearer EL_CRON_SECRET` si el servicio lo soporta — el endpoint
     acepta cualquiera de las dos formas).
   - Método: `GET`.
   - Frecuencia: cada 15 minutos.
   - (El plan Hobby de Vercel no sirve para esto — sus cron jobs nativos corren 1 vez por día.)

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

### Notificaciones in-app en tiempo real

Ejecutar en el SQL Editor de Supabase (aditivo, no rompe nada existente):

```sql
CREATE TABLE IF NOT EXISTS notificaciones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  solicitud_id  uuid REFERENCES solicitudes(id) ON DELETE CASCADE,
  titulo        text NOT NULL,
  mensaje       text,
  leida         boolean NOT NULL DEFAULT false,
  creado_en     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones (usuario_id, creado_en DESC);

-- Habilita Supabase Realtime para esta tabla (necesario para que la campanita reciba los inserts
-- al instante, sin esto no hay tiempo real aunque el resto del código esté bien).
ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;

-- Políticas RLS (idénticas a las de supabase/rls_policies.sql, sección NOTIFICACIONES — quedan
-- también acá para no tener que ir a buscar el archivo).
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notificaciones: usuario ve las suyas"
  ON notificaciones FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "notificaciones: usuario marca las suyas como leidas"
  ON notificaciones FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());
```

**Importante:** la policy de `SELECT` no es opcional acá — es la misma que Supabase Realtime usa
para filtrar qué fila le llega a cada conexión. Sin ella, no hay tiempo real aunque el resto del
código esté bien.

Si `ALTER PUBLICATION` tira error porque la tabla ya está agregada (puede pasar si se corre el
bloque dos veces), es seguro ignorarlo — significa que Realtime ya estaba habilitado.

---

## Reportes de avance previos

- `docs/reporte-cliente-2026-06-10.html` — snapshot de funcionalidades entregadas al 10/06/2026.
- `docs/resumen-cliente-items-1-9.md` — resumen de los primeros 9 ítems del alcance original.
- `docs/sesion-2026-05-28.md` a `docs/sesion-2026-06-09.md` — bitácora técnica sesión a sesión.

Este archivo (`ESTADO_PROYECTO.md`) es la fuente de verdad del estado **actual** del proyecto;
los reportes fechados de arriba quedan como registro histórico de cada entrega.
