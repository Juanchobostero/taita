# Taita Soluciones — Estado del proyecto

> Documento vivo. Se actualiza al cerrar cada tanda de trabajo. Para el detalle de qué falta
> hacer y en qué orden, ver `docs/taita-backlog-tecnico.md` y el plan de tandas más abajo.

**Última actualización:** 2026-08-10 — **Fase 8 implementada de punta a punta**: verificación de
email restrictiva del cliente (Supabase Auth + chequeo de MX, técnico queda con validación de
formato en vivo nomás), franja horaria negociada con confirmación del cliente y reprogramación si
la rechaza, sub-ítems de categoría con descripción y UI rediseñada, categorías del técnico visibles
para el admin, teléfono del cliente ya no visible para el técnico (privacidad), label del wizard
("Técnicos Sugeridos"), y notificaciones responsive en mobile. **Falta correr el SQL pendiente en
Supabase (bloque único, ver sección "Fase 8" más abajo), configurar Custom SMTP + template de
confirmación, y probar todo con Jota/Agustín.** Fases 6 y 7 (rediseño visual + subitems/cotización)
siguen cerradas y confirmadas — ver sus secciones más abajo para el detalle de cada una.

**Actualización anterior:** 2026-07-31 — fix de husos horarios (todas las fechas/horas "reales" de
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

## Mejoras finales — implementación por fases — sesión 2026-08-05 en adelante

**Origen:** `docs/taita-mejoras-finales.md`, requisitos que Jota tomó de una reunión con Agustín
(el admin/cliente de la plataforma). Son 8 puntos; se analizó cada uno (factibilidad + impacto en
base de datos) y se acordó con Jota un plan de implementación en fases, de menor a mayor riesgo,
probando cada fase en producción antes de arrancar la siguiente — no se implementan todas juntas.

**Plan acordado (orden de ejecución):**

| Fase | Qué | Estado |
|---|---|---|
| 1 | Previsualizar el PDF del recibo (modal en vez de solo descarga) | ✅ Implementado y confirmado |
| 2 | Número de solicitud `#123` visible en toda la web | ✅ Implementado y confirmado |
| 3 | Mapa con Leaflet en el formulario de solicitud + detalle | ✅ Confirmado |
| 4 | Admin elige franja horaria (mañana/tarde/noche) al asignar técnico | ✅ Implementado, falta probar |
| 5 | Botón de técnico para cerrar el servicio después del pago | ✅ Implementado, falta probar |
| 6 | Rediseño visual (formulario + dashboards cliente/técnico) | ✅ Implementado y confirmado por Jota |
| 7a | Subitems con precio en el wizard de "Solicitar servicio" | ✅ Implementado, falta correr el SQL y probar |
| 7b | Canal de "Solicitar cotización" (con chat cliente↔admin) | ✅ Implementado, falta correr el SQL, crear el bucket, y probar |

**Decisiones tomadas con Jota que valen para todo el plan:**
- El chat interno para el flujo de cotización (Fase 7) **sí se incluye**, pese a que en una charla
  anterior se había descartado el chat interno como feature general — se trata como una excepción
  acotada a ese flujo puntual, no como mensajería general de la app.
- Si el admin asigna una franja horaria (Fase 4) distinta a la que pidió el cliente, alcanza con
  **notificarle** el cambio — no bloquea la asignación ni agrega un estado nuevo a la solicitud.
- El canal de "Solicitar cotización" (Fase 7) es un canal **totalmente aparte** del flujo normal de
  categoría-con-precio-fijo, no depende de si la categoría tiene subitems o no: es un checkbox que,
  al tildarse, oculta el precio y muestra descripción + carga de imágenes.

### Fase 1 — Previsualizar el PDF del recibo

**✅ Implementado y confirmado por Jota (2026-08-05).**

Antes, el botón "Descargar recibo" en el panel del cliente abría directo el PDF en una pestaña
nueva o lo bajaba, según el navegador. Ahora hay dos acciones separadas:
- **👁️ Ver recibo** — abre un modal con el PDF embebido (mismo patrón visual que la galería de
  fotos del cierre del trabajo), sin salir de la página.
- **⬇️ Descargar** — baja el archivo directo, usando el parámetro `download` de Supabase Storage
  (fuerza `Content-Disposition: attachment` desde el propio storage, funciona cross-origin — el
  atributo HTML `download` no sirve acá porque el link apunta a otro dominio).

**Ajuste post-feedback:** el modal tenía mucho radio de borde (chocaba visualmente contra el visor
nativo del PDF, que tiene esquinas cuadradas) y el botón de cerrar (✕) quedaba tapado detrás del
navbar por empate de `z-index` (ambos en `z-50`). Se bajó el radio a `rounded-lg`, se subió el
modal a `z-100`, y se movió el botón de cerrar para adentro del modal en vez de sobresalir.

**Archivos:** `src/pages/dashboard/cliente/solicitud/[id].astro` (genera dos signed URLs — una para
preview inline, otra con `{ download: true }`), `src/components/DarConformidad.tsx` (modal +
botones). Sin impacto en base de datos.

### Fase 2 — Número de solicitud (`#123`)

**✅ Implementado. Falta correr el SQL en Supabase (no confirmado que Jota ya lo corrió) — una vez
corrido, no hace falta ningún otro paso, el código ya está listo para leer la columna.**

**Motivo:** las solicitudes se identificaban por UUID en todos lados — imposible de referenciar de
palabra con un cliente o un técnico. Ahora cada solicitud tiene un número corto y correlativo
(`#00123`) visible como parte del título en absolutamente todos los lugares donde antes se mostraba
solo el título: los 3 listados (cliente/técnico/admin), las 3 páginas de detalle, el PDF del
recibo, el título del checkout de Mercado Pago, y **todos** los emails y notificaciones in-app
(nueva solicitud, cambios de estado, conformidad, pago acreditado/rechazado/reembolsado/
contracargo, desasignación).

**Cómo quedó:**
- Columna nueva `solicitudes.numero` (`bigint`, autoincremental vía secuencia de Postgres, `UNIQUE`,
  `NOT NULL`). Se backfillearon las solicitudes existentes numerándolas según `creado_en` antes de
  enganchar la secuencia, para que no haya huecos ni duplicados.
- Nueva función helper `etiqueta(sol)` en `src/lib/notificaciones.ts` → `` `#${numero} — ${titulo}` ``,
  usada en absolutamente todos los emails/notificaciones de ese archivo (se reemplazó cada uso de
  `sol.titulo` a mano, son ~25 lugares).
- `notificarDesasignacion()` ahora recibe también `numeroSolicitud` (antes solo el título) — su
  único caller (`admin/solicitud/[id].astro`, al desasignar un técnico) actualizado para pasarlo.

**SQL corrido/a correr en Supabase (una sola vez):**

```sql
ALTER TABLE solicitudes ADD COLUMN numero bigint;

WITH ordenado AS (
  SELECT id, row_number() OVER (ORDER BY creado_en) AS rn FROM solicitudes
)
UPDATE solicitudes SET numero = ordenado.rn
FROM ordenado WHERE solicitudes.id = ordenado.id;

CREATE SEQUENCE solicitudes_numero_seq OWNED BY solicitudes.numero;
SELECT setval('solicitudes_numero_seq', (SELECT COALESCE(MAX(numero), 0) FROM solicitudes));
ALTER TABLE solicitudes ALTER COLUMN numero SET DEFAULT nextval('solicitudes_numero_seq');
ALTER TABLE solicitudes ALTER COLUMN numero SET NOT NULL;
ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_numero_unique UNIQUE (numero);
```

**Nota de Jota tras probarlo:** el número se ve "medio gris" en los listados — es a propósito
(estilo secundario/discreto, `text-gray-400`), pero se revisa igual junto con el resto de la
paleta cuando se haga la Fase 6 (rediseño visual). No es un bug, queda anotado para no repetir la
discusión.

**Archivos tocados (13):** `src/lib/types.ts`, `src/lib/notificaciones.ts`, `src/lib/recibo.ts`,
`src/components/{MisSolicitudes,SolicitudesTecnico,TablaSolicitudesAdmin}.tsx`,
`src/pages/dashboard/{cliente,tecnico,admin}.astro`, `src/pages/dashboard/*/solicitud/[id].astro`
(las 3), `src/pages/api/{cliente,tecnico,admin}/solicitudes.ts`,
`src/pages/api/cliente/{dar-conformidad,reintentar-pago}.ts`.

### Fase 3 — Mapa de ubicación (Leaflet)

**✅ Implementado y confirmado por Jota (2026-08-05).**

**Cómo quedó:**
- Se agregó `leaflet` + `@types/leaflet` como dependencia del proyecto (`pnpm add -w leaflet`,
  `pnpm add -w -D @types/leaflet` — el `-w` fue necesario porque el repo tiene un
  `pnpm-workspace.yaml` que se declara a sí mismo como único paquete, así que pnpm lo trata como
  "raíz del workspace"). Se usó Leaflet + tiles de OpenStreetMap directo, sin ninguna librería de
  wrapper para React (`react-leaflet` no hacía falta) — un solo componente con `useEffect` alcanza
  y evita otra capa de abstracción. **Sin costo ni API key** — a diferencia de Google Maps, ni los
  tiles ni el geocoding requieren facturación.
- Nuevo componente `src/components/MapaUbicacion.tsx` — mismo componente sirve para los dos casos:
  - **Modo interactivo** (formulario de solicitud, `onChange` provisto): botón "🔍 Buscar dirección
    en el mapa" (geocodifica lo que el cliente escribió en el campo Dirección), botón "📍 Usar mi
    ubicación" (pide permiso de geolocalización del navegador), marcador arrastrable, y click en
    cualquier punto del mapa para reubicarlo a mano.
  - **Modo de solo lectura** (páginas de detalle, sin `onChange`): mapa fijo centrado en la
    ubicación guardada, sin controles de edición.
- Nuevo endpoint `src/pages/api/geocodificar.ts` — proxy server-side a Nominatim (el servicio de
  geocoding gratuito de OpenStreetMap). Se armó como proxy en vez de llamarlo directo desde el
  browser para poder mandar un `User-Agent` identificable, como pide la política de uso de
  Nominatim.
- El mapa en el formulario es **opcional** — si el cliente no lo toca, la solicitud se crea igual
  sin `latitud`/`longitud` (ninguno de los dos campos es obligatorio), tal como se decidió en el
  análisis inicial.
- Mapa de solo lectura agregado a las 3 páginas de detalle (cliente/técnico/admin), debajo de la
  dirección — solo se muestra si la solicitud tiene coordenadas guardadas.

**SQL a correr en Supabase (aditivo, nullable — no rompe nada existente):**

```sql
ALTER TABLE solicitudes ADD COLUMN latitud  numeric;
ALTER TABLE solicitudes ADD COLUMN longitud numeric;
```

**Ajustes post-feedback de Jota:**
- El `window is not defined` original (SSR) se debía a que Leaflet toca `window` apenas se
  importa, y Astro renderiza el componente en el servidor incluso con `client:load` (para generar
  el HTML inicial), antes de que llegue a hidratar en el navegador. Se movió el `import('leaflet')`
  a dinámico dentro de `useEffect` (que nunca corre en el servidor) — el import de tipos (`import
  type L from 'leaflet'`) se mantiene estático porque se borra en compilación, no ejecuta nada.
- El marcador no se veía (ícono roto) — con los PNG del ícono empaquetados localmente vía import
  de Vite (`import x from 'leaflet/dist/images/marker-icon.png'`) la imagen no cargaba. Se cambió a
  servir los 3 íconos desde el CDN de Leaflet (`unpkg.com`) en vez de bundlearlos — ya se depende
  de servicios externos igual (tiles de OpenStreetMap, geocoding de Nominatim), así que no suma una
  dependencia nueva en la práctica, y evita por completo los problemas de resolución de assets.
- Se sacó el botón manual "Buscar dirección en el mapa" — ahora la búsqueda es automática: al
  escribir en el campo Dirección del formulario, se geocodifica sola con un debounce de 900ms (para
  no pegarle a Nominatim en cada tecla). El botón "Usar mi ubicación" se mantiene igual, porque ya
  funcionaba bien.

**Probado por Jota:** dirección escrita → mapa se ubica solo, marcador visible y correcto, vista de
solo lectura en el detalle de la solicitud (ver captura "UBICACIÓN" en el detalle) — todo ok.

**Ajuste post-feedback — autocompletado real en vez de auto-ubicar a ciegas:** Jota reportó que
"Santa Fe 650" (dirección real, pero ambigua con el nombre de la provincia) lo mandaba a Neuquén —
Nominatim, sin más contexto, devolvía cualquier coincidencia del país entero. Se rediseñó:
- `src/pages/api/geocodificar.ts` ahora devuelve hasta 5 resultados (antes 1), con un sesgo suave
  (`viewbox` + `bounded=0`, no excluye el resto del país) hacia la provincia de Corrientes — la
  zona base de la plataforma hoy. No requiere permiso de geolocalización del usuario.
- La búsqueda se movió de `MapaUbicacion.tsx` al propio `FormSolicitud.tsx`, como un dropdown de
  sugerencias pegado al input de Dirección (mismo patrón que un autocompletado de Google Maps u
  otros — pedido explícito de Jota). El cliente ve la lista y elige la correcta en vez de que el
  sistema adivine y listo. `MapaUbicacion.tsx` quedó más simple: ya no busca nada, solo dibuja el
  mapa y reacciona a lat/lng por props (más el botón de geolocalización, que ya andaba bien).
- Probado con "santa fe 650": ahora las 5 sugerencias caen en la región litoral/NEA (Chaco, Entre
  Ríos, Misiones, Santa Fe) en vez de saltar a Neuquén — mejora real, aunque no es 100% infalible
  (no usa la ubicación real del usuario, es un sesgo regional fijo). Si en algún momento hace falta
  más precisión, el siguiente paso sería sesgar por la geolocalización real del usuario en vez de
  un viewbox fijo — no implementado todavía, quedó fuera de alcance de este ajuste puntual.
- **Bug encontrado al probar:** el dropdown de sugerencias quedaba tapado detrás del mapa (no se
  veían todas las opciones). Causa: Leaflet usa z-index internos altos (200 a 700) para sus capas,
  y el contenedor del mapa no tenía `position`/`z-index` propio — sin eso, esos valores internos
  "se escapan" y se comparan directo contra hermanos del mapa en el DOM (como el dropdown),
  ganándole aunque el dropdown tuviera un z-index nominalmente más alto. Se arregló agregando
  `relative z-0` al contenedor del mapa en `MapaUbicacion.tsx`, que aísla el apilado interno de
  Leaflet — recomendable tenerlo en cuenta para cualquier overlay futuro que conviva con el mapa
  (modales, tooltips, etc.), no es específico de este dropdown.

**Archivos:** `src/components/MapaUbicacion.tsx` (nuevo), `src/pages/api/geocodificar.ts` (nuevo),
`src/components/FormSolicitud.tsx`, `src/pages/api/crear-solicitud.ts`, `src/lib/types.ts`,
`src/pages/dashboard/*/solicitud/[id].astro` (las 3). `package.json`/`pnpm-lock.yaml` (nueva
dependencia `leaflet`).

### Fase 4 — Franja horaria (mañana/tarde/noche) al asignar técnico

**✅ Implementado. El autocompletado de dirección (con su fix de z-index) ya está confirmado por
Jota (2026-08-05) — falta correr el SQL de `franja_asignada` y probar el flujo de asignación en sí
(checklist más abajo) antes de dar toda la fase por cerrada.**

**Cómo quedó, según lo acordado con Jota:**
- `hora_solicitada` (lo que pide el cliente en el formulario) **no se tocó** — sigue siendo el
  horario puntual de referencia, y sigue siendo la base del chequeo de choque de agenda exacto en
  `disponibilidad.ts` (eso no cambió).
- Nueva columna `solicitudes.franja_asignada` (`'manana' | 'tarde' | 'noche'`, nullable) — lo que
  el admin le compromete al técnico al asignarlo. Es un campo **aparte**, no reemplaza nada.
- Nuevos helpers en `src/lib/disponibilidad.ts`: `franjaDeHora()` (a qué franja cae una hora
  puntual — mañana 08–12, tarde 12–18, noche 18–20, mismos límites que el horario laboral ya
  existente) y `FRANJA_LABEL` (textos para mostrar).
- El formulario de "Asignar técnico" del admin ahora tiene un segundo select obligatorio con las 3
  franjas, **pre-seleccionado con la franja que corresponde al horario que pidió el cliente** (así
  el caso común — sin fricción de horario — no exige tocar nada extra).
- **Si el admin elige una franja distinta a la que pidió el cliente**, no se bloquea nada (el admin
  decide) pero se dispara una notificación aparte al cliente (`notificarFranjaAsignada` en
  `notificaciones.ts`, email + campanita) avisándole el cambio. Si coincide, no se manda nada de
  más.
- La franja elegida se conserva a través del flujo de conflicto de agenda (cuando el admin fuerza
  la asignación reagendando) — viaja como parámetro en la URL y como campo oculto en el sub-form,
  para no hacérsela elegir dos veces.
- Se agregó un texto aclaratorio en el formulario de solicitud del cliente, debajo del horario
  preferido: "El horario que elegís es preferencial — puede ajustarse según la disponibilidad del
  técnico que te asignemos."
- La franja asignada se muestra en las 3 páginas de detalle (admin, técnico, cliente) una vez que
  hay técnico asignado.

**SQL a correr en Supabase (aditivo, nullable — no rompe nada existente; sin CHECK constraint a
propósito, la validación de los 3 valores vive en el código):**

```sql
ALTER TABLE solicitudes ADD COLUMN franja_asignada text;
```

**Falta probar (el SQL de franja + el flujo de asignación en sí — el autocompletado de dirección ya
se probó y confirmó por separado, ver abajo):**
- [ ] Correr el SQL de arriba.
- [ ] Asignar un técnico a una solicitud → confirmar que el select de franja aparece pre-marcado
      con la franja que corresponde al horario que pidió el cliente.
- [ ] Asignar con la franja sugerida (sin cambiarla) → el cliente NO debe recibir ningún aviso de
      cambio de horario.
- [ ] Asignar con una franja distinta a la sugerida → el cliente SÍ debe recibir email + campanita
      avisando el cambio.
- [ ] Ver el detalle de la solicitud como admin, técnico y cliente → la franja asignada debe verse
      en los 3 paneles.
- [ ] Probar el flujo de conflicto de agenda (forzar reagendando) → confirmar que la franja elegida
      se mantiene sin tener que volver a elegirla.

**Archivos:** `src/lib/disponibilidad.ts`, `src/lib/notificaciones.ts`, `src/lib/types.ts`,
`src/components/FormSolicitud.tsx`, `src/pages/dashboard/admin/solicitud/[id].astro`,
`src/pages/dashboard/tecnico/solicitud/[id].astro`, `src/pages/dashboard/cliente/solicitud/[id].astro`.

### Fase 5 — Botón del técnico para cerrar el servicio (nuevo estado `finalizada`)

**✅ Implementado. Falta correr el SQL en Supabase y probar antes de dar por cerrado.**

**Pedido de Agustín, aclarado con Jota antes de tocar código:** el cierre debe (1) cerrar
definitivamente la solicitud y (2) contar el trabajo como terminado recién en ese momento para las
estadísticas del técnico — hasta ahora `tecnicos.total_servicios` se incrementaba apenas el técnico
cargaba fotos/gastos ("Completar trabajo"), **antes** de que el cliente diera conformidad o
pagara. Esto significaba que un trabajo que el cliente nunca terminaba de pagar (o rechazaba) ya
contaba en las estadísticas del técnico — bug de fondo que esta fase corrige.

**Cómo quedó:**
- Nuevo estado terminal `finalizada` en `SolicitudEstado` — viene **después** de `completada`, no
  la reemplaza. El flujo completo queda: `aceptada → en_curso → completada` (técnico carga
  fotos/gastos) `→` cliente da conformidad y paga `→` **`finalizada`** (técnico cierra, solo
  posible con el pago ya acreditado).
- Nuevo botón **"✅ Cerrar servicio"** (componente `CerrarServicio.tsx`, con confirmación inline,
  mismo patrón que `ResponderAsignacion.tsx`) — aparece en el panel del técnico (listado y detalle)
  únicamente cuando `estado === 'completada'` **y** el último pago registrado es `'pagado'`.
- Nuevo endpoint `POST /api/tecnico/finalizar-servicio.ts` — valida ambas condiciones en el
  servidor (no solo en el botón), incrementa `tecnicos.total_servicios` recién acá, y llama a
  `notificarCambioEstado(..., 'finalizada', ...)` — el único punto que cambia el estado, para no
  perder historial ni notificaciones (mismo criterio que todo el resto de la app).
- **El incremento de `total_servicios` se sacó de `api/tecnico/completar.ts`** (donde vivía antes)
  y se movió acá — es el cambio de fondo que pidió Agustín. Los conteos históricos ya incrementados
  bajo la regla vieja no se tocan/recalculan, solo cambia el criterio hacia adelante.
- **Es irreversible a propósito** — no hay forma de volver de `finalizada` para atrás desde la UI
  (ni el admin la puede elegir a mano en el dropdown de "Estado del servicio", queda deshabilitada
  igual que `asignada`).
- **Para el cliente no cambia nada visualmente** — mismo criterio que ya existía para `asignada`
  (que se le muestra como "Pendiente"): `finalizada` se le muestra idéntico a "Completada" (mismo
  label, color, y se filtra del timeline) porque es un cierre administrativo interno entre técnico
  y admin, no algo que el cliente necesite distinguir. El bloque de conformidad/pago/recibo y la
  posibilidad de dejar reseña se mantienen visibles igual que en `completada`.
- **Para técnico y admin sí es un estado distinto y visible** ("Finalizada", verde oscuro sólido
  para diferenciarlo de "Completada"). El admin recibe una notificación in-app cuando el técnico
  cierra (no email, no hace falta llenarle la bandeja por un paso administrativo).
- **Notificaciones y tiempo real, sin romper nada de lo existente:** el cambio de estado pasa
  siempre por `notificarCambioEstado()` (nunca un `update` directo), así que el historial y el
  timeline quedan consistentes igual que cualquier otro cambio de estado. Las 3 páginas de detalle
  ya escuchan cambios en tiempo real sobre su propia solicitud (`CambiosEnVivo`, ya existía, no
  hizo falta tocarlo). La tabla del admin (`TablaSolicitudesAdmin`) se refresca sola porque
  escucha `notificaciones` del admin, y esta fase le agrega justamente esa notificación. La lista
  del cliente no recibe push para `finalizada` a propósito (no hay nada nuevo que mostrarle), y la
  del técnico se actualiza con el reload local que ya hace el propio botón al confirmar.
- De paso se corrigió un falso positivo: un `<\strong>` que parecía HTML roto en el email de
  "Trabajo completado" resultó ser un artefacto de visualización de una herramienta, no un bug real
  — se verificó contra el archivo y ya estaba bien (`</strong>`), no se tocó nada ahí.

**Ajuste post-feedback — contadores que "perdían" trabajos al finalizar:** Jota probó el flujo
completo y encontró que el contador "Completados" del panel del técnico bajaba en 1 apenas cerraba
un servicio (porque solo contaba `estado === 'completada'`, y al finalizar deja de serlo). Al
revisar el resto de la app se encontraron **3 lugares más con el mismo bug** — todos contaban o
sumaban solo `'completada'`, así que cualquier trabajo finalizado "desaparecía" del cálculo:
- `dashboard/tecnico.astro` — "Completados" ahora cuenta `completada` + `finalizada` (no baja al
  cerrar), y sus "Ganancias" ahora suman ambos estados también (antes esa plata "se perdía" del
  acumulado al cerrar el trabajo — bug con plata real, el mismo tipo de cosa que ya pasó antes con
  el cálculo de "plataforma retiene"). Se agregó una tarjeta nueva **"Finalizados"** con el
  desglose de cuántos de esos ya están cerrados del todo — queda lista para reusarse en el
  rediseño (Fase 6).
- `dashboard/admin.astro` — "Ingresos (completadas)" tenía el mismo problema, corregido igual.
- `dashboard/cliente.astro` — el contador "Completadas" del cliente, mismo fix.
- `api/crear-resena.ts` — **este era un bug más serio**: el endpoint que guarda la reseña exigía
  `estado === 'completada'` a rajatabla, así que un cliente que quisiera dejar reseña **después**
  de que el técnico cerrara el servicio se hubiera encontrado con un error ("Solicitud no
  válida") — la opción de reseñar seguía visible en su panel (ya la habíamos dejado andando para
  `finalizada` también) pero el guardado hubiera fallado. Corregido para aceptar ambos estados.

Regla general que queda anotada: cualquier lugar del código que filtre/cuente específicamente por
`estado === 'completada'` para algo relacionado con plata, estadísticas o acciones del cliente
(no con la lógica de transición de estados en sí) probablemente deba incluir también `'finalizada'`
de ahora en más — quedó revisado todo el código existente al momento de este fix, pero es un patrón
a tener en cuenta para código nuevo.

**Segundo ajuste post-feedback — el técnico no recibía notificación de su propio cierre:** Jota
probó de nuevo y notó que al admin le llegaba la notificación de "Servicio cerrado" pero al técnico
no le aparecía nada en su campanita. Causa: `finalizada` no estaba en `AVISAR_TECNICO` (el set que
controla a quién se le manda aviso). Esto era inconsistente con `completada`, que **sí** está en
ese set — el técnico ya recibía notificación de su propia acción al completar un trabajo (funciona
como una especie de recibo/confirmación en su panel), y `finalizada` debía seguir el mismo criterio.
Se agregó `'finalizada'` a `AVISAR_TECNICO` en `src/lib/notificaciones.ts` — reusa el mismo mensaje
genérico que ya usan todos los demás cambios de estado ("La solicitud X pasó a estado Finalizada"),
sin necesidad de un caso especial.

**Tercer ajuste post-feedback — el bloque de confirmación desarmaba el listado del técnico:** el
recuadro de "¿Confirmás cerrar...?" de `CerrarServicio` reemplazaba al botón in-place con un
bloque `w-full` — dentro de la fila del listado (`SolicitudesTecnico`, que tiene varios elementos
en una fila flex) eso empujaba y comprimía todo el contenido de la izquierda. Se cambió a un
**modal centrado con fondo oscuro** (mismo patrón visual que el modal de previsualizar el recibo,
Fase 1) en vez de un popover flotante anclado al botón — se descartó esa opción porque el listado
tiene `overflow-hidden` en su contenedor, que hubiera recortado un popover anclado en la última
fila. El modal, al ser `position: fixed`, no participa del flujo del documento así que no mueve
nada de alrededor, y no se recorta contra ningún `overflow-hidden`. Se aplicó el mismo criterio a
**los otros dos componentes con el mismo patrón** (confirmar/reemplazar in-place), por consistencia
y porque tenían el mismo riesgo potencial: `ResponderAsignacion.tsx` (confirmar rechazo) y
`CancelarSolicitud.tsx` (confirmar cancelación) — ninguno de los dos tenía el bug reportado
todavía, pero ambos se usan en contextos de listado similares.

**SQL a correr en Supabase (una sola vez) — amplía el CHECK constraint de `estado`:**

```sql
-- Si no estás seguro del nombre exacto del constraint, confirmarlo primero:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = 'solicitudes'::regclass AND contype = 'c';

ALTER TABLE solicitudes DROP CONSTRAINT solicitudes_estado_check;
ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_estado_check
  CHECK (estado IN ('pendiente','asignada','aceptada','en_curso','completada','finalizada','cancelada'));
```

**Probado por Jota:** el flujo central anda bien — botón aparece recién con el pago acreditado,
cierra correctamente, no se puede cerrar dos veces. Encontró el bug de los contadores (ya
corregido, ver arriba).

**Falta probar:**
- [ ] Confirmar que el contador "Finalizados" nuevo y "Completados"/"Ganancias" corregidos se ven
      bien en el panel del técnico después del fix.
- [ ] Confirmar que "Ingresos (completadas)" del admin y "Completadas" del cliente tampoco bajan al
      finalizar un servicio.
- [ ] Dejar una reseña sobre una solicitud ya `finalizada` (no solo `completada`) → debe guardarse
      sin error (era el bug más importante de los 4 encontrados).
- [ ] Ver como cliente → debe verse exactamente igual que "Completada" (mismo label/color, sin
      entrada duplicada en el timeline), con el recibo y la posibilidad de dejar reseña intactos.
- [ ] Ver como admin → debe verse "Finalizada" (distinto de "Completada"), con el aviso de "ya
      cuenta en sus estadísticas", y debe haber llegado una notificación in-app al admin.
- [ ] Confirmar que el admin NO puede elegir "Finalizada" a mano desde el dropdown de estado.

**Archivos:** `src/lib/types.ts`, `src/lib/notificaciones.ts`,
`src/pages/api/tecnico/{completar,finalizar-servicio}.ts` (nuevo el segundo),
`src/pages/api/crear-resena.ts`,
`src/components/CerrarServicio.tsx` (nuevo), `src/components/{SolicitudesTecnico,MisSolicitudes,TablaSolicitudesAdmin}.tsx`,
`src/pages/dashboard/*/solicitud/[id].astro` (las 3),
`src/pages/dashboard/{tecnico,admin,cliente}.astro` (contadores).

## Fase 6 — Rediseño visual — sesión 2026-08-06 en adelante

**Origen:** Jota armó un mockup con Claude web (formulario de solicitud como wizard de 6 pasos) y
recibió otro de Agustín para el home mobile (estilo app nativa). Se acordaron 3 decisiones antes de
tocar código:
- **Horario preferido:** se mantiene el horario puntual (cada 30 min) tal cual funciona hoy — solo
  cambia el estilo visual (botones en vez de dropdown). **No** se pasa a franjas Mañana/Tarde/Noche
  como sugería el mockup — eso hubiera implicado rehacer el chequeo de choques de agenda en
  `disponibilidad.ts`, que sigue funcionando a horario exacto.
- **Bottom nav mobile** (Inicio/Servicios/Citas/Perfil, pendiente de implementar): Inicio = home,
  Servicios = categorías/técnicos, Citas = mis solicitudes, Perfil = panel/dashboard — todo según
  el rol logueado.
- **Orden de implementación:** primero el wizard de "Solicitar servicio" (lo más concretamente
  especificado), después el home mobile, después el home de escritorio (sin mockup exacto, con
  libertad de propuesta).
- El paso "¿Con quién preferís trabajar?" del mockup estaba mal planteado (Jota no le había pasado
  bien el contexto a Claude web) — no es una elección real de técnico, es solo informativo. Se
  ajustó el texto y se sacó cualquier indicio visual de que fuera una selección real.

### Fase 6a — Wizard de "Solicitar servicio"

**✅ Implementado. Falta probar (no se pudo probar visualmente en este entorno — sin navegador ni
sesión logueada disponible; se verificó que compila y que la ruta no rompe en el servidor).**

**Cómo quedó:**
- `FormSolicitud.tsx` reescrito como wizard de 6 pasos (Servicio → Técnico → Detalles → Cuándo →
  Dónde → Confirmar), con sidebar de progreso en desktop (checks/números conectados por una línea,
  paso actual resaltado) y una barra compacta arriba en mobile (rótulo "Paso X de 6" + barra de
  progreso delgada) en vez del sidebar completo, que no entra bien en pantallas chicas.
  "Continuar" valida solo los campos del paso actual (`react-hook-form`'s `trigger()`) antes de
  avanzar — no hace falta llenar todo el formulario para saber si el primer paso está mal.
- **Toda la lógica de negocio existente se mantuvo intacta** — Zod schema, fetch de técnicos
  candidatos, cálculo de precio, autocompletado de dirección (Fase 3.1), mapa (Fase 3), chequeo de
  disponibilidad contra un técnico fijo — el rediseño es una reestructuración de la capa visual/de
  flujo, no reescribió ninguna regla de negocio.
- Paso "Técnico" ajustado a lo que pediste: sin radios ni implicación de que sea una elección real.
  "Que Taita asigne" queda como texto destacado (no seleccionable) y abajo los técnicos candidatos
  como antes, solo con mejor estilo — si se pasa `tecnicoId` (flujo desde el perfil de un técnico
  puntual), este paso muestra directamente esa tarjeta fija.
- El horario preferido pasó de `<select>` a una grilla de píldoras (una por cada media hora), sin
  tocar `franjasHorarias()` ni la lógica de choque de agenda.
- Si al enviar aparece un conflicto de horario (técnico fijo ya ocupado), el wizard vuelve solo al
  paso 4 para que se vea el aviso en contexto, en vez de quedar escondido en otro paso.
- `src/pages/solicitud.astro` ensanchado (`max-w-5xl`, antes `max-w-2xl`) para que entre el layout
  de sidebar + card, y se sacó el encabezado "Solicitar servicio" que quedaba duplicado con el
  título que ahora trae el propio paso 1 del wizard. De paso se corrigió el fondo de la página
  (usaba `bg-gray-50`, inconsistente con el resto de la app que usa `bg-cream`).

**Falta probar:**
- [ ] Recorrer el wizard completo (los 6 pasos) tanto en desktop como en mobile — sidebar vs. barra
      compacta, que "Continuar" bloquee bien si falta completar el paso actual.
- [ ] Flujo con técnico fijo (`?tecnico=...`) → el paso 2 debe mostrar la tarjeta fija, y un
      conflicto de horario debe devolver al paso 4 con el aviso visible.
- [ ] Elegir una sugerencia del autocompletado de dirección (Fase 3.1) y confirmar que el mapa
      (paso 5) sigue funcionando igual que antes dentro del wizard.
- [ ] Enviar la solicitud completa → confirmar que llega igual que siempre (mismos datos, misma
      notificación al admin/cliente).
- [ ] Si el dev server tira `Failed to fetch dynamically imported module` o similar en consola,
      reiniciarlo (`Ctrl+C` y `pnpm dev` de nuevo) — es caché de Vite desactualizada, no un bug de
      este cambio (ya pasó una vez con el mapa).

**Ajustes post-feedback de Jota (2 bugs reales, no solo visuales):**
- **El botón final aparecía en "Enviando..." sin haber sido clickeado.** Primer intento: se agregó
  un `onKeyDown` al `<form>` para interceptar Enter (problema clásico de wizards de un solo
  `<form>`, donde Enter en cualquier input dispara el envío nativo salteando los pasos). Jota probó
  de nuevo y el problema seguía igual sin haber tocado Enter, así que la causa real era otra cosa
  (probablemente algún timing de hidratación con el mecanismo nativo de submit del navegador, no
  se pudo identificar la causa exacta). Solución definitiva, más robusta que perseguir la causa:
  se sacó `type="submit"` de **todos** los botones del wizard — el `<form>` ahora tiene un
  `onSubmit` que siempre hace `preventDefault()` (nunca deja que el navegador dispare un envío
  nativo, sea cual sea la causa), y el botón "Enviar solicitud" es `type="button"` con
  `onClick={handleSubmit(onSubmit)}` — dispara el envío de `react-hook-form` a mano, únicamente
  con ese click puntual. No hay ninguna otra forma de que se dispare.
- **"Usar mi ubicación" no completaba el campo Dirección** (que es obligatorio), aunque el mapa sí
  ubicaba bien el pin — daba error de validación de campo vacío al querer avanzar. No era un bug
  nuevo de esta fase, ya existía desde la Fase 3, recién se notó ahora al volver a probar el flujo
  completo. Se agregó geocoding inverso (coordenadas → dirección legible): nuevo endpoint
  `src/pages/api/geocodificar-inverso.ts` (mismo proxy a Nominatim que el geocoding normal),
  llamado únicamente al apretar "Usar mi ubicación" — **no** al arrastrar el marcador o tocar el
  mapa a mano, para no pisarle al cliente una dirección que ya escribió solo porque ajustó el pin.
  Si el geocoding inverso falla, la ubicación se guarda igual (mejor esfuerzo, no bloquea).

**Archivos:** `src/components/FormSolicitud.tsx`, `src/pages/solicitud.astro`,
`src/components/MapaUbicacion.tsx`, `src/pages/api/geocodificar-inverso.ts` (nuevo).

**Confirmado por Jota (2026-08-06):** el botón "Enviar solicitud" ya no aparece en "Enviando..."
sin haber sido clickeado — el fix de sacar `type="submit"` de todos los botones funcionó. Probado
también desde otra máquina (después del push) — todo OK, incluido el brillo metálico de la
tarjeta de estimación. **Fase 6a queda cerrada.**

**Último ajuste de la sesión — tarjeta de estimación con estilo "metálico"/glass:** a pedido de
Jota (referencia: una tarjeta "DISPONIBLE" de su portfolio, con efecto de brillo que se mueve al
pasar el mouse), la tarjeta verde de "Estimación de costo" del paso 6 pasó de un verde plano a un
degradé oscuro (`from-[#1f5a37] via-[#123723] to-[#081a10]`) con sombra profunda, anillo sutil, y
un **brillo diagonal que barre la tarjeta al hacer hover** (un overlay `via-white/15` que se
desplaza con `group-hover` + `transition-transform duration-700`) — más una leve elevación
(`hover:-translate-y-1`). Todo con CSS puro (gradientes + transform), **sin agregar Three.js ni
ninguna librería nueva** — no hacía falta para lograr el efecto visual pedido, y hubiera sido
sobrecargar el proyecto para una sola tarjeta. Falta probar el hover en el navegador (no se pudo
verificar visualmente en este entorno).

**Pendiente de esta fase (para la próxima sesión):**
- Home mobile (estilo app nativa, según referencia de Agustín — capturas 7 y 8 que mandó Jota).
- Home de escritorio (propuesta libre, sin mockup exacto).
- Bottom nav mobile (Inicio/Servicios/Citas/Perfil) — acordado: Inicio=home, Servicios=categorías/
  técnicos, Citas=mis solicitudes, Perfil=panel/dashboard, todo según el rol logueado. Toca el
  layout global (`Layout.astro`/`Navbar.tsx`), no es solo del home.
- Evaluar qué otras pantallas de cliente/técnico conviene extender con el mismo lenguaje visual
  del wizard (tarjetas, tipografía, el estilo "metálico" nuevo, etc.) — decidir caso a caso, no
  se acordó todavía cuáles.
- El lado admin queda con estilo "de oficina", sin tocar mucho (decisión ya tomada en el análisis
  inicial de la Fase 6).

**Pendiente de sesiones anteriores, todavía sin confirmar que se corrió:**
- [ ] SQL de la Fase 4 (`franja_asignada`) — ver esa sección más arriba.
- [ ] SQL de la Fase 5 (ampliar el CHECK constraint con `'finalizada'`) — ver esa sección más
      arriba. **Importante:** sin este, el botón "Cerrar servicio" va a fallar en producción/en la
      otra máquina aunque en local ya haya funcionado, si esa base de datos es la misma — si es la
      misma base (no una copia distinta), ya debería estar corrido; si Jota prueba mañana desde
      otra máquina contra la misma Supabase, no hace falta repetirlo.

**Nota para retomar mañana:** Jota va a pushear este estado y probar desde otra máquina. Si
aparece `Failed to fetch dynamically imported module` o cualquier error de módulo en la consola del
navegador, es caché de Vite desactualizada del `pnpm dev` — reiniciar el servidor (`Ctrl+C` y
`pnpm dev` de nuevo) antes de asumir que es un bug de código (ya pasó dos veces en esta sesión).

**Confirmado por Jota (2026-08-06, sesión siguiente):** Fase 6a probada desde la otra máquina
después del push — todo OK (wizard, fix del botón, brillo metálico).

### Fase 6b — Bottom nav mobile + home mobile

**✅ Implementado. Falta probar (no se pudo probar visualmente en este entorno).**

**Cómo quedó:**
- Nuevo componente `BottomNavMobile.tsx` — barra fija abajo, solo mobile (`md:hidden`). Detecta el
  rol vía Supabase igual que `Navbar.tsx` (mismo patrón, sin compartir estado entre ambos — no
  había un contexto de auth compartido en el proyecto, así que se repite el mismo hook chico en
  vez de armar una abstracción nueva para esto solo).
  **El admin no ve esta barra** — sigue usando el panel de escritorio, según la decisión ya tomada
  de que el lado admin queda "de oficina".
- **Ajuste post-feedback de Jota:** el primer set de accesos (Inicio/Servicios/Citas/Perfil, genérico
  para todos) no tenía sentido — se pidió analizar qué necesita realmente cada tipo de usuario en
  vez de reusar las mismas 4 etiquetas para todos. Quedó así:
  - **Cliente / visitante sin sesión** (mismo set para los dos — `/solicitud` y `/dashboard/cliente`
    ya están protegidos por el middleware, así que sin sesión el click manda a `/login` con
    redirect, igual que ya hace el navbar de escritorio con "Solicitar servicio"): **Inicio**
    (`/`) → **Técnicos** (`/tecnicos`, para buscar y elegir uno) → **Solicitar** (`/solicitud`,
    la acción principal) → **Mis pedidos** (`/dashboard/cliente`).
  - **Técnico**: **Inicio** (`/`) → **Mis trabajos** (`/dashboard/tecnico`) → **Mi perfil**
    (`/dashboard/tecnico#mi-perfil` — se agregó `id="mi-perfil"` a esa sección de la página para
    que el link haga scroll directo ahí) → **Ver público** (`/tecnicos/{id}`, cómo lo ve un
    cliente — nuevo, requiere una consulta extra a `tecnicos.id` que no se hacía antes).
- Se agregó a `Layout.astro` (global, una sola vez, no hubo que tocar cada página) — con
  `pb-16 md:pb-0` en el `<body>` para que el contenido no quede tapado detrás de la barra fija en
  mobile.
- **Home mobile:** se agregó, solo en mobile (`md:hidden`), un buscador estilo app nativa (según
  la referencia de Agustín) — un botón con forma de input que abre el mismo Command Palette
  (Ctrl+K) que ya usa el buscador de escritorio del navbar, sin duplicar lógica de búsqueda — y un
  botón grande "Solicitar servicio ahora". El resto del home (las 3 tarjetas "Seguridad
  garantizada/Respuesta rápida/Calidad evaluada", que ya coincidían con la referencia, la grilla de
  categorías, banners) **no se tocó** — ya funcionaba bien y ya era responsive.
- **Decisión de alcance:** no se cambió el color del navbar global a verde (como se ve en la
  referencia de Agustín) porque el navbar blanco ya es consistente en todo el sitio, desktop y
  mobile — cambiarlo solo en mobile hubiera roto esa consistencia sin que se pidiera
  explícitamente. Si Jota quiere ese look, es un cambio chico y separado para la próxima.

**Falta probar:**
- [ ] Ver el home en mobile → debe aparecer el buscador (abre el Command Palette al tocarlo) y el
      botón "Solicitar servicio ahora".
- [ ] Confirmar que la barra inferior aparece en todas las páginas en mobile (probar en el home, en
      `/tecnicos`, en el dashboard) y que el contenido no queda tapado atrás.
- [ ] Como admin, confirmar que la barra inferior NO aparece.
- [ ] Sin sesión y como cliente: tocar Inicio/Técnicos/Solicitar/Mis pedidos → confirmar destino
      correcto (sin sesión, Solicitar y Mis pedidos deben mandar a `/login` con redirect).
- [ ] Como técnico: tocar Inicio/Mis trabajos/Mi perfil (debe hacer scroll directo a esa sección)/
      Ver público (debe llevar a `/tecnicos/{id}`, el perfil público real).
- [ ] Confirmar visualmente que el ítem activo se resalta en verde según la página actual.

**Archivos:** `src/components/BottomNavMobile.tsx` (nuevo), `src/layouts/Layout.astro`,
`src/pages/index.astro`, `src/pages/dashboard/tecnico.astro` (ancla `#mi-perfil`).

**Ajuste post-feedback de Jota — navbar mobile a verde Taita:** el navbar superior en mobile
(`Navbar.tsx`) pasó de fondo blanco a `bg-primary` (verde Taita), con texto e íconos en blanco —
para acercarse más a la referencia de Agustín. **Solo mobile** (`md:bg-white` lo vuelve blanco en
desktop, sin tocar el navbar de escritorio, que sigue igual). Detalles:
- El logo dejó de usar `mix-blend-multiply` en la versión mobile — ese modo de mezcla está pensado
  para fondo blanco (el desktop lo sigue usando tal cual); sobre verde se hubiera visto manchado.
- `NotificacionesBell.tsx` ganó un prop nuevo `iconClassName` (default `text-primary`, como
  siempre) para poder pasarle `text-white` solo en la instancia mobile — la campanita se comparte
  entre el navbar de escritorio (fondo blanco, ícono verde) y el de mobile (fondo verde, ícono
  blanco), así que no podía quedar con un color fijo.
- El panel desplegable del menú hamburguesa (☰) se dejó **blanco a propósito** (no verde) —
  agregando un `bg-white` explícito, porque antes heredaba el fondo del `<nav>` padre y sin eso
  hubiera quedado verde sobre verde, poco legible.

**Archivos:** `src/components/Navbar.tsx`, `src/components/NotificacionesBell.tsx`.

**2 ajustes más post-feedback de Jota, mismo hilo:**
- **`BottomNavMobile.tsx` también pasó a fondo verde** (antes blanco, quedaba desentonado con el
  navbar de arriba ya verde) — texto/íconos en blanco, el ítem activo se resalta con un fondo
  `bg-white/15` circular detrás del ícono en vez de cambiar de color (ya que todo el texto es
  blanco ahora, no hay otro color para diferenciarlo salvo opacidad — el ítem activo queda a
  blanco pleno y los demás a `white/55`).
- **El menú ☰ desplegable se rediseñó** — antes quedaba pegado al navbar, del mismo blanco que el
  fondo de la página, poco vistoso. Ahora es una tarjeta flotante separada (`shadow-2xl`,
  `rounded-2xl`, con margen respecto al navbar) y cada link tiene un ícono dentro de una cajita
  `bg-primary-soft` a la izquierda (mismo lenguaje visual que ya usan las tarjetas "por qué
  usarnos" del home) en vez de ser solo texto plano.

### Fase 6c — Navbar de escritorio a verde + avatar circular + home de escritorio

**✅ Implementado. Falta probar (no se pudo probar visualmente en este entorno).**

**Navbar de escritorio:**
- Mismo tratamiento verde que ya tenía el navbar mobile, ahora también en escritorio — texto,
  links y campanita en blanco, botón de usuario como píldora translúcida (`bg-white/10`), círculo
  de iniciales invertido (`bg-white text-primary`) para que contraste. "Ingresar" pasó a píldora
  translúcida blanca y "Registrate" a **ámbar** (mismo acento que el botón "Enviar solicitud" del
  wizard) para que el CTA principal resalte sobre el verde.
- **Bug propio encontrado y corregido en el momento:** al escribir los estilos nuevos me olvidé de
  sacar el `md:bg-white` que había dejado en la ronda anterior (cuando el verde era mobile-only) —
  el `<nav>` seguía blanco en escritorio con texto blanco encima, invisible. Se sacó esa clase
  antes de que llegara a probarse.
- **Ojo:** el navbar es un componente único y compartido — pintarlo verde en escritorio lo pinta
  verde en **todas** las páginas, incluido el panel del admin (que se había dejado "de oficina").
  No se hizo una excepción para admin porque no se pidió así — avisar si se prefiere que el admin
  mantenga el navbar blanco.
- **Avatar circular:** en vez del logo cuadrado suelto, ahora es un círculo blanco (`rounded-full
  overflow-hidden bg-white`) con la mascota recortada adentro (`object-cover`, sin
  `mix-blend-multiply` — ese modo de mezcla asume fondo blanco detrás y sobre un color tiñe los
  colores propios de la mascota, mismo criterio ya aplicado al navbar mobile la ronda anterior).
  Aplicado tanto en escritorio como en mobile, para que quede consistente entre los dos.

**Home de escritorio — propuesta implementada:**
- Tarjeta de confianza flotante junto a la mascota del hero, **con números reales** (no
  inventados): cantidad de técnicos activos y de servicios realizados, ambos con una consulta en
  vivo a Supabase. Mismo estilo "metálico" con brillo al hover que ya tiene la tarjeta de
  estimación del wizard (Fase 6a) — reusa el mismo patrón CSS, le da continuidad visual al
  rediseño. Solo visible en desktop (`hidden md:block`).
- Las tarjetas de "¿Por qué usar Taita Soluciones?" y las de categorías ganaron elevación + sombra
  al hover (antes eran estáticas).
- El footer se dejó exactamente igual, a pedido explícito.

**Falta probar:**
- [ ] Ver el navbar de escritorio → confirmar que se lee bien (texto blanco sobre verde, no blanco
      sobre blanco).
- [ ] Confirmar que el avatar se ve como círculo bien recortado, no cuadrado, tanto en escritorio
      como en mobile.
- [ ] Ver el home de escritorio → la tarjeta de confianza debe aparecer junto a la mascota con
      números reales (no "0 y 0" salvo que la base esté realmente vacía) y el efecto de brillo al
      pasar el mouse.
- [ ] Hover sobre las tarjetas de "por qué usarnos" y de categorías → deben elevarse con sombra.
- [ ] Confirmar si el navbar verde en el panel del admin es aceptable o si hay que hacer una
      excepción para ese rol (pendiente de definir).

**Archivos:** `src/components/Navbar.tsx`, `src/pages/index.astro`.

**Ajuste post-feedback de Jota — tarjeta "metálica" reutilizable:** a Jota le gustó mucho el estilo
de la tarjeta de confianza del hero y pidió aplicarlo también a las 3 tarjetas de "¿Por qué usar
Taita Soluciones?" y a donde más tuviera sentido. Antes de sumar más copias del mismo bloque largo
de clases, se centralizó en `src/styles/global.css` como dos clases reusables:
`.card-metallic` (el degradé + sombra + elevación al hover) y `.card-metallic-shine` (el overlay
que barre la tarjeta). Se refactorizaron las 2 tarjetas que ya la usaban (estimación del wizard,
confianza del hero) para consumir la clase compartida en vez de repetir el bloque, y se sumó a:
- Las 3 tarjetas de "¿Por qué usar Taita Soluciones?" (antes claras, ahora oscuras con el mismo
  degradé).
- El banner "¿Sos taita y querés ofrecer tus servicios?" (antes verde clarito `bg-primary-soft`,
  ahora la tarjeta metálica) — su botón pasó a ámbar para que siga resaltando sobre el fondo oscuro.
- **A propósito NO se aplicó** a la grilla de categorías (9 tarjetas) — quedan claras para no
  sobrecargar de oscuro una grilla con tantos elementos y mantener buena legibilidad/escaneo
  rápido, ni a la sección de CTA final (ya es su propio bloque `bg-primary` de ancho completo,
  hubiera quedado un verde oscuro sobre otro verde).
- **Bug encontrado al armar la clase compartida:** `@apply group` no compila en Tailwind v4
  (`group` es solo un marcador para `group-hover:`, no una utilidad con propiedades reales) — se
  sacó del `@apply` y se dejó como una nota en el comentario de la clase para agregar `group` a
  mano en cada lugar donde se usa `.card-metallic`. Se corrigió antes de que llegara a romper el
  build.

**Archivos (este ajuste):** `src/styles/global.css` (nuevo), `src/components/FormSolicitud.tsx`,
`src/pages/index.astro`.

### Fase 6d — Formulario de registro (técnico como wizard de 4 pasos)

**✅ Implementado. Falta probar (no se pudo probar visualmente en este entorno — se verificó que
compila y que la ruta `/registro` no rompe en el servidor).**

**Contexto — qué pidió Jota exactamente:** no un rediseño de "los formularios" en general, sino
puntualmente el de **registro** (cliente y técnico) y, de última, cualquier pantalla de
cliente/técnico que hoy necesite mucho scroll. El único que realmente calificaba era el de
**registro de técnico** — es el formulario más largo de toda la app (datos de cuenta + perfil
público + especialidades con subcategorías dinámicas + cobro + términos, todo en una sola pantalla
larga). El de cliente es corto (6 campos), así que no se tocó su estructura, solo el layout que lo
envuelve.

**Cómo quedó:**
- **Nuevo componente compartido `src/components/WizardStepper.tsx`** (`StepperSidebar` +
  `StepperMobileBar`) — se extrajo del wizard de "Solicitar servicio" (Fase 6a), que tenía esa
  misma UI de progreso escrita inline. `FormSolicitud.tsx` se refactorizó para consumir este
  componente compartido en vez de tener su propia copia — mismo comportamiento, menos código
  repetido. Ahora que hay 2 wizards en la app (solicitud + registro técnico), vale la pena tenerlo
  centralizado para el día que haya un tercero.
- **`TecnicoForm` (dentro de `RegistroForm.tsx`) reescrito como wizard de 4 pasos:** 1) Cuenta
  (nombre, apellido, email, teléfono, contraseña) → 2) Tu perfil (nombre público, nick, años de
  experiencia, zona, descripción) → 3) Especialidades (checkboxes + subcategorías, tal cual
  funcionaba antes, sin tocar esa lógica) → 4) Confirmar (CVU, términos, aviso de verificación de
  identidad, botón final). Mismo criterio de seguridad que en el wizard de solicitud: **ningún
  botón es `type="submit"`**, el `<form>` bloquea el envío nativo siempre, y el envío real solo
  pasa con el click explícito en el botón del último paso — se aplicó desde el arranque para no
  repetir el bug que encontramos en la Fase 6a.
- **`ClienteForm` no se convirtió en wizard** (es corto, no lo necesita) — se dejó su lógica y
  campos intactos, solo se ajustó el contenedor que lo envuelve.
- **`RegistroForm` (el componente raíz que elige entre cliente/técnico) ajustado:** cuando el tab
  es "cliente", todo queda centrado y angosto (`max-w-md`, como antes); cuando es "técnico", usa
  todo el ancho disponible para que entre el sidebar de pasos — el ancho cambia solo, sin que haga
  falta recargar la página.
- `src/pages/registro.astro` ensanchado (`max-w-5xl`, antes `max-w-lg`) para que el wizard de
  técnico tenga lugar — el formulario de cliente se sigue viendo angosto y centrado igual que
  antes, porque `RegistroForm.tsx` ya lo autolimita internamente.

**Bug real encontrado por Jota al probar (no visual) — el alta de técnico no avisaba a nadie:**
al registrarse un técnico nuevo, `api/registro-tecnico.ts` ya creaba la fila en `tecnicos` con
`activo: false` (pendiente de aprobación) pero **nunca notificaba a nadie** — ni al propio técnico
(que no tenía forma de saber que su alta salió bien y que debía esperar aprobación, más allá del
aviso pasivo dentro de su panel) ni al admin (que solo se enteraba si entraba al panel y miraba la
sección "Técnicos pendientes de aprobación"). No estaba relacionado con el rediseño visual, ya
existía desde antes — recién se notó ahora al volver a probar el flujo completo.

Se agregó `notificarNuevoTecnico()` en `src/lib/notificaciones.ts` (mismo patrón que el resto de
las notificaciones de la app — email + notificación in-app), llamada al final de
`api/registro-tecnico.ts` como "mejor esfuerzo" (si falla el aviso, el alta del técnico igual queda
hecha, no se le devuelve error al usuario por esto):
- **Al admin:** email + notificación in-app avisando que hay un técnico nuevo esperando aprobación.
- **Al técnico:** email + notificación in-app confirmando que se recibió el registro y que está
  pendiente de aprobación.

**Falta probar (este ajuste):**
- [ ] Registrar un técnico nuevo → confirmar que llega el email al admin (`taitasoluciones@gmail.com`)
      y que aparece la notificación in-app (campanita) la próxima vez que el admin entre al panel.
- [ ] Confirmar que el técnico recién registrado recibe su propio email de "Recibimos tu registro"
      y ve la notificación en su campanita al entrar a su panel.

**Segundo ajuste post-feedback de Jota — dos huecos más en el mismo flujo:**

1. **Faltaba avisarle al técnico cuando el admin lo aprueba.** El botón "Aprobar" del admin
   (`dashboard/admin.astro`, acción `aprobar`) solo hacía `update({ activo: true })` sobre
   `tecnicos` — no llamaba a ninguna notificación, así que el técnico no tenía forma de enterarse
   de que ya podía recibir trabajos más que volviendo a entrar a su panel y notando que el aviso de
   "pendiente" ya no estaba. Se agregó `notificarTecnicoAprobado()` en `notificaciones.ts` (email +
   notificación in-app: "¡Tu cuenta fue aprobada!") y se llamó justo después del `update`, como
   "mejor esfuerzo" (try/catch — si falla el aviso, la aprobación en sí ya quedó hecha).

2. **Los emails al admin podían fallar en silencio.** El SDK de Resend (usado en `email.ts`) NO
   lanza una excepción cuando la API rechaza un envío (dominio no verificado, destinatario
   inválido, rate limit, etc.) — devuelve `{ data: null, error: {...} }` sin tirar error. Como
   `enviarEmail()` solo tenía un `try/catch` (para errores de red) y nunca miraba ese campo
   `error` de la respuesta, un envío rechazado por la API quedaba completamente invisible: no
   llegaba el mail y tampoco quedaba ningún log para diagnosticarlo. Se agregó el chequeo de
   `error` con un `console.error` — esto no garantiza por sí solo que el mail al admin llegue
   (si la causa era, por ejemplo, algún límite de la cuenta de Resend, eso sigue sin resolverse a
   nivel de código), pero de ahora en más cualquier rechazo va a quedar registrado en los logs de
   Vercel en vez de desaparecer sin dejar rastro.

**Falta probar (este segundo ajuste):**
- [x] Aprobar un técnico pendiente desde el panel de admin → confirmar que le llega el email
      "¡Tu cuenta de técnico fue aprobada!" y la notificación in-app correspondiente. **Confirmado
      por Jota: la notificación in-app ya aparece en la cuenta del técnico aprobado.**
- [x] Revisar en Resend si los emails de este flujo (`Nuevo técnico registrado: ...`) llegan al
      admin. **Confirmado por Jota viendo el dashboard de Resend: llegan "Delivered" — el aviso
      original de "no llega el correo" era un falso alarma, no un bug real.** El chequeo de `error`
      agregado en `email.ts` se deja igual, como red de seguridad para futuros rechazos silenciosos.

**Falta probar (resto de la fase):**
- [ ] Registro de cliente → confirmar que se ve igual de bien que antes (angosto, centrado) y que
      sigue funcionando el flujo completo de alta.
- [ ] Registro de técnico → recorrer los 4 pasos, confirmar que "Continuar" valida bien cada paso,
      que las especialidades/subcategorías siguen funcionando igual que antes, y que el alta
      completa (incluye la llamada a `/api/registro-tecnico`) sigue funcionando de punta a punta.
- [ ] Confirmar que Enter en cualquier campo del wizard de técnico NO dispara un envío prematuro
      (mismo bug que ya cazamos una vez en el wizard de solicitud, corregido preventivamente acá).
- [ ] Ver en mobile → sidebar reemplazado por la barra compacta "Paso X de 4".
- [ ] Confirmar que `/solicitud` (el otro wizard, que ahora comparte el componente `WizardStepper`)
      sigue funcionando exactamente igual que antes de la refactorización — riesgo bajo (extracción
      mecánica) pero vale la pena confirmarlo.

**Archivos:** `src/components/WizardStepper.tsx` (nuevo), `src/components/RegistroForm.tsx`,
`src/components/FormSolicitud.tsx` (refactor para usar el stepper compartido),
`src/pages/registro.astro`.

### Fase 6 — cierre (resto de las pantallas)

**✅ Implementado y confirmado por Jota (2026-08-07).** Se completó todo lo que había quedado
pendiente al cerrar Fase 6d:

- **Cards de técnico en el wizard** (paso "¿Quién puede tocarte?" de `FormSolicitud.tsx`) — pasaron
  a ser cards metalizadas verdes (mismo estilo que el resto de la app), con botón "Ver perfil" en
  ámbar para contraste.
- **`/tecnicos`** (listado general) — header en banda verde, buscador+filtros en card blanca
  flotante, cards de técnico rediseñadas (avatar con anillo, badge de disponibilidad con punto de
  estado, rating con íconos SVG en vez de emojis, botón "Ver perfil" full-width). Archivos:
  `src/pages/tecnicos/index.astro`, `src/components/FiltroTecnicos.tsx`.
- **Listados de solicitudes** (`MisSolicitudes.tsx` cliente, `SolicitudesTecnico.tsx` técnico) —
  cada solicitud es su propia card (`rounded-3xl`, sombra, `border-l-8` de acento + fondo con tinte
  suave del color del estado — nunca color sólido, para no perder legibilidad), `#numero` como chip
  + título grande en serif, badge de estado más grande, botones de acción agrupados al pie con
  tamaño más grande (`text-sm`, `flex-1` en mobile para ocupar todo el ancho). Mismo tratamiento de
  tamaño de texto/botones aplicado a los componentes de acción compartidos (`CancelarSolicitud`,
  `ResenaForm`, `ResponderAsignacion`, `CompletarTrabajo`, `CerrarServicio`), que también se usan
  en las pantallas de detalle.
- **Admin — banner de técnicos pendientes** (`dashboard/admin.astro`) — acento ámbar en el header
  con ícono y contador ("N por revisar"), cada técnico pendiente es su propia card con acento
  ámbar, botones Aprobar/Rechazar full-width y más prominentes. Resto del dashboard admin (stats,
  accesos rápidos, tabla de solicitudes recientes) revisado y dejado igual — ya estaba alineado con
  la paleta del resto del sitio; la tabla es intencionalmente una tabla de gestión, no cards.
- **Pantallas de detalle de solicitud** (cliente y técnico) — header convertido a card metalizada
  verde (número + título + badge de estado), "Desglose financiero"/"Tu ganancia" también
  metalizados, con el total en ámbar.
- **Stats de los dashboards** (`dashboard/cliente.astro`, `dashboard/tecnico.astro`) — las cards de
  estadísticas (pendientes, en curso, completadas, finalizadas, ganancias) pasaron a ser cards
  metalizadas verdes, con cada número en un color claro que contrasta contra el fondo oscuro (ámbar,
  celeste, blanco, verde claro, violeta claro).
- **Insignia de Mercado Pago** — como no hay forma segura de descargar el logo oficial de la marca
  (se evitó hotlinkear una URL externa inventada), se armó una insignia propia liviana (ícono de
  tarjeta + texto "Mercado Pago", colores de marca) en `src/components/MercadoPagoBadge.tsx` /
  `.astro`. Se agregó en el botón "Pagar" del cliente, en el aviso "Pago acreditado", en el detalle
  y listado del técnico, y en la tabla/detalle de solicitud del admin. Si se consigue el asset
  oficial más adelante, reemplazar ahí nomás.
- **Ajuste de navegación** — el link "Ver perfil" de las cards de técnico en el wizard ya no abre
  pestaña nueva (navega en la misma pestaña); en `/tecnicos/[id].astro`, el link "Volver" ahora es
  dinámico: si `document.referrer` es del mismo origen, usa `history.back()` (vuelve exactamente a
  donde estaba el usuario, ej. al paso 2 del wizard con su progreso intacto vía `bfcache` del
  navegador) en vez de siempre ir a `/tecnicos`.

**Archivos:** `src/components/FormSolicitud.tsx`, `src/pages/tecnicos/index.astro`,
`src/components/FiltroTecnicos.tsx`, `src/components/MisSolicitudes.tsx`,
`src/components/SolicitudesTecnico.tsx`, `src/components/{CancelarSolicitud,ResenaForm,
ResponderAsignacion,CompletarTrabajo,CerrarServicio}.tsx`, `src/pages/dashboard/admin.astro`,
`src/pages/dashboard/{cliente,tecnico}.astro`, `src/pages/dashboard/{cliente,tecnico,admin}/
solicitud/[id].astro`, `src/components/MercadoPagoBadge.{tsx,astro}` (nuevos),
`src/pages/tecnicos/[id].astro`.

---

## Mejoras finales — Fase 7 — sesión 2026-08-07 en adelante

### Fase 7a — Subitems con precio en el wizard

**✅ Implementado, falta correr el SQL en Supabase y probar.**

La tabla `categoria_subitems` (sub-ítems de una categoría, cada uno con su propio precio y % de
tasa) y su UI de administración (`GestionCategorias.tsx`) ya existían de antes, pero nunca se
usaban del lado del cliente — el wizard de "Solicitar servicio" solo dejaba elegir la categoría
"madre". Ahora, en el Paso 1 "Servicio", si la categoría elegida tiene sub-ítems activos, aparecen
como botones seleccionables con precio debajo del grid de categorías ("¿Cuál de estos es tu
caso?"). Elegir uno pisa el precio/tasa de la categoría por el del sub-ítem específico en toda la
solicitud (estimación del Paso 6, payload que se envía al crear). No elegir ninguno (o categoría
sin sub-ítems) deja el comportamiento de siempre.

**SQL pendiente de correr en Supabase:**
```sql
ALTER TABLE solicitudes ADD COLUMN categoria_subitem_id uuid REFERENCES categoria_subitems(id);
```

**Archivos:**
- `src/pages/solicitud.astro` — consulta `categoria_subitems` (activos) y los pasa al wizard.
- `src/components/FormSolicitud.tsx` — UI de selección en el Paso 1, estado `subitemId` (se
  resetea al cambiar de categoría), cálculo de precio/tasa/total prioriza el sub-ítem elegido,
  resumen del Paso 6 muestra el sub-ítem si hay uno, payload incluye `categoriaSubitemId`.
- `src/pages/api/crear-solicitud.ts` — acepta `categoriaSubitemId` opcional, lo guarda en
  `solicitudes.categoria_subitem_id`.
- `src/pages/dashboard/admin/solicitud/[id].astro` — muestra el sub-ítem elegido (si lo hay) en
  "Detalles del trabajo".

**Falta probar:**
- [ ] Correr el `ALTER TABLE` de arriba en el SQL Editor de Supabase (si no se corre, el insert de
      `crear-solicitud.ts` va a fallar en cuanto se elija un sub-ítem, porque la columna no existe).
- [ ] Crear una solicitud eligiendo una categoría con sub-ítems cargados, elegir uno con precio →
      confirmar que el Paso 6 muestra el precio de ESE sub-ítem (no el de la categoría) y que la
      solicitud creada tiene `precio_base`/`tasa_aplicada`/`categoria_subitem_id` correctos.
    - Nota: para probar esto hace falta que el admin haya cargado al menos un sub-ítem con precio
      en `/dashboard/admin/categorias` (expandir una categoría con la flechita ▸).
- [ ] Crear una solicitud con una categoría SIN sub-ítems (o sin elegir ninguno) → confirmar que
      sigue funcionando exactamente igual que antes.
- [ ] Ver el detalle de la solicitud como admin → confirmar que aparece "Detalle del servicio: X"
      cuando se eligió un sub-ítem.

### Fase 7b — Canal de "Solicitar cotización" con chat cliente↔admin

**✅ Implementado, falta correr el SQL en Supabase, crear el bucket de Storage, y probar de punta a
punta.** Es la fase más grande del plan — resumen del flujo completo:

```
Cliente tilda "Solicitar cotización" (Paso 1 del wizard) → describe el problema + sube fotos
(Paso 3) → se crea la solicitud en estado `en_cotizacion`, sin precio, con el primer mensaje del
chat ya cargado (la descripción + fotos)
        │
        ▼
Admin la ve en la cola "Cotizaciones pendientes" del panel → entra al detalle → chatea con el
cliente (`ChatCotizacion`) → cuando tiene un precio, lo envía con `EnviarCotizacion` (precio + %
tasa) → la solicitud SIGUE en `en_cotizacion`, pero ahora con precio cargado
        │
        ▼
Cliente ve el precio en su panel (card "Desglose financiero", que ya soportaba precio null desde
antes) y responde con `ResponderCotizacion`:
        ├── Acepta → estado pasa a `pendiente` → sigue el flujo normal (admin asigna técnico)
        └── Rechaza → estado pasa a `cancelada`
```

**Notificaciones (email + in-app), en cada paso — punto por punto, tal como se pidió:**
- Solicitud de cotización creada → `notificarNuevaSolicitud` (ya existía, sin cambios) avisa al
  cliente (confirmación) y al admin (nueva solicitud a atender).
- Cada mensaje nuevo del chat → `notificarMensajeCotizacion` avisa siempre al OTRO participante
  (nunca a quien escribió), con preview del mensaje.
- Admin envía el precio → `notificarCotizacionEnviada` avisa al cliente con el monto.
- Cliente responde → **dos avisos separados, a propósito** (ver "hueco encontrado" más abajo):
  `notificarCambioEstado` hace la transición real de estado (con su aviso genérico de siempre), y
  además `notificarCotizacionRespuesta` le manda al admin un mensaje explícito ("El cliente aceptó
  / rechazó la cotización") — sin esto, el rechazo (→ `cancelada`) no le llegaba nada al admin (esa
  función genérica no tiene caso especial para admin en `cancelada`), y la aceptación solo le
  llegaba como el mensaje genérico de "volvió a pendiente", sin decir que fue por una cotización.

**SQL pendiente de correr en Supabase:**
```sql
-- 1. Nuevo estado en el CHECK constraint (mismo mecanismo que Fase 4/5: drop + recreate)
ALTER TABLE solicitudes DROP CONSTRAINT solicitudes_estado_check;
ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_estado_check
  CHECK (estado IN ('pendiente','asignada','aceptada','en_curso','completada','finalizada','cancelada','en_cotizacion'));

-- 2. Columna que marca que la solicitud pasó por el canal de cotización (se mantiene en true
-- aunque el estado ya haya avanzado a pendiente/cancelada, para conservar el chat visible como historial)
ALTER TABLE solicitudes ADD COLUMN es_cotizacion boolean NOT NULL DEFAULT false;

-- 3. Tabla del chat
CREATE TABLE cotizacion_mensajes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id  uuid NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  usuario_id    uuid NOT NULL REFERENCES usuarios(id),
  mensaje       text NOT NULL,
  imagenes      text[],
  creado_en     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cotizacion_mensajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cotizacion_mensajes: cliente o admin ven" ON cotizacion_mensajes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM solicitudes s WHERE s.id = solicitud_id AND s.cliente_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo = 'admin')
  );
-- Los INSERT los hace siempre el servidor con el service role (createSupabaseAdmin), como el resto
-- de la app — no hace falta política de INSERT para el flujo normal.

-- 4. Bucket de Storage para las fotos que sube el cliente (público, mismo criterio que 'trabajos')
INSERT INTO storage.buckets (id, name, public) VALUES ('cotizaciones', 'cotizaciones', true) ON CONFLICT DO NOTHING;
CREATE POLICY "cotizaciones_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cotizaciones');
CREATE POLICY "cotizaciones_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'cotizaciones');
```

**Nota sobre Realtime:** la política de SELECT de `cotizacion_mensajes` tiene un `EXISTS`/JOIN, que
por el mismo motivo documentado en `docs/guia-notificaciones-realtime-supabase.md` rompe Realtime
en silencio. Por eso el chat NO escucha esa tabla directo — escucha `notificaciones` (política
simple) como disparador de refetch, igual que `MisSolicitudes.tsx`/`SolicitudesTecnico.tsx`/
`NotificacionesBell.tsx`. Cada mensaje nuevo genera una notificación normal para el otro
participante, así que ya sirve como esa señal.

**Archivos nuevos:**
- `src/pages/api/cotizacion/mensaje.ts` (POST — mandar un mensaje), `mensajes.ts` (GET — historial),
  `enviar.ts` (POST, solo admin — fija precio/tasa), `responder.ts` (POST, solo cliente dueño —
  aceptar/rechazar).
- `src/components/ChatCotizacion.tsx` (widget de chat, cliente y admin comparten el componente),
  `EnviarCotizacion.tsx` (form del admin para el precio), `ResponderCotizacion.tsx` (aceptar/
  rechazar del cliente, mismo patrón de modal que `ResponderAsignacion.tsx`).

**Archivos modificados:**
- `src/lib/notificaciones.ts` — `notificarMensajeCotizacion`, `notificarCotizacionEnviada`,
  `notificarCotizacionRespuesta` (nuevas), `ESTADO_LABEL` con `en_cotizacion`.
- `src/components/FormSolicitud.tsx` — checkbox "¿No encontrás lo que buscás? Pedí una cotización"
  en el Paso 1 (excluyente con elegir un sub-ítem — uno implica precio conocido, el otro no);
  Paso 3 pide descripción obligatoria (antes opcional, validado a mano en `siguiente()` porque el
  schema Zod base la sigue teniendo opcional para el flujo normal) + carga de hasta 5 fotos (mismo
  patrón de subida directa a Storage que `CompletarTrabajo.tsx`, bucket `cotizaciones`); Paso 6 y
  pantalla de éxito con copy distinto para este canal.
- `src/pages/api/crear-solicitud.ts` — acepta `esCotizacion`/`imagenesCotizacion`; si viene tildado,
  fuerza `estado: 'en_cotizacion'`, `es_cotizacion: true`, precio/tasa/total en `null` (server-side,
  sin confiar en lo que mande el cliente), e inserta el primer mensaje del chat con la descripción
  + fotos ya cargadas en el wizard.
- `src/pages/dashboard/admin.astro` — nueva sección "Cotizaciones pendientes" (mismo banner ámbar
  que "Técnicos pendientes de aprobación"), cards linkeando al detalle, con badge "Esperando tu
  cotización" o "Esperando respuesta del cliente" según si ya se mandó precio.
- `src/pages/dashboard/admin/solicitud/[id].astro` — card "Cotización" (chat + form de enviar
  precio) cuando `es_cotizacion`; la sección de asignar técnico se reemplaza por un aviso mientras
  el estado siga en `en_cotizacion`; `en_cotizacion` agregado al `<select>` de cambiar estado como
  opción deshabilitada (para que se muestre bien seleccionada en vez de caer a "Pendiente" por
  default cuando ese es el estado real).
- `src/pages/dashboard/cliente/solicitud/[id].astro` — card "Cotización" (chat) cuando
  `es_cotizacion`; card "¿Aceptás esta cotización?" cuando hay precio esperando respuesta; el
  timeline ahora arranca en "En cotización" en vez de "Pendiente" para estas solicitudes; se puede
  cancelar directamente desde `en_cotizacion` (antes de recibir precio, no hace falta esperar).
- `src/components/MisSolicitudes.tsx`, `src/components/TablaSolicitudesAdmin.tsx` — label/color de
  `en_cotizacion` agregado a los mapas de estado (mismo patrón que cada fase que suma un estado).
- `src/pages/dashboard/cliente.astro` — el contador "Solicitudes pendientes" ahora incluye
  `en_cotizacion` (para el cliente, esperar un precio es tan "pendiente" como esperar un técnico).

**Falta probar:**
- [ ] Correr el SQL de arriba (constraint + columna + tabla + bucket) — sin esto nada de lo demás
      funciona.
- [ ] Pedir una cotización desde el wizard (categoría + descripción + 2 fotos) → confirmar que la
      solicitud queda en `en_cotizacion`, sin precio, y que el primer mensaje del chat tiene las
      fotos.
- [ ] Como admin: aparece en "Cotizaciones pendientes" → entrar, mandar un mensaje → el cliente
      recibe notificación + email y lo ve en su panel.
- [ ] Admin envía la cotización (precio + tasa) → cliente recibe notificación + email con el monto,
      ve la card "¿Aceptás esta cotización?".
- [ ] Cliente acepta → pasa a `pendiente`, el admin ya puede asignar técnico con el precio cargado,
      y le llega al admin el aviso explícito de "El cliente aceptó la cotización".
- [ ] Cliente rechaza (en otra solicitud de prueba) → pasa a `cancelada`, y le llega al admin el
      aviso explícito de "El cliente rechazó la cotización" (antes de este ajuste, este caso no le
      avisaba nada al admin).
- [ ] Cancelar una solicitud en `en_cotizacion` antes de recibir precio (desde el detalle del
      cliente) → confirmar que funciona igual que cancelar cualquier otra solicitud.
- [ ] Revisar en mobile — el chat, el form de enviar cotización, y las cards de la cola de admin.

**Ajustes post-feedback de Jota (primera ronda de pruebas, funcionó bien de punta a punta):**

1. **El chat arrastraba el scroll de toda la página.** `ChatCotizacion.tsx` usaba
   `scrollIntoView()` sobre el último mensaje para bajar solo al final de la conversación, pero eso
   también arrastraba el scroll de la página entera hacia el chat cada vez que se entraba al
   detalle o llegaba un mensaje nuevo. Se rediseñó el componente para que arranque **colapsado**
   (botón "💬 Abrir chat" con badge de mensajes no leídos, calculado comparando contra la última vez
   que se abrió — guardado en `localStorage`, no en la base) y solo se despliegue al hacer click;
   el scroll interno ahora usa `scrollTop` sobre el contenedor del chat en vez de `scrollIntoView`,
   así nunca vuelve a mover la página.
2. **La cotización enviada por el admin no aparecía sola en el panel del cliente** — había que
   recargar a mano para ver el precio y el botón de aceptar/rechazar. Causa: la policy de SELECT de
   `solicitudes` combina la del cliente (simple, `cliente_id = auth.uid()`) con las de técnico/admin
   (con `EXISTS`/JOIN) sobre la misma tabla — y como está documentado en
   `guia-notificaciones-realtime-supabase.md`, eso rompe Realtime para todos los suscriptores de esa
   tabla, no solo para el rol con la policy problemática. Se agregó una segunda suscripción de
   `CambiosEnVivo` sobre `notificaciones` (policy simple, sin JOIN) como disparador de respaldo, en
   ambas pantallas de detalle (cliente y admin) — mismo patrón ya usado en el resto de la app.

3. **Al aceptar/rechazar, el cliente no recibía una confirmación clara de su propia acción** — solo
   le llegaba el aviso genérico de `notificarCambioEstado` ("Cambió de estado a Pendiente/
   Cancelada"), sin contexto de que fue por responder la cotización. `notificarCotizacionRespuesta`
   ahora también le manda al cliente un email + notificación explícitos ("Aceptaste la cotización" /
   "Rechazaste la cotización"), además del aviso al admin que ya tenía.

**Archivos de este ajuste:** `src/components/ChatCotizacion.tsx`,
`src/pages/dashboard/{cliente,admin}/solicitud/[id].astro`, `src/lib/notificaciones.ts`.

---

## ¿Qué queda del plan de "mejoras finales"?

Repaso contra los 8 puntos originales de `docs/taita-mejoras-finales.md` (2026-08-07):

| # | Punto original | Estado |
|---|---|---|
| 1 | Subitems con precio al elegir categoría, con opción de cotización si no hay match | ✅ Fase 7a/7b |
| 2 | Mapa (Leaflet) en el form de solicitud + detalle | ✅ Fase 3 |
| 3 | Nueva opción "Solicitar Cotización" (chat cliente↔admin) | ✅ Fase 7b |
| 4 | Rediseño visual del form + demás pantallas | ✅ Fase 6 |
| 5 | Botón del técnico para dar por terminado el servicio | ✅ Fase 5 |
| 6 | Previsualizar PDF del recibo | ✅ Fase 1 |
| 7 | Mostrar `#numero` de solicitud en toda la web | ✅ Fase 2 |
| 8 | Admin elige franja horaria al asignar técnico | ✅ Fase 4 |

**Los 8 puntos ya están implementados en código.** Lo único que queda de este plan es lo
operativo: correr el SQL pendiente de 7a/7b en Supabase y que Jota/Agustín prueben de punta a
punta (checklist en las secciones de Fase 7a/7b más arriba). No hay ningún punto del plan original
sin arrancar.

**Fuera del plan de "mejoras finales" pero anotado en el doc de antes** (no bloquea nada de lo de
arriba, son frentes aparte): cron externo para automatizar `Aceptada → En curso` en producción,
WhatsApp, y cargar credenciales reales de Mercado Pago en Vercel — los tres son pasos operativos/
de cuentas de terceros, no código pendiente (ver "Pendientes externos" al principio del documento).

**Agregado el 2026-08-07, fuera del plan original (pedido nuevo de Jota):** búsqueda con filtros
seleccionables (no de texto) para los listados de solicitudes de cliente/técnico/admin, con
resultados en tiempo real — ver sección más abajo.

---

## Búsqueda por filtros seleccionables en los listados de solicitudes

**✅ Implementado.** Pedido de Jota: en vez de una barra de texto, filtros por estado (chips,
multi-selección) y categoría (dropdown) en los tres listados de solicitudes — cliente, técnico y
admin —, incluyendo el estado `en_cotizacion`. Los resultados se traen del servidor (no es un
filtro solo de la página cargada — respeta la paginación existente) y conviven con el refresco en
tiempo real que ya tenía cada listado (vía `notificaciones`): tocar un filtro dispara su propio
refetch desde la página 1, y cuando llega una notificación nueva el refetch "silencioso" reusa los
filtros activos en ese momento (se guardan en un `ref`, mismo patrón que ya se usaba para la
página actual).

- **Cliente** (`MisSolicitudes.tsx`): 6 chips agrupados igual que ya se le muestran los estados
  (ej. "Pendiente" cubre `pendiente`+`asignada`, "Completada" cubre `completada`+`finalizada`) —
  no tiene sentido exponerle los 8 valores crudos si en el resto de la pantalla ya se los agrupa.
- **Técnico** (`SolicitudesTecnico.tsx`): 6 chips, sin agrupar ni incluir `pendiente`/
  `en_cotizacion` — estructuralmente un técnico nunca tiene una solicitud en esos estados (esta
  lista ya viene filtrada por su propio `tecnico_id`, que recién existe desde `asignada`).
- **Admin** (`TablaSolicitudesAdmin.tsx`): los 8 estados crudos, sin agrupar — es la vista de
  gestión.

**Archivos:** `src/components/FiltrosSolicitudes.tsx` (nuevo, compartido por los tres), los tres
componentes de listado de arriba, `src/pages/api/{cliente,tecnico,admin}/solicitudes.ts` (aceptan
`estados` (csv) y `categoriaId` como query params), y `src/pages/dashboard/{cliente,tecnico,
admin}.astro` (pasan la lista de categorías activas como prop nueva).

**Falta probar:**
- [ ] Tocar chips de estado (incluyendo "En cotización") y el dropdown de categoría en cada uno de
      los tres paneles → confirmar que la lista se actualiza sola, sin recargar la página.
- [ ] Combinar estado + categoría a la vez, y "Limpiar filtros".
- [ ] Con un filtro activo, generar un evento que dispare el refresco en tiempo real (ej. otra
      solicitud cambiando de estado) → confirmar que el resultado sigue respetando el filtro activo
      en vez de mostrar todo de nuevo.
- [ ] Paginado del admin/cliente con un filtro activo — confirmar que pasar de página mantiene el
      filtro.

---

## Fase 8 — Verificación de email, privacidad, franja horaria negociada, y ajustes de admin

**✅ Implementada de punta a punta (8.1 a 8.8), falta correr el SQL en Supabase, la configuración
de Custom SMTP/template de confirmación, y probar todo.** Plan completo (con el análisis punto por
punto) guardado en la sesión — acá el resumen ejecutable.

### SQL pendiente de correr en Supabase (todo junto, un solo bloque)

```sql
-- Fase 8.1 — verificación de email del cliente
ALTER TABLE usuarios ADD COLUMN email_verificado boolean NOT NULL DEFAULT false;
ALTER TABLE usuarios ADD COLUMN email_verificado_notificado boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.sync_email_verificado()
RETURNS trigger AS $$
BEGIN
  UPDATE public.usuarios
  SET email_verificado = (NEW.email_confirmed_at IS NOT NULL)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_email_verificado();

-- Fase 8.5 — descripción de sub-ítems
ALTER TABLE categoria_subitems ADD COLUMN descripcion text;

-- Fase 8.4 — franja horaria negociada
ALTER TABLE solicitudes ADD COLUMN franja_solicitada text;
ALTER TABLE solicitudes ADD COLUMN horario_confirmado_cliente boolean NOT NULL DEFAULT false;
```

**Además, dos pasos de configuración en el panel de Supabase (no son SQL):**
1. **Authentication → Providers → Email → "Confirm email"**: confirmar que esté activado (se
   había prendido en junio, verificar que siga así).
2. **Authentication → Settings → SMTP Settings**: cargar Custom SMTP con las credenciales de Resend
   (`host: smtp.resend.com`, `port: 465`, `user: resend`, `password: <RESEND_API_KEY>`) para que el
   mail de confirmación salga desde el dominio propio en vez del genérico de Supabase (que además
   tiene un límite muy bajo de envíos/hora). Después, en **Authentication → Email Templates →
   "Confirm signup"**, pegar un HTML con el estilo de Taita (mismo header verde + logo que ya usa
   `plantillaEmail()` en `src/lib/email.ts`) — pedime el HTML armado cuando vayas a cargarlo y te lo
   paso listo para pegar.

### 8.1 — Verificación de email restrictiva (solo cliente)

El técnico **no** pasa por este flujo (ya tiene su propia aprobación manual del admin) — para el
registro de técnico se hizo más simple: `RegistroForm.tsx` (`TecnicoForm`) pasó a `mode: 'onBlur'`
en el `useForm`, así el error de formato de email (y del resto de los campos) aparece apenas se
sale del campo, no recién al mandar el wizard entero.

Para el cliente:
- Chequeo de MX del dominio (gratis, con el módulo `dns` de Node, sin servicio externo) antes del
  signup — `src/pages/api/verificar-dominio-email.ts`, llamado desde `ClienteForm` en
  `RegistroForm.tsx`. Bloquea el registro si el dominio no tiene servidores de correo.
- Si "Confirm email" está activo en Supabase, `signUp()` no deja sesión iniciada — `ClienteForm`
  ahora detecta esto (`!authData.session`) y muestra una pantalla de "confirmá tu correo" en vez de
  redirigir a un panel al que todavía no puede entrar.
- **Importante:** "Confirm email" es una config **global** de Supabase Auth — no se puede activar
  "solo para cliente" desde el panel, porque `tipo` (cliente/técnico/admin) es un concepto de la
  tabla `usuarios` de la app, no algo que Supabase Auth conozca. Por eso `TecnicoForm` (mismo
  archivo) recibió el mismo fix de `!authData.session` que `ClienteForm` — si no, el registro de
  técnico se hubiera roto en cuanto se activara el toggle (quedaba redirigiendo a `/dashboard/
  tecnico`, ruta protegida, sin sesión). La diferencia es que al técnico **no** se le exige nada
  extra por esto — no tiene botón bloqueado ni banner — solo evita el redirect roto; ya tiene su
  propio gate (aprobación manual del admin) independientemente de si confirmó el email o no.
- `usuarios.email_verificado` se mantiene sincronizado solo (trigger de arriba) — no hace falta
  ninguna llamada a la Admin API de Supabase Auth para leerlo, es una columna más.
- El botón "Enviar solicitud" (`FormSolicitud.tsx`) queda `disabled` mientras `email_verificado`
  sea `false`, con un botón de "Reenviar email" (`supabase.auth.resend`). `src/pages/solicitud.astro`
  resuelve el flag server-side.
- Banner ámbar persistente en `dashboard/cliente.astro` mientras no esté verificado.
- Notificaciones nuevas en `notificaciones.ts`: `notificarClientePendienteVerificacion` (al
  registrarse — cliente y admin) y `notificarEmailVerificado` (al confirmar — cliente y admin). El
  momento de "recién confirmó" se detecta server-side en `dashboard/cliente.astro` (reusa la
  consulta que ya hacía para el perfil, sin llamadas nuevas) comparando `email_verificado` contra
  `email_verificado_notificado`, en vez de un listener client-side de Supabase Auth — más simple y
  sin ambigüedad entre "recién confirmó" y "es un login normal".

**Archivos:** `src/lib/notificaciones.ts`, `src/pages/api/verificar-dominio-email.ts` (nuevo),
`src/pages/api/cliente/registro-notificar.ts` (nuevo), `src/components/RegistroForm.tsx`,
`src/components/FormSolicitud.tsx`, `src/pages/solicitud.astro`, `src/pages/dashboard/cliente.astro`.

**Ajustes hechos durante las pruebas en vivo (11-ago):**
- **Email duplicado al registrarse:** `notificarClientePendienteVerificacion` le mandaba al cliente
  un segundo correo ("confirmá tu correo") además del que ya manda Supabase con el link real —
  quedaba confuso (dos correos, uno sin link). Se sacó ese email del cliente; la función ahora solo
  avisa al admin por correo + deja la notificación in-app al cliente (sin email aparte).
- **`?error=access_denied&error_code=otp_expired...` crudo en la URL:** el link de confirmación, al
  fallar (vencido, ya usado), volvía a la home con el error crudo en la URL sin ningún mensaje.
  Faltaba además un lugar claro para pedir que reenvíen el link sin estar logueado.
- **La redirección post-confirmación mandaba a la home, deslogueado, sin indicación de qué hacer:**
  se decidió que el flujo correcto es que la confirmación **no** intente loguear solo (poco fiable
  entre navegadores/dispositivos) sino que lleve siempre a un paso explícito de login. Cambios:
  - `emailRedirectTo` en `RegistroForm.tsx` (cliente y técnico) pasa de `origin + '/'` a
    `origin + '/login'`.
  - `src/components/AuthRedirectBanner.tsx` (nuevo, reemplaza el intento anterior
    `AuthErrorBanner.tsx`) se monta en `login.astro` y cubre los dos casos: error (banner ámbar con
    mensaje claro según `error_code` + campo de email para reenviar la confirmación vía
    `supabase.auth.resend`) y éxito (banner verde "tu correo fue confirmado, iniciá sesión").
  - El caso de éxito se detecta con un `<script is:inline>` síncrono en `login.astro` que lee
    `type=signup` + `access_token` del hash **antes** de que hidrate ningún island, y lo guarda en
    `sessionStorage` — a propósito no toca el hash él mismo, porque el SDK de Supabase todavía lo
    necesita intacto para su propio intento de auto-login (`detectSessionInUrl`). El caso de error sí
    se limpia de la URL directamente (confirmado en el código de `@supabase/auth-js` que ese caso
    nunca lo toca el SDK, no hay conflicto).
- **Login sin confirmar mostraba "Email o contraseña incorrectos":** Supabase distingue el error
  `email_not_confirmed` de credenciales inválidas — `LoginForm.tsx` ahora lo detecta aparte y
  muestra un banner ámbar específico ("todavía no confirmaste tu correo") con su propio botón de
  reenviar, en vez del mensaje genérico que hacía pensar que la contraseña estaba mal.
- **Sin botón de guardar visible en sub-ítems de categoría** (`GestionCategorias.tsx`): se guardaba
  solo, con `onBlur`, sin ningún indicio visual. Se extrajo `SubitemRow` con estado controlado y un
  botón explícito "Guardar" con ícono de guardado, que pasa a "Guardando…" / "¡Guardado!" (reusa el
  hook `useSaveState` que ya existía en el archivo).

**Archivos de estos ajustes:** `src/lib/notificaciones.ts`, `src/components/AuthRedirectBanner.tsx`
(nuevo), `src/pages/login.astro`, `src/components/RegistroForm.tsx`, `src/components/LoginForm.tsx`,
`src/components/GestionCategorias.tsx`.

### 8.2 — Badge de verificación en Gestión de usuarios (admin)

Badge "✅ Verificado" / "⏳ Sin verificar" junto al email, solo en la pestaña "Clientes" de
`GestionUsuarios.tsx` (el técnico no pasa por este flujo). **Archivos:**
`src/pages/dashboard/admin/usuarios.astro`, `src/components/GestionUsuarios.tsx`.

### 8.3 — Categorías del técnico visibles en Gestión de usuarios (admin)

El dato ya existía (`especialidades_tecnico`) — era un hueco de display nomás. Chips de categoría
en la fila expandida de cada técnico. **Archivos:** `src/pages/dashboard/admin/usuarios.astro`,
`src/components/GestionUsuarios.tsx`.

### 8.4 — Franja horaria negociada con confirmación del cliente + reprogramación

**Diseño finalmente implementado (más simple que el planificado originalmente, mismo resultado,
bastante menos riesgo):** en vez de que la confirmación del cliente y la del técnico se combinen
para gatillar juntas el pasaje a `aceptada` (lo que hubiera obligado a tocar el flujo de
`ResponderAsignacion.tsx` ya probado y funcionando), quedaron como **dos cosas independientes que
corren en paralelo**:
- El técnico sigue confirmando la asignación exactamente igual que siempre (`ResponderAsignacion.tsx`
  sin cambios) — eso sigue moviendo el estado a `aceptada` como ya hacía.
- El cliente, por su lado, tiene que confirmar el horario (`horario_confirmado_cliente`) — si lo
  rechaza, la solicitud vuelve a `pendiente` (desasigna al técnico, mismo mecanismo que ya usaba el
  dropdown "volver a Pendiente" del admin) para que se reprograme, sin importar en qué estado
  estuviera. Cero cambios en el código ya probado del técnico.

**Otro cambio pedido durante la sesión:** el cliente ya no elige un horario puntual en el wizard
(se sacó la grilla de franjas de 30') — solo elige la franja amplia (mañana/tarde/noche),
obligatoria. Internamente se sigue guardando una `hora_solicitada` representativa de esa franja
(09:00/14:00/19:00 según corresponda) porque `chequearDisponibilidad`/`franjaDeHora` (flujo de
pedir directo a un técnico fijo desde su perfil) siguen necesitando un horario puntual para
detectar choques de agenda — el cliente nunca ve ni elige ese valor, es interno.

**⚠️ Atención — efecto secundario de sacar el horario puntual:** para el flujo de "pedir servicio
directo a un técnico" (`/solicitud?tecnico=...`), el chequeo de choque de agenda
(`chequearDisponibilidad`) ahora compara contra esos 3 horarios representativos fijos en vez de 30
minutos de granularidad real — dos clientes eligiendo la misma franja "chocan" en el chequeo
aunque en la realidad el técnico tuviera lugar para los dos en horarios distintos dentro de esa
franja. No bloquea nada (el sistema ya sabe sugerir la fecha/hora libre más cercana), pero vale la
pena que lo tengas en cuenta si notás que sugiere reprogramar más seguido de lo esperado en ese
flujo puntual — quedó anotado para una vuelta futura si hace falta afinarlo.

**Flujo final:**
```
Cliente elige franja (Paso 4 del wizard) → admin asigna técnico + horario + franja (coordinado
con el técnico, en la app o por fuera) → cliente ve "¿Te sirve este horario?" en su panel:
  ├── Confirma → horario_confirmado_cliente = true (independiente de que el técnico ya haya
  │   confirmado o no la asignación en sí)
  └── Rechaza → vuelve a `pendiente`, se desasigna el técnico (con su aviso), el admin la ve de
      nuevo en su cola normal para reprogramar con otro horario
```

**Notificaciones nuevas:** `notificarHorarioPropuesto` (admin asigna → cliente) y
`notificarHorarioRespuesta` (cliente responde → admin, explícito, igual criterio que
`notificarCotizacionRespuesta` en Fase 7b). Reemplaza a la vieja `notificarFranjaAsignada` (Fase 4,
solo informativa cuando la franja no coincidía) — ahora se avisa siempre, porque hace falta una
respuesta activa, coincida o no con lo que pidió el cliente.

**Archivos nuevos:** `src/components/ResponderHorario.tsx`, `src/pages/api/cliente/
responder-horario.ts`. **Modificados:** `src/lib/notificaciones.ts`, `src/components/
FormSolicitud.tsx` (Paso 4 sin grilla de hora, franja obligatoria), `src/pages/api/crear-solicitud.ts`,
`src/pages/dashboard/admin/solicitud/[id].astro`, `src/pages/dashboard/cliente/solicitud/[id].astro`.

### 8.6 — Privacidad: el técnico ya no ve el teléfono del cliente

Bug confirmado y corregido en `src/pages/dashboard/tecnico/solicitud/[id].astro` — mostraba
`cliente.telefono` directo en la card "Cliente". El lado cliente→técnico ya estaba bien (nunca
mostró el teléfono del técnico, a propósito). Ahora ninguno de los dos ve el contacto del otro —
solo el admin.

### 8.7 y 8.8 — Label del wizard + notificaciones responsive

- `FormSolicitud.tsx`: el paso 2 del wizard pasó de "Técnico" a "Técnicos Sugeridos" (label del
  stepper, sin tocar el título interno del paso).
- `NotificacionesBell.tsx`: el dropdown pasó de `absolute right-0 w-80` (podía quedar parcialmente
  fuera del viewport en pantallas angostas — Agustín reportó que no se leía completo en el celu) a
  `fixed inset-x-4` en mobile, con el comportamiento de siempre desde `sm:` en adelante.

### Falta probar (Fase 8 completa)

- [ ] Correr el SQL de arriba + la config de Supabase (Confirm email, Custom SMTP, template).
- [ ] Registrar un cliente con un dominio de email inventado (ej. `test@asdqwe123.com`) → confirmar
      que se bloquea antes de llegar a Supabase.
- [ ] Registrar un cliente con un email real → confirmar que no queda logueado, ve la pantalla de
      "confirmá tu correo", y que el link del mail lo lleva a la app ya logueado.
- [ ] Antes de confirmar: entrar a `/solicitud`, llenar el wizard → confirmar que el botón final
      queda deshabilitado con el aviso, y que "Reenviar email" funciona.
- [ ] Confirmar el email → entrar al panel → confirmar que aparece la notificación de "¡Tu correo
      fue verificado!" (al propio cliente y al admin) y que ya se puede enviar una solicitud.
- [ ] Panel de admin → Gestión de usuarios → pestaña Clientes: ver el badge de verificado/sin
      verificar; pestaña Técnicos: ver las categorías registradas en la fila expandida.
- [ ] Registrar un técnico con un email mal formado → confirmar que el error aparece apenas se sale
      del campo, sin tener que llegar al final del wizard.
- [ ] `/dashboard/admin/categorias` → expandir una categoría → cargar un sub-ítem con descripción →
      confirmar que se ve prolijo (cards, no filas grises chicas) y que la descripción se guarda.
- [ ] Pedir una solicitud nueva → confirmar que el Paso 4 solo pide franja (sin grilla de horario
      puntual) y que es obligatorio elegir una.
- [ ] Como admin, asignar técnico + horario a esa solicitud → como cliente, ver la card "¿Te sirve
      este horario?" → confirmarlo → revisar que el admin ve "✅ El cliente confirmó" en el detalle.
- [ ] Repetir con otra solicitud de prueba pero rechazando el horario → confirmar que vuelve a
      `pendiente`, se desasigna el técnico (con su aviso), y el admin puede reasignar de nuevo.
- [ ] Como técnico, revisar que ya no se ve el teléfono del cliente en el detalle de una solicitud
      asignada.
- [ ] Abrir la campanita de notificaciones en un celular angosto → confirmar que el texto se lee
      completo y el dropdown no queda cortado.

---

## Reportes de avance previos

- `docs/reporte-cliente-2026-06-10.html` — snapshot de funcionalidades entregadas al 10/06/2026.
- `docs/resumen-cliente-items-1-9.md` — resumen de los primeros 9 ítems del alcance original.
- `docs/sesion-2026-05-28.md` a `docs/sesion-2026-06-09.md` — bitácora técnica sesión a sesión.

Este archivo (`ESTADO_PROYECTO.md`) es la fuente de verdad del estado **actual** del proyecto;
los reportes fechados de arriba quedan como registro histórico de cada entrega.
