import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'
import { notificarCambioEstado } from '@/lib/notificaciones'

// Cierre definitivo del servicio, del lado del técnico — solo posible después de que el pago del
// cliente ya se acreditó. A partir de acá la solicitud queda cerrada para siempre (no hay vuelta
// atrás) y recién en este momento cuenta como trabajo terminado en las estadísticas del técnico
// (`tecnicos.total_servicios`) — antes se contaba al completar el trabajo, pero eso incluía
// trabajos que el cliente todavía podía no llegar a pagar nunca (pedido de Agustín).
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const supabase = createSupabaseAdmin()

    const { data: tec } = await supabase
      .from('tecnicos')
      .select('id, total_servicios')
      .eq('usuario_id', user.id)
      .single()
    if (!tec) return new Response(JSON.stringify({ error: 'No sos técnico' }), { status: 403 })

    const { solicitudId } = await request.json()
    if (!solicitudId) return new Response(JSON.stringify({ error: 'solicitudId requerido' }), { status: 400 })

    const { data: sol } = await supabase
      .from('solicitudes')
      .select('id, estado, tecnico_id, pagos ( estado, creado_en )')
      .eq('id', solicitudId)
      .single()

    if (!sol || sol.tecnico_id !== tec.id) {
      return new Response(JSON.stringify({ error: 'Solicitud no encontrada o no asignada a vos' }), { status: 403 })
    }
    if (sol.estado !== 'completada') {
      return new Response(JSON.stringify({ error: 'Solo se puede cerrar un servicio ya completado.' }), { status: 400 })
    }

    // Puede haber más de un intento de pago (reintentos tras un rechazo) — se toma el más
    // reciente por fecha, el orden del array embebido de Supabase no está garantizado.
    const pagos     = (sol.pagos as unknown as { estado: string; creado_en: string }[] | null) ?? []
    const ultimoPago = pagos.length ? pagos.reduce((a, b) => (a.creado_en > b.creado_en ? a : b)) : null
    if (ultimoPago?.estado !== 'pagado') {
      return new Response(JSON.stringify({ error: 'Todavía no se acreditó el pago del cliente.' }), { status: 400 })
    }

    await supabase.from('tecnicos').update({ total_servicios: (tec.total_servicios ?? 0) + 1 }).eq('id', tec.id)

    try {
      await notificarCambioEstado(supabase, solicitudId, 'finalizada', user.id)
    } catch (err) {
      console.error('[api/tecnico/finalizar-servicio] error notificando:', err)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[api/tecnico/finalizar-servicio]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
