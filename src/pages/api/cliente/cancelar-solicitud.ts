import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'
import { notificarCambioEstado } from '@/lib/notificaciones'

const NO_CANCELABLES = ['completada', 'cancelada']

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const { solicitudId } = await request.json()
    if (!solicitudId) return new Response(JSON.stringify({ error: 'solicitudId requerido' }), { status: 400 })

    const supabase = createSupabaseAdmin()
    const { data: sol } = await supabase
      .from('solicitudes')
      .select('id, estado, cliente_id')
      .eq('id', solicitudId)
      .single()

    if (!sol || sol.cliente_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Solicitud no encontrada' }), { status: 403 })
    }
    if (NO_CANCELABLES.includes(sol.estado)) {
      return new Response(JSON.stringify({ error: 'Esta solicitud ya no se puede cancelar.' }), { status: 400 })
    }

    await notificarCambioEstado(supabase, solicitudId, 'cancelada', user.id)

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[api/cliente/cancelar-solicitud]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
