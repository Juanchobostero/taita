# Integración Mercado Pago — Taita Soluciones

> Documento vivo, específico de esta integración (separado de `ESTADO_PROYECTO.md` para no
> saturarlo). Se actualiza a medida que avanza cada fase.

**Estado actual:** 🟡 Fase 1 en planificación — código todavía no escrito. Esperando que se cree
la aplicación de prueba en el panel de desarrolladores de Mercado Pago (ver checklist abajo).

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

## Checklist de progreso

- [ ] Cuenta + aplicación de prueba creada en Mercado Pago Developers
- [ ] Credenciales de prueba cargadas en `.env` local
- [ ] Verificado el constraint de `pagos.estado`
- [ ] SQL de columnas nuevas corrido en Supabase
- [ ] `src/lib/mercadopago.ts` implementado
- [ ] `dar-conformidad.ts` genera la preferencia real
- [ ] Botón de pago en el detalle del cliente
- [ ] Webhook implementado y validado con firma
- [ ] Probado de punta a punta en sandbox (usuario de prueba paga, webhook llega, `pagos` se
      actualiza a `pagado`, el cliente ve el cartel de acreditado)
- [ ] Credenciales de producción de Agustín cargadas en Vercel
- [ ] Probado en producción con un pago real chico
