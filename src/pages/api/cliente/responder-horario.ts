import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'
import { notificarDesasignacion, notificarHorarioRespuesta } from '@/lib/notificaciones'

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
        cliente_id, tecnico_id, horario_confirmado_cliente,
        fecha_solicitada, hora_solicitada, franja_asignada, numero, titulo,
        tecnicos ( usuario_id, usuarios ( nombre_completo, email ) )
      `)
      .eq('id', solicitudId)
      .single()

    if (!sol || sol.cliente_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403 })
    }
    // Fase 8.9 — ya no depende de que haya un técnico asignado: el horario se negocia antes.
    if (!sol.franja_asignada || sol.horario_confirmado_cliente) {
      return new Response(JSON.stringify({ error: 'No hay un horario pendiente de confirmar' }), { status: 409 })
    }

    if (accion === 'aceptar') {
      const { error } = await supabase
        .from('solicitudes')
        .update({ horario_confirmado_cliente: true })
        .eq('id', solicitudId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    } else {
      // Registrar el horario rechazado para que el admin no lo vuelva a proponer (Fase 8.9).
      if (sol.fecha_solicitada && sol.hora_solicitada && sol.franja_asignada) {
        const { error: histError } = await supabase.from('solicitud_horarios_rechazados').insert({
          solicitud_id: solicitudId,
          fecha:        (sol.fecha_solicitada as string).slice(0, 10),
          hora:         sol.hora_solicitada,
          franja:       sol.franja_asignada,
        })
        if (histError) console.error('[api/cliente/responder-horario] error guardando horario rechazado:', histError.message)
      }

      // La solicitud vuelve a esperar una propuesta nueva del admin — sin técnico comprometido
      // en el nuevo flujo, así que normalmente no hay nada que desasignar acá. Se deja el aviso
      // de desasignación como no-op defensivo por si quedara alguna solicitud del modelo anterior
      // (técnico+horario asignados juntos) todavía en curso al momento del deploy.
      const tecnicoInfo = (sol.tecnicos as any)?.usuarios ?? null
      const tecnicoUsuarioId = (sol.tecnicos as any)?.usuario_id ?? null

      const { error } = await supabase
        .from('solicitudes')
        .update({ franja_asignada: null, horario_confirmado_cliente: false, ...(sol.tecnico_id ? { tecnico_id: null } : {}) })
        .eq('id', solicitudId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

      if (sol.tecnico_id && tecnicoUsuarioId && tecnicoInfo) {
        try {
          await notificarDesasignacion(
            supabase, tecnicoUsuarioId, tecnicoInfo.email, tecnicoInfo.nombre_completo,
            sol.numero, sol.titulo, solicitudId,
          )
        } catch (err) {
          console.error('[api/cliente/responder-horario] error notificando desasignación:', err)
        }
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
