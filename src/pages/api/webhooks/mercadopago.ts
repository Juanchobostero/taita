import type { APIRoute } from 'astro'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { actualizarPagoDesdeMP, validarFirmaWebhook } from '@/lib/mercadopago'

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null)
  const tipo   = body?.type ?? body?.topic
  const dataId = body?.data?.id?.toString()

  // Otros tipos de evento (merchant_order, etc.) se ackean sin procesar — solo nos interesa 'payment'.
  if (tipo !== 'payment' || !dataId) {
    return new Response('ok', { status: 200 })
  }

  const xSignature = request.headers.get('x-signature')
  const xRequestId  = request.headers.get('x-request-id')
  if (!validarFirmaWebhook(xSignature, xRequestId, dataId)) {
    console.error('[webhook mercadopago] firma inválida o MP_WEBHOOK_SECRET no configurado')
    return new Response('firma inválida', { status: 401 })
  }

  try {
    const supabase = createSupabaseAdmin()
    await actualizarPagoDesdeMP(supabase, dataId)
  } catch (err) {
    console.error('[webhook mercadopago] error procesando pago:', err)
  }

  return new Response('ok', { status: 200 })
}
