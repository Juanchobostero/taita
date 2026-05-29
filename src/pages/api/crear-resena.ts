import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json()
  const { solicitudId, tecnicoId, calificacion, comentario } = body

  if (!solicitudId || !tecnicoId || !calificacion) {
    return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
  }

  const supabaseUser = createSupabaseServer({ request, cookies })
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

  const supabase = createSupabaseAdmin()

  // Verificar que la solicitud es del cliente y está completada
  const { data: solicitud } = await supabase
    .from('solicitudes')
    .select('id, estado, cliente_id')
    .eq('id', solicitudId)
    .eq('cliente_id', user.id)
    .eq('estado', 'completada')
    .single()

  if (!solicitud) {
    return new Response(JSON.stringify({ error: 'Solicitud no válida' }), { status: 403 })
  }

  // Verificar que no exista ya una reseña para esta solicitud
  const { data: existing } = await supabase
    .from('resenas')
    .select('id')
    .eq('solicitud_id', solicitudId)
    .single()

  if (existing) {
    return new Response(JSON.stringify({ error: 'Ya dejaste una reseña para este servicio' }), { status: 409 })
  }

  const { error } = await supabase
    .from('resenas')
    .insert({
      solicitud_id:  solicitudId,
      tecnico_id:    tecnicoId,
      cliente_id:    user.id,
      calificacion,
      comentario:    comentario ?? null,
    })

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  // Recalcular calificacion_promedio del técnico
  await supabase.rpc('recalcular_calificacion', { p_tecnico_id: tecnicoId })

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
