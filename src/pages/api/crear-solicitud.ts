import type { APIRoute } from 'astro'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { createSupabaseServer } from '@/lib/supabase-server'
import { notificarNuevaSolicitud } from '@/lib/notificaciones'
import { chequearDisponibilidad } from '@/lib/disponibilidad'

interface Body {
  tecnicoId?:           string | null
  categoriaId:           string
  categoriaSubitemId?:   string | null
  titulo:                string
  descripcion?:          string | null
  precioBase?:           number | null
  tasaAplicada?:         number | null
  totalEstimado?:        number | null
  fechaSolicitada:       string
  horaSolicitada:        string
  direccion:              string
  latitud?:               number | null
  longitud?:              number | null
  esCotizacion?:          boolean
  imagenesCotizacion?:   string[]
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const serverClient = createSupabaseServer({ request, cookies })
  const { data: { user } } = await serverClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })
  }

  const body = await request.json() as Body
  const { tecnicoId, categoriaId, categoriaSubitemId, titulo, descripcion,
          precioBase, tasaAplicada, totalEstimado, fechaSolicitada, horaSolicitada, direccion,
          latitud, longitud, esCotizacion, imagenesCotizacion } = body

  if (!categoriaId || !titulo || !fechaSolicitada || !horaSolicitada || !direccion) {
    return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
  }
  // El canal de cotización pide sí o sí una descripción del problema (es el primer mensaje del
  // chat con el admin) — sin esto el chat arrancaría vacío.
  if (esCotizacion && !descripcion?.trim()) {
    return new Response(JSON.stringify({ error: 'Describí el problema para pedir una cotización' }), { status: 400 })
  }

  const supabase = createSupabaseAdmin()

  // Si ya hay un técnico fijo (flujo desde su perfil), re-validar el horario en el servidor
  // por si el cliente lo eligió antes del chequeo del front o el chequeo quedó desactualizado.
  if (tecnicoId) {
    const disponibilidad = await chequearDisponibilidad(supabase, {
      tecnicoId, fecha: fechaSolicitada, hora: horaSolicitada,
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
    categoria_subitem_id: categoriaSubitemId || null,
    titulo,
    descripcion:      descripcion || null,
    horas_estimadas:  null,
    // En el canal de cotización el precio lo define el admin después de chatear con el cliente —
    // se ignora cualquier precio que haya llegado en el body (no debería llegar ninguno desde el
    // wizard en este caso, pero se fuerza igual acá como garantía server-side).
    precio_base:      esCotizacion ? null : precioBase ?? null,
    tasa_aplicada:    esCotizacion ? null : tasaAplicada ?? null,
    total_estimado:   esCotizacion ? null : totalEstimado ?? null,
    fecha_solicitada: fechaSolicitada,
    hora_solicitada:  horaSolicitada,
    direccion,
    latitud:          typeof latitud === 'number' ? latitud : null,
    longitud:         typeof longitud === 'number' ? longitud : null,
    estado:           esCotizacion ? 'en_cotizacion' : 'pendiente',
    es_cotizacion:    !!esCotizacion,
  }).select('id').single()

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  // El primer mensaje del chat de cotización es la descripción + fotos que cargó el cliente en el
  // wizard — así el admin ve el pedido completo apenas entra a la solicitud, sin un paso aparte.
  if (esCotizacion) {
    const { error: msgError } = await supabase.from('cotizacion_mensajes').insert({
      solicitud_id: nueva.id,
      usuario_id:   user.id,
      mensaje:      descripcion,
      imagenes:     Array.isArray(imagenesCotizacion) && imagenesCotizacion.length ? imagenesCotizacion : null,
    })
    if (msgError) console.error('[crear-solicitud] error creando primer mensaje de cotización:', msgError.message)
  }

  try {
    await notificarNuevaSolicitud(supabase, nueva.id)
  } catch (err) {
    console.error('[crear-solicitud] error notificando:', err)
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
