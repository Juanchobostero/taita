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

    const { data: tec } = await supabase
      .from('tecnicos')
      .select('id')
      .eq('usuario_id', user.id)
      .single()
    if (!tec) return new Response(JSON.stringify({ error: 'No sos técnico' }), { status: 403 })

    const { solicitudId, imagenes, gastosExtra, descripcionGastos } = await request.json()
    if (!solicitudId) return new Response(JSON.stringify({ error: 'solicitudId requerido' }), { status: 400 })

    const { data: sol } = await supabase
      .from('solicitudes')
      .select('id, estado, precio_base, tasa_aplicada, total_estimado, tecnico_id, imagenes_trabajo, gastos_extra')
      .eq('id', solicitudId)
      .single()

    if (!sol || sol.tecnico_id !== tec.id) {
      return new Response(JSON.stringify({ error: 'Solicitud no encontrada o no asignada a vos' }), { status: 403 })
    }
    // "completada" también es válida: el cron pudo haberla auto-completado por horario antes de
    // que el técnico cargara fotos/gastos extra — se lo dejamos hacer una sola vez después.
    if (!['aceptada', 'en_curso', 'completada'].includes(sol.estado)) {
      return new Response(JSON.stringify({ error: 'Solo podés completar solicitudes aceptadas o en curso' }), { status: 400 })
    }
    const yaTieneCierre = sol.estado === 'completada'
      && ((sol.imagenes_trabajo?.length ?? 0) > 0 || sol.gastos_extra != null)
    if (yaTieneCierre) {
      return new Response(JSON.stringify({ error: 'Esta solicitud ya tiene el cierre cargado.' }), { status: 400 })
    }

    // Recalcular total si hay gastos extras
    const gastosNum   = parseFloat(gastosExtra) || 0
    const tasa        = (sol.tasa_aplicada ?? 0) / 100
    const precioBase  = (sol.precio_base ?? 0) + gastosNum
    const nuevoTotal  = gastosNum > 0
      ? precioBase + Math.round(precioBase * tasa)
      : sol.total_estimado

    const updates: Record<string, unknown> = {
      gastos_extra:        gastosNum > 0 ? gastosNum : null,
      descripcion_gastos:  descripcionGastos?.trim() || null,
      imagenes_trabajo:    Array.isArray(imagenes) && imagenes.length > 0 ? imagenes : null,
      total_estimado:      nuevoTotal,
      actualizado_en:      new Date().toISOString(),
    }

    // El contador de trabajos (`tecnicos.total_servicios`) ya NO se incrementa acá — se movió al
    // cierre definitivo (`finalizar-servicio.ts`, después de que el pago se acredita), para que
    // las estadísticas del técnico solo cuenten trabajos realmente terminados y cobrados, no
    // trabajos que el cliente todavía puede rechazar o nunca termina de pagar (pedido de Agustín).
    await supabase.from('solicitudes').update(updates).eq('id', solicitudId)

    // Si ya estaba "completada" (auto-completada por el cron), no volver a notificar/loguear
    // el mismo cambio de estado — solo se está completando el cierre con fotos/gastos.
    if (sol.estado !== 'completada') {
      try {
        await notificarCambioEstado(supabase, solicitudId, 'completada', user.id)
      } catch (err) {
        console.error('[api/tecnico/completar] error notificando:', err)
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[api/tecnico/completar]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
