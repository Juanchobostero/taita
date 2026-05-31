import type { APIRoute } from 'astro'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { createSupabaseServer } from '@/lib/supabase-server'

export const POST: APIRoute = async ({ request, cookies }) => {
  const serverClient = createSupabaseServer({ request, cookies })
  const { data: { user } } = await serverClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })
  }

  const body = await request.json()
  const { tecnicoId, categoriaId, titulo, descripcion, horasEstimadas,
          precioBase, tasaAplicada, totalEstimado, fechaSolicitada, direccion } = body

  if (!categoriaId || !titulo || !fechaSolicitada || !direccion) {
    return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
  }

  const supabase = createSupabaseAdmin()
  const { error } = await supabase.from('solicitudes').insert({
    cliente_id:       user.id,
    tecnico_id:       tecnicoId || null,
    categoria_id:     categoriaId,
    titulo,
    descripcion:      descripcion || null,
    horas_estimadas:  horasEstimadas,
    precio_base:      precioBase ?? null,
    tasa_aplicada:    tasaAplicada ?? null,
    total_estimado:   totalEstimado ?? null,
    fecha_solicitada: fechaSolicitada,
    direccion,
    estado:           'pendiente',
  })

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
