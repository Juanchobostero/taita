import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'
import { notificarCambioEstado, notificarDesasignacion, notificarHorarioRespuesta } from '@/lib/notificaciones'

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const { solicitudId, accion } = await request.json()
    if (!solicitudId || (accion !== 'aceptar' && accion !== 'rechazar')) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    const { data: sol } = await supabase
      .from('solicitudes')
      .select(`
        cliente_id, tecnico_id, horario_confirmado_cliente, numero, titulo,
        tecnicos ( usuario_id, usuarios ( nombre_completo, email ) )
      `)
      .eq('id', solicitudId)
      .single()

    if (!sol || sol.cliente_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403 })
    }
    if (!sol.tecnico_id || sol.horario_confirmado_cliente) {
      return new Response(JSON.stringify({ error: 'No hay un horario pendiente de confirmar' }), { status: 409 })
    }

    if (accion === 'aceptar') {
      const { error } = await supabase
        .from('solicitudes')
        .update({ horario_confirmado_cliente: true })
        .eq('id', solicitudId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    } else {
      // Mismo criterio que "volver a Pendiente" del admin (dashboard/admin/solicitud/[id].astro):
      // desasignar al técnico para no dejarle una reserva fantasma en la agenda, y avisarle.
      const tecnicoInfo = (sol.tecnicos as any)?.usuarios ?? null
      const tecnicoUsuarioId = (sol.tecnicos as any)?.usuario_id ?? null

      const { error } = await supabase
        .from('solicitudes')
        .update({ tecnico_id: null, franja_asignada: null, horario_confirmado_cliente: false })
        .eq('id', solicitudId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

      if (tecnicoUsuarioId && tecnicoInfo) {
        try {
          await notificarDesasignacion(
            supabase, tecnicoUsuarioId, tecnicoInfo.email, tecnicoInfo.nombre_completo,
            sol.numero, sol.titulo, solicitudId,
          )
        } catch (err) {
          console.error('[api/cliente/responder-horario] error notificando desasignación:', err)
        }
      }

      try {
        await notificarCambioEstado(supabase, solicitudId, 'pendiente', user.id)
      } catch (err) {
        console.error('[api/cliente/responder-horario] error notificando cambio de estado:', err)
      }
    }

    try {
      await notificarHorarioRespuesta(supabase, solicitudId, accion === 'aceptar')
    } catch (err) {
      console.error('[api/cliente/responder-horario] error notificando respuesta:', err)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[api/cliente/responder-horario]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
