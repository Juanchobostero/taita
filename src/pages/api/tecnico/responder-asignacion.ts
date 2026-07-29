import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'
import { notificarCambioEstado } from '@/lib/notificaciones'

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const supabase = createSupabaseAdmin()

    const { data: tec } = await supabase.from('tecnicos').select('id').eq('usuario_id', user.id).single()
    if (!tec) return new Response(JSON.stringify({ error: 'No sos técnico' }), { status: 403 })

    const { solicitudId, accion } = await request.json()
    if (!solicitudId || !['aceptar', 'rechazar'].includes(accion)) {
      return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 })
    }

    const { data: sol } = await supabase
      .from('solicitudes')
      .select('id, estado, tecnico_id')
      .eq('id', solicitudId)
      .single()

    if (!sol || sol.tecnico_id !== tec.id) {
      return new Response(JSON.stringify({ error: 'Solicitud no encontrada o no asignada a vos' }), { status: 403 })
    }
    if (sol.estado !== 'asignada') {
      return new Response(JSON.stringify({ error: 'Esta solicitud ya fue respondida' }), { status: 400 })
    }

    if (accion === 'rechazar') {
      const { error } = await supabase.from('solicitudes').update({ tecnico_id: null }).eq('id', solicitudId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    try {
      if (accion === 'aceptar') {
        await notificarCambioEstado(supabase, solicitudId, 'aceptada', user.id)
      } else {
        await notificarCambioEstado(supabase, solicitudId, 'pendiente', user.id, 'asignada')
      }
    } catch (err) {
      console.error('[api/tecnico/responder-asignacion] error notificando:', err)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[api/tecnico/responder-asignacion]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
