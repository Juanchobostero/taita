# Integración Mercado Pago — Taita Soluciones

> Documento vivo, específico de esta integración (separado de `ESTADO_PROYECTO.md` para no
> saturarlo). Se actualiza a medida que avanza cada fase.

**Estado actual (2026-07-29):** 🟢 Fase 1 implementada y probada de punta a punta en local con
credenciales de prueba (conformidad → preferencia real → pago en sandbox → reconciliación →
recibo PDF → notificaciones). Falta: ampliar el manejo de algunos estados de pago (ver más abajo)
y cargar las credenciales de prueba en Vercel (Production) para que Agustín pueda probarlo en el
dominio real. Todavía **no** se cargaron credenciales reales — todo sigue en modo test a propósito.

---

## Alcance

**Fase 1 (esta):** después de que el cliente da conformidad sobre un servicio completado, se le
ofrece un link de pago real de Mercado Pago (Checkout Pro). El dinero entra a la cuenta de
Mercado Pago de Taita. El pago al técnico sigue siendo manual (no cambia respecto a hoy).

**Fase 2 (a futuro, no arrancada):** Split de Pagos (marketplace 1:1) — cada técnico vincula su
propia cuenta de Mercado Pago vía OAuth, y el pago se reparte automáticamente en el momento
(comisión de Taita + parte del técnico) sin pasos manuales. Requiere que el técnico tenga o cree
una cuenta de Mercado Pago — el CVU que hoy se guarda pasaría a ser solo un dato informativo, no
el destino técnico de la transferencia (Mercado Pago no transfiere a un CVU bancario arbitrario
como parte de este producto).

No se aborda en este documento: pagos recurrentes, reembolsos automáticos, contracargos — se
suman si hacen falta más adelante.

---

## Qué necesito de tu lado (externo, no es código)

- [ ] Crear una cuenta en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel/app)
      (puede ser una cuenta personal para probar, no hace falta la de Agustín todavía).
- [ ] Crear una "Aplicación" nueva ahí (cualquier nombre, ej. "Taita Soluciones — Test").
- [ ] De la pestaña **Credenciales de prueba** de esa aplicación, vamos a necesitar cargar en
      `.env` (local) y en Vercel (Preview) más adelante:
      - `MP_ACCESS_TOKEN` (privado — nunca al browser, nunca commiteado)
      - `MP_PUBLIC_KEY` (si hiciera falta más adelante para algo del lado del cliente; el
        checkout por link/redirect no lo necesita)
- [ ] Cuando llegue el momento de ir a producción: credenciales **reales** de la cuenta de
      Mercado Pago de Agustín (Access Token de producción). Solo se cambian las variables de
      entorno, no el código.

---

## Diseño técnico (Fase 1)

### Base de datos (aditivo, no rompe nada existente)

```sql
-- Antes de correr esto, verificar si `pagos.estado` tiene un CHECK constraint (como nos pasó con
-- `solicitudes.estado`) — si lo tiene, hay que ampliarlo igual que se hizo para "asignada":
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'pagos'::regclass AND contype = 'c';

ALTER TABLE pagos ADD COLUMN IF NOT EXISTS mp_preference_id text;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS mp_payment_id text;
```

Estados de `pagos.estado` que va a usar esta fase: `registrado` (el mock actual, se deja de usar
para pagos nuevos pero no se borra de los viejos), `pendiente_pago` (preferencia creada, esperando
que el cliente pague), `pagado` (confirmado por webhook + reconsulta a la API de MP).

### Backend

- `src/lib/mercadopago.ts` (nuevo) — cliente de MP centralizado (SDK oficial `mercadopago` para
  Node), función `crearPreferencia()` y función `consultarPago(paymentId)`.
- `api/cliente/dar-conformidad.ts` — se agrega la creación de la preferencia justo después del
  insert en `pagos` que ya existe hoy; se guarda `mp_preference_id` y se devuelve el link
  (`init_point`) en la respuesta.
- `api/webhooks/mercadopago.ts` (nuevo) — recibe el POST de Mercado Pago:
  1. Valida el header `x-signature` (HMAC) contra `MP_WEBHOOK_SECRET`. Si no valida, corta ahí.
  2. Si el tópico es `payment`, reconsulta el pago real vía `GET /v1/payments/{id}` con el
     `MP_ACCESS_TOKEN` — **nunca** se confía en el monto/estado que venga en el body del webhook.
  3. Matchea por `external_reference` (va a ser el `solicitud_id`) y actualiza el `pagos`
     correspondiente. Idempotente: si ya estaba en `pagado`, no vuelve a procesar.

### Frontend

- `dashboard/cliente/solicitud/[id].astro` — donde hoy `DarConformidad.tsx` muestra "pago
  registrado, pendiente de acreditación", pasa a mostrar un botón real "Pagar con Mercado Pago"
  que lleva al `init_point` guardado (si `pagos.estado === 'pendiente_pago'`), o un cartel de
  "✅ Pago acreditado" si ya está en `pagado`.
- Páginas de vuelta después de pagar (`?pago=exito|pendiente|error` en la misma URL de detalle) —
  solo informativas, el estado real siempre se lee de `pagos.estado` en la base, nunca del query
  param.

---

## Seguridad — no negociable

- Nunca marcar un pago como acreditado solo porque el cliente volvió a una URL de "éxito" — eso
  lo puede falsificar cualquiera cambiando la URL a mano. Fuente de verdad: webhook validado +
  reconsulta a la API de MP.
- Validar siempre la firma (`x-signature`) del webhook antes de procesar nada.
- `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` solo en variables de entorno server-side, nunca en
  código ni en este documento.
- Probar todo con credenciales de **prueba** (sandbox + usuarios de prueba de Mercado Pago) antes
  de cargar las credenciales reales de Agustín.

---

## Cómo probar (sandbox)

Mercado Pago permite crear "usuarios de prueba" (comprador y vendedor) desde el panel de
desarrolladores, para simular el flujo de pago completo sin plata real. Las cuentas de prueba
**no están atadas a una aplicación en particular** — son sandbox users de la cuenta de
desarrollador, se pueden reusar entre proyectos.

### Cuentas de prueba (reutilizadas de otro proyecto, 2026-07-29)

**Vendedor de prueba**
- User ID: `1180488044`
- Usuario: `TESTVKNDVYMZ`
- Contraseña: `qatest4788`

**Comprador de prueba**
- User ID: `1180493422`
- Usuario: `TETE1322835`
- Contraseña: `qatest5034`

**Credenciales de prueba del Vendedor** (app "TEST TAITA SOLUCIONES", creada logueado como el
Vendedor de prueba de arriba — confirmado que el Access Token termina en `-1180488044`, el mismo
User ID del vendedor, así que está bien aislado de la cuenta real):
- Access Token: `APP_USR-8632599657503852-072910-f691368b0cdb77351887432547366b54-1180488044`
- Public Key: `APP_USR-5d3169ec-392b-4b15-a50c-5e92787b2b54`
- Estas son las que están cargadas en `MP_ACCESS_TOKEN` / `MP_PUBLIC_KEY` del `.env` local mientras
  se prueba en sandbox.

### Paso a paso para probar un pago de punta a punta

1. **Usar las credenciales del Vendedor de prueba, no las de la cuenta personal real** — aunque
   las que ya cargamos en `.env` (`APP_USR-...`) aparecían bajo la pestaña "Prueba" del panel,
   corresponden a la cuenta real del desarrollador, no a un usuario de prueba aislado. Para
   aislar de verdad:
   1. Ventana incógnito → loguearse en `mercadopago.com.ar` con el **Vendedor de prueba** de
      arriba.
   2. Entrar a `developers/panel` con esa sesión — va a tener su propia sección de
      aplicaciones (crear una si no tiene ninguna, mismo flujo: Pagos online → Con desarrollo
      propio → Checkout Pro).
   3. Copiar el Access Token y Public Key de "Credenciales de prueba" de esa app — son los que
      hay que cargar en `MP_ACCESS_TOKEN` / `MP_PUBLIC_KEY` mientras se prueba en sandbox.
2. En otra ventana (incógnito aparte), loguearse en Mercado Pago con el **Comprador de prueba**
   antes de completar el checkout — así el pago sale de esa cuenta sandbox, no de una real.
3. Al pagar, usar una tarjeta de prueba (panel de MP → menú "Tarjetas de prueba"), eligiendo el
   nombre de titular según qué resultado se quiere simular (aprobado / rechazado / pendiente).
4. Como se prueba en `localhost`, Mercado Pago no redirige solo al terminar (`auto_return`
   requiere HTTPS público) — hay que clickear "Volver al sitio" a mano en la pantalla de
   resultado del checkout.

### Tarjetas de prueba

No son específicas de la cuenta vendedor ni comprador — son un recurso genérico de Mercado Pago
(mismos números para cualquier integración en Argentina), visible desde el panel de cualquiera de
las dos cuentas ("Tarjetas de prueba" en el menú lateral de developers).

Si el comprador de prueba no tiene saldo suficiente en "Dinero en cuenta" para el monto que se
está probando, elegir **tarjeta de crédito/débito** como medio de pago en el checkout en vez de
dinero en cuenta.

Confirmadas en el panel (2026-07-29):

| Tarjeta | Número | CVV | Vencimiento |
|---|---|---|---|
| Mastercard | `5031 7557 3453 0604` | `123` | `11/30` |
| Visa | `4509 9535 6623 3704` | `123` | `11/30` |
| American Express | `3711 803032 57522` | `1234` | `11/30` |
| Mastercard Débito | `5287 3383 1025 3304` | `123` | `11/30` |
| Visa Débito | `4002 7686 9439 5619` | `123` | `11/30` |

**Titular** (define el resultado simulado; DNI puede ser cualquiera, ej. `12345678`):
- `APRO` → aprobado
- `OTHE` → rechazado (error general)
- `CONT` → pendiente
- `FUND` → rechazado (fondos insuficientes)
- `SECU` → rechazado (código de seguridad inválido)

Si alguno de estos números deja de funcionar, Mercado Pago los rota de tanto en tanto —
confirmarlos en el panel → "Tarjetas de prueba" antes de asumir que hay un bug en el código.

---

## Pendiente — manejo completo de todos los estados de pago (análisis 2026-07-29, sin implementar aún)

`actualizarPagoDesdeMP()` (en `src/lib/mercadopago.ts`) hoy solo distingue `approved` → `pagado` y
`rejected` → `rechazado`; todo lo demás cae en `pendiente_pago`. Eso está bien para los estados que
genuinamente son "todavía no terminó" (`pending`, `in_process`, `authorized`), pero está mal para
otros tres que Mercado Pago también puede informar:

| Estado de Mercado Pago | Mapeo correcto | Por qué |
|---|---|---|
| `cancelled` | `rechazado` | mismo tratamiento que un rechazo — el cliente puede reintentar |
| `refunded` | nuevo estado `reembolsado` | se le devolvió la plata al cliente — el admin tiene que enterarse sí o sí |
| `charged_back` | nuevo estado `contracargo` | disputa con el banco del cliente — el caso más grave, alerta clara al admin |

**Falta implementar:**
- [ ] Verificar constraint de `pagos.estado` antes de sumar `reembolsado`/`contracargo` (mismo
      chequeo que se hizo para `solicitudes.estado` — `pagado`/`pendiente_pago`/`rechazado` ya se
      confirmó que entran sin problema, pero no probamos valores nuevos todavía).
- [ ] Ampliar el mapeo en `actualizarPagoDesdeMP()`.
- [ ] Nuevas funciones `notificarPagoReembolsado()` / `notificarPagoContracargo()` en
      `notificaciones.ts` (mismo patrón que `notificarPagoConfirmado`/`notificarPagoRechazado` ya
      existentes) — el contracargo en particular tiene que dejar bien claro en el mail/notificación
      al admin que es urgente.
- [ ] Sumar los mensajes correspondientes en `DarConformidad.tsx` (cliente) y en el `pagoInfo` de
      `SolicitudesTecnico.tsx` (técnico).
- [ ] Mostrar el estado de pago también en el panel admin (`TablaSolicitudesAdmin.tsx` / detalle) —
      hoy no se ve ahí, y es justo donde más importa que se note un reembolso/contracargo.

**Nota, no bloqueante:** Mercado Pago puede mandar los contracargos como un tópico de webhook
**separado** (`chargebacks`, no `payment`) — el webhook actual (`api/webhooks/mercadopago.ts`)
ignora todo lo que no sea `type === 'payment'`. Los contracargos tardan días/semanas en aparecer
(no son parte del flujo normal de compra), así que no frena el uso normal de la app, pero hay que
revisar el payload real de ese tópico cuando se implemente esto.

---

## Checklist para pushear y que Agustín pruebe (con credenciales de TEST, sin plata real)

No hace falta cambiar nada de código para esto — el mismo código sirve para test y para
producción real, solo cambian las variables de entorno.

1. **Cargar en Vercel → Settings → Environment Variables, scope Production** (probablemente hoy
   solo están en el `.env` local):
   - `MP_ACCESS_TOKEN` — el del Vendedor de prueba (termina en `-1180488044`).
   - `MP_PUBLIC_KEY` — ídem.
   - `MP_WEBHOOK_SECRET` — el secreto para validar la firma del webhook (buscarlo en el panel de
     Mercado Pago → esa aplicación → Webhooks, si no está configurado todavía, hay que dar de alta
     la URL `https://taitasoluciones.com.ar/api/webhooks/mercadopago` ahí primero).
2. Redeploy en Vercel para que las variables nuevas queden activas.
3. **Importante:** como en producción `PUBLIC_SITE_URL` ya es `https://taitasoluciones.com.ar`
   (HTTPS pública), ahí el flujo automático completo (`auto_return` + webhook real) va a funcionar
   solo — no van a hacer falta los atajos manuales que usamos en local (`?payment_id=` a mano).
4. Para que alguien "pague" con estas credenciales de test, tiene que estar logueado en Mercado
   Pago como un **comprador de prueba** (no un usuario real) — ver la sección de más abajo,
   pensada para pasarle directo a Agustín.
5. Cuando llegue el momento de ir con plata real: reemplazar esas mismas 3 variables por las
   credenciales reales de la cuenta de Mercado Pago de Agustín. Nada más cambia.

---

## Guía rápida para que pruebe Agustín

Mientras probamos, los pagos son **de mentira** — no sale ni entra plata real. Para poder pagar
hace falta usar una cuenta de prueba de Mercado Pago, no la cuenta real de Agustín.

1. Abrí una ventana de incógnito (para no mezclar con tu cuenta real de Mercado Pago).
2. Andá a `mercadopago.com.ar` e iniciá sesión con estos datos de prueba:
   - Usuario: `TETE1322835`
   - Contraseña: `qatest5034`
3. En otra pestaña de esa misma ventana, entrá a `https://taitasoluciones.com.ar` con tu usuario
   normal de Taita (cliente), buscá una solicitud ya completada, y dale conformidad si todavía no
   se la diste.
4. Te va a aparecer un botón **"Pagar con Mercado Pago"** — al clickearlo, elegí pagar con
   **"Dinero disponible"** (no con tarjeta) para que sea más directo.
5. Si en algún momento el saldo de esa cuenta de prueba se queda corto, avisale a Jota — se le
   puede cargar más plata ficticia desde el panel de desarrolladores.
6. Al confirmar el pago, volvé a la pestaña de Taita — debería verse "Pago acreditado" con un
   botón para descargar el recibo en PDF.

---

## Checklist de progreso

- [x] Cuenta + aplicación de prueba creada en Mercado Pago Developers
- [x] Credenciales de prueba cargadas en `.env` local
- [x] Verificado el constraint de `pagos.estado` (no tiene — a diferencia de `solicitudes.estado`)
- [x] SQL de columnas nuevas corrido en Supabase
- [x] `src/lib/mercadopago.ts` implementado
- [x] `dar-conformidad.ts` genera la preferencia real
- [x] Botón de pago en el detalle del cliente
- [x] Webhook implementado y validado con firma
- [x] Probado de punta a punta en sandbox local (usuario de prueba paga con "Dinero disponible",
      reconciliado vía `?payment_id=` al volver — en local el webhook no puede llegar a
      `localhost`, se usó ese respaldo; en producción el webhook real debería andar solo)
- [ ] Ampliar manejo de estados `cancelled`/`refunded`/`charged_back` (ver sección de arriba)
- [ ] Mostrar estado de pago en el panel admin
- [ ] Credenciales de **test** cargadas en Vercel (Production) para que Agustín pueda probar en
      el dominio real
- [ ] Probado en producción (dominio real) con credenciales de test — Agustín como comprador
- [ ] Credenciales de producción **reales** de Agustín cargadas en Vercel (recién al final, cuando
      todo lo anterior esté validado)
- [ ] Probado en producción con un pago real chico
