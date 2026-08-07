import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'
import { notificarCambioEstado, notificarCotizacionRespuesta } from '@/lib/notificaciones'

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const body = await request.json()
    const { solicitudId, accion } = body
    if (!solicitudId || (accion !== 'aceptar' && accion !== 'rechazar')) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    const { data: sol } = await supabase
      .from('solicitudes')
      .select('cliente_id, estado, precio_base')
      .eq('id', solicitudId)
      .single()

    if (!sol || sol.cliente_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403 })
    }
    if (sol.estado !== 'en_cotizacion' || sol.precio_base == null) {
      return new Response(JSON.stringify({ error: 'No hay una cotización pendiente de respuesta' }), { status: 409 })
    }

    const aceptada = accion === 'aceptar'
    await notificarCambioEstado(supabase, solicitudId, aceptada ? 'pendiente' : 'cancelada', user.id)

    try {
      await notificarCotizacionRespuesta(supabase, solicitudId, aceptada)
    } catch (err) {
      console.error('[api/cotizacion/responder] error notificando:', err)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[api/cotizacion/responder]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
