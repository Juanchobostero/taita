import { randomUUID } from 'node:crypto'
import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'
import { notificarConformidad } from '@/lib/notificaciones'
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
      .select('id, numero, titulo, estado, cliente_id, total_estimado, conformidad_cliente')
      .eq('id', solicitudId)
      .single()

    if (!sol || sol.cliente_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Solicitud no encontrada' }), { status: 403 })
    }
    if (sol.estado !== 'completada') {
      return new Response(JSON.stringify({ error: 'Solo se puede confirmar un servicio ya completado.' }), { status: 400 })
    }
    if (sol.conformidad_cliente) {
      return new Response(JSON.stringify({ error: 'Ya diste conformidad sobre esta solicitud.' }), { status: 400 })
    }

    const { error: updError } = await supabase
      .from('solicitudes')
      .update({
        conformidad_cliente: true,
        conformidad_en:      new Date().toISOString(),
        actualizado_en:      new Date().toISOString(),
      })
      .eq('id', solicitudId)
    if (updError) throw updError

    const monto  = sol.total_estimado ?? 0
    const pagoId = randomUUID() // generado antes de crear la preferencia — se usa como external_reference (ver crearPreferencia)

    // Si Mercado Pago está configurado, se crea la preferencia de pago real antes de guardar el
    // registro — así queda directo con el `mp_preference_id` y el estado correcto, sin un update
    // aparte. Si no está configurado (falta MP_ACCESS_TOKEN), se cae al mock de siempre
    // ('registrado'), igual que Resend cuando falta su API key: no rompe nada.
    let preferencia: Awaited<ReturnType<typeof crearPreferencia>> = null
    try {
      preferencia = await crearPreferencia({ pagoId, solicitudId, titulo: `#${sol.numero} — ${sol.titulo}`, monto })
    } catch (err) {
      console.error('[dar-conformidad] error creando preferencia de Mercado Pago:', err)
    }

    const { error: pagoError } = await supabase.from('pagos').insert({
      id:               pagoId,
      solicitud_id:     solicitudId,
      monto,
      estado:           preferencia ? 'pendiente_pago' : 'registrado',
      mp_preference_id: preferencia?.preferenceId ?? null,
    })
    if (pagoError) console.error('[dar-conformidad] error registrando pago:', pagoError.message)

    try {
      await notificarConformidad(supabase, solicitudId)
    } catch (err) {
      console.error('[dar-conformidad] error notificando:', err)
    }

    return new Response(JSON.stringify({ ok: true, initPoint: preferencia?.initPoint ?? null }), { status: 200 })
  } catch (err) {
    console.error('[api/cliente/dar-conformidad]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
