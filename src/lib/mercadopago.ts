import { createHmac } from 'node:crypto'
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  notificarPagoConfirmado,
  notificarPagoRechazado,
  notificarPagoReembolsado,
  notificarPagoContracargo,
} from './notificaciones'

const accessToken = import.meta.env.MP_ACCESS_TOKEN
const client = accessToken ? new MercadoPagoConfig({ accessToken }) : null
// Las credenciales de test de Mercado Pago empiezan con "TEST-", las de producción con "APP_USR-"
// — se usa esto para decidir qué link de checkout devolver (ver `linkDeCheckout` más abajo).
const esCredencialTest = accessToken?.startsWith('TEST-') ?? false

function siteUrl(): string {
  return import.meta.env.PUBLIC_SITE_URL || 'https://taitasoluciones.com.ar'
}

interface CrearPreferenciaParams {
  pagoId:      string
  solicitudId: string
  titulo:      string
  monto:       number
}

/**
 * `auto_return` exige que `back_urls.success` sea una URL https públicamente alcanzable —
 * en local (`PUBLIC_SITE_URL=http://localhost:...`) Mercado Pago la rechaza, así que se omite
 * ahí: el pago igual funciona, el usuario solo tiene que clickear "Volver al sitio" a mano en
 * vez de que redirija solo.
 */
function esUrlLocal(url: string): boolean {
  return url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')
}

/**
 * Con credenciales de test hay que usar `sandbox_init_point` (el real, `init_point`, no funciona
 * bien ahí); con credenciales de producción es al revés — `init_point` es el checkout real,
 * `sandbox_init_point` manda a `sandbox.mercadopago.com.ar` aunque la cuenta sea real (bug
 * detectado 2026-08-25: eso era lo que le pedía verificación de DNI y terminaba en "too many
 * requests" — el checkout de sandbox no está pensado para manejar cuentas/tarjetas reales).
 */
function linkDeCheckout(preference: { init_point?: string | null; sandbox_init_point?: string | null }): string | null {
  return esCredencialTest
    ? (preference.sandbox_init_point ?? preference.init_point ?? null)
    : (preference.init_point ?? preference.sandbox_init_point ?? null)
}

export async function crearPreferencia(
  { pagoId, solicitudId, titulo, monto }: CrearPreferenciaParams,
): Promise<{ preferenceId: string; initPoint: string | null } | null> {
  if (!client) return null

  const base = siteUrl()
  const volverA = `${base}/dashboard/cliente/solicitud/${solicitudId}`

  const preference = await new Preference(client).create({
    body: {
      items: [{
        id:          solicitudId,
        title:       `Taita Soluciones — ${titulo}`,
        quantity:    1,
        unit_price:  monto,
        currency_id: 'ARS',
      }],
      // Se usa el id de la fila de `pagos` (no el de la solicitud) como external_reference —
      // como puede haber más de un intento de pago por solicitud (reintentos tras un rechazo),
      // esto permite reconciliar cada pago exactamente contra SU fila, sin ambigüedad de "cuál es
      // el último intento" si las notificaciones de Mercado Pago llegan fuera de orden.
      external_reference: pagoId,
      back_urls: {
        success: volverA,
        pending: volverA,
        failure: volverA,
      },
      // Igual que auto_return: notification_url también exige un endpoint https público — en
      // local no puede alcanzarlo de todas formas, así que se omite en vez de mandar una URL que
      // Mercado Pago podría rechazar al momento de procesar el pago (no solo al crear la
      // preferencia). Sin esto el webhook no se dispara en local, pero ya tenemos la
      // reconciliación al volver del checkout como respaldo (ver actualizarPagoDesdeMP).
      ...(esUrlLocal(base) ? {} : {
        auto_return:      'approved' as const,
        notification_url: `${base}/api/webhooks/mercadopago`,
      }),
    },
  })

  return {
    preferenceId: preference.id!,
    initPoint:    linkDeCheckout(preference),
  }
}

/** Recupera el link de pago de una preferencia ya creada (para mostrar el botón de nuevo sin crear otra). */
export async function obtenerLinkPago(preferenceId: string): Promise<string | null> {
  if (!client) return null
  const preference = await new Preference(client).get({ preferenceId })
  return linkDeCheckout(preference)
}

interface PagoMP {
  id:                string
  status:            string
  /** El `external_reference` que Mercado Pago devuelve — en este proyecto es el id de la fila de `pagos`, no el de la solicitud. */
  externalReference: string | null
}

export async function consultarPago(paymentId: string): Promise<PagoMP | null> {
  if (!client) return null
  const payment = await new Payment(client).get({ id: paymentId })
  if (!payment.id) return null
  return {
    id:                String(payment.id),
    status:            payment.status ?? 'unknown',
    externalReference: payment.external_reference ?? null,
  }
}

/**
 * Valida la firma del webhook de Mercado Pago (header `x-signature`) contra `MP_WEBHOOK_SECRET`.
 * Manifest documentado por MP: `id:{data.id};request-id:{x-request-id};ts:{ts};` — el `id` va
 * en minúscula. Sin esto, cualquiera podría pegarle al webhook y marcar pagos como acreditados.
 */
export function validarFirmaWebhook(
  xSignature: string | null,
  xRequestId: string | null,
  dataId:     string,
): boolean {
  const secret = import.meta.env.MP_WEBHOOK_SECRET
  if (!secret || !xSignature || !xRequestId) return false

  const partes: Record<string, string> = {}
  for (const par of xSignature.split(',')) {
    const [k, v] = par.split('=')
    if (k && v) partes[k.trim()] = v.trim()
  }
  const ts   = partes.ts
  const hash = partes.v1
  if (!ts || !hash) return false

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`
  const firmaCalculada = createHmac('sha256', secret).update(manifest).digest('hex')
  return firmaCalculada === hash
}

/**
 * Reconsulta el pago real a la API de Mercado Pago (nunca confiar en lo que venga del webhook o
 * de la URL de vuelta) y actualiza el registro de `pagos` correspondiente. `pago.externalReference`
 * es el id de la fila de `pagos` (ver `crearPreferencia`), así que apunta siempre al intento
 * exacto — no "el último" — sin importar el orden en que lleguen las notificaciones de MP.
 */
export async function actualizarPagoDesdeMP(supabase: SupabaseClient, paymentId: string): Promise<void> {
  const pago = await consultarPago(paymentId)
  if (!pago?.externalReference) return

  const { data: pagoDb } = await supabase
    .from('pagos')
    .select('id, solicitud_id, estado')
    .eq('id', pago.externalReference)
    .maybeSingle()

  if (!pagoDb) return

  // 'approved'/'rejected'/'cancelled' cubren el ciclo de vida normal de un intento de pago.
  // 'refunded'/'charged_back' solo pueden pasar DESPUÉS de haber estado 'pagado' — llegan como una
  // actualización posterior del mismo pago (MP notifica de nuevo cuando el estado cambia), nunca
  // como primer estado.
  const nuevoEstado =
    pago.status === 'approved'     ? 'pagado' :
    pago.status === 'rejected'     ? 'rechazado' :
    pago.status === 'cancelled'    ? 'rechazado' :
    pago.status === 'refunded'     ? 'reembolsado' :
    pago.status === 'charged_back' ? 'contracargo' :
    'pendiente_pago'

  // Sin cambio real de estado — no volver a escribir ni a notificar (MP reintenta el webhook
  // varias veces con el mismo status).
  if (nuevoEstado === pagoDb.estado) return

  const { error } = await supabase
    .from('pagos')
    .update({ estado: nuevoEstado, mp_payment_id: pago.id })
    .eq('id', pagoDb.id)
  if (error) {
    console.error('[actualizarPagoDesdeMP] error actualizando pago:', error.message)
    return
  }

  try {
    if (nuevoEstado === 'pagado') {
      await notificarPagoConfirmado(supabase, pagoDb.solicitud_id, pago.id)
    } else if (nuevoEstado === 'rechazado') {
      await notificarPagoRechazado(supabase, pagoDb.solicitud_id)
    } else if (nuevoEstado === 'reembolsado') {
      await notificarPagoReembolsado(supabase, pagoDb.solicitud_id)
    } else if (nuevoEstado === 'contracargo') {
      await notificarPagoContracargo(supabase, pagoDb.solicitud_id)
    }
  } catch (err) {
    console.error('[actualizarPagoDesdeMP] error notificando:', err)
  }
}
