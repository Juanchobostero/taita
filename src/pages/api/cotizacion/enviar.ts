import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'
import { notificarCotizacionEnviada } from '@/lib/notificaciones'

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const supabase = createSupabaseAdmin()
    const { data: self } = await supabase.from('usuarios').select('tipo').eq('id', user.id).single()
    if (self?.tipo !== 'admin') return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403 })

    const body = await request.json()
    const { solicitudId, precio, tasa } = body
    const precioNum = parseFloat(precio)
    const tasaNum   = parseFloat(tasa) || 0
    if (!solicitudId || !precioNum || precioNum <= 0) {
      return new Response(JSON.stringify({ error: 'Ingresá un precio válido' }), { status: 400 })
    }

    const { data: sol } = await supabase.from('solicitudes').select('estado').eq('id', solicitudId).single()
    if (!sol || sol.estado !== 'en_cotizacion') {
      return new Response(JSON.stringify({ error: 'Esta solicitud no está en cotización' }), { status: 409 })
    }

    // El cliente paga solo el precio cotizado — la tasa de plataforma ya no se le suma encima
    // (pedido de Agustín, sesión 11-ago). Se sigue guardando `tasa_aplicada` como dato de
    // referencia interna para el admin, pero no participa del total cobrado.
    const total = precioNum

    const { error } = await supabase
      .from('solicitudes')
      .update({ precio_base: precioNum, tasa_aplicada: tasaNum, total_estimado: total })
      .eq('id', solicitudId)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

    // Queda como mensaje en el chat (registro visible de la conversación) — no dispara el aviso
    // genérico de "nuevo mensaje" porque `notificarCotizacionEnviada` (abajo) ya avisa al cliente
    // con el detalle del precio, específico para este evento.
    await supabase.from('cotizacion_mensajes').insert({
      solicitud_id: solicitudId,
      usuario_id:   user.id,
      mensaje:      `Cotización enviada: $${total.toLocaleString('es-AR')}.`,
    })

    try {
      await notificarCotizacionEnviada(supabase, solicitudId, total)
    } catch (err) {
      console.error('[api/cotizacion/enviar] error notificando:', err)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[api/cotizacion/enviar]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
