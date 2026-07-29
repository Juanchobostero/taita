import { randomUUID } from 'node:crypto'
import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'
import { crearPreferencia }     from '@/lib/mercadopago'

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
      .select('id, titulo, estado, cliente_id, total_estimado, conformidad_cliente')
      .eq('id', solicitudId)
      .single()

    if (!sol || sol.cliente_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Solicitud no encontrada' }), { status: 403 })
    }
    if (!sol.conformidad_cliente) {
      return new Response(JSON.stringify({ error: 'Todavía no diste conformidad sobre esta solicitud.' }), { status: 400 })
    }

    // Solo se puede reintentar sobre el último intento — si ya está pagado o pendiente (con un
    // link vigente), no tiene sentido generar uno nuevo.
    const { data: ultimoPago } = await supabase
      .from('pagos')
      .select('id, estado')
      .eq('solicitud_id', solicitudId)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!ultimoPago || ultimoPago.estado !== 'rechazado') {
      return new Response(JSON.stringify({ error: 'No hay ningún pago rechazado para reintentar.' }), { status: 400 })
    }

    const monto  = sol.total_estimado ?? 0
    const pagoId = randomUUID()
    const preferencia = await crearPreferencia({ pagoId, solicitudId, titulo: sol.titulo, monto })
    if (!preferencia) {
      return new Response(JSON.stringify({ error: 'Mercado Pago no está configurado.' }), { status: 500 })
    }

    // Se inserta un registro nuevo (no se pisa el rechazado) — queda el historial completo de
    // intentos de esta solicitud, útil si hay que auditar algo más adelante.
    const { error: pagoError } = await supabase.from('pagos').insert({
      id:               pagoId,
      solicitud_id:     solicitudId,
      monto,
      estado:           'pendiente_pago',
      mp_preference_id: preferencia.preferenceId,
    })
    if (pagoError) {
      console.error('[reintentar-pago] error registrando el nuevo intento:', pagoError.message)
      return new Response(JSON.stringify({ error: 'No se pudo registrar el nuevo intento de pago.' }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true, initPoint: preferencia.initPoint }), { status: 200 })
  } catch (err) {
    console.error('[api/cliente/reintentar-pago]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
