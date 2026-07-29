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
desarrolladores, para simular el flujo de pago completo sin plata real. Se documenta el paso a
paso acá una vez que se llegue a esa etapa.

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
