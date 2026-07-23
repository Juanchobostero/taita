import type { APIRoute } from 'astro'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { createSupabaseServer } from '@/lib/supabase-server'
import { notificarNuevaSolicitud } from '@/lib/notificaciones'
import { chequearDisponibilidad } from '@/lib/disponibilidad'

export const POST: APIRoute = async ({ request, cookies }) => {
  const serverClient = createSupabaseServer({ request, cookies })
  const { data: { user } } = await serverClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })
  }

  const body = await request.json()
  const { tecnicoId, categoriaId, titulo, descripcion, horasEstimadas,
          precioBase, tasaAplicada, totalEstimado, fechaSolicitada, horaSolicitada, direccion } = body

  if (!categoriaId || !titulo || !fechaSolicitada || !horaSolicitada || !direccion) {
    return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
  }

  const supabase = createSupabaseAdmin()

  // Si ya hay un técnico fijo (flujo desde su perfil), re-validar el horario en el servidor
  // por si el cliente lo eligió antes del chequeo del front o el chequeo quedó desactualizado.
  if (tecnicoId) {
    const disponibilidad = await chequearDisponibilidad(supabase, {
      tecnicoId, fecha: fechaSolicitada, hora: horaSolicitada, horasEstimadas,
    })
    if (!disponibilidad.disponible) {
      return new Response(JSON.stringify({
        error:    'El técnico ya tiene otro trabajo agendado en ese horario.',
        sugerido: disponibilidad.sugerido,
      }), { status: 409 })
    }
  }

  const { data: nueva, error } = await supabase.from('solicitudes').insert({
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
    hora_solicitada:  horaSolicitada,
    direccion,
    estado:           'pendiente',
  }).select('id').single()

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  try {
    await notificarNuevaSolicitud(supabase, nueva.id)
  } catch (err) {
    console.error('[crear-solicitud] error notificando:', err)
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
