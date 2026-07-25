import type { APIRoute } from 'astro'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { notificarCambioEstado } from '@/lib/notificaciones'

function autorizado(request: Request, url: URL): boolean {
  const secret = import.meta.env.CRON_SECRET
  if (!secret) return true // sin secret configurado, no bloquea (mismo criterio que Resend/email)
  const header = request.headers.get('authorization')
  if (header === `Bearer ${secret}`) return true
  if (url.searchParams.get('secret') === secret) return true
  return false
}

function inicioSolicitud(fechaSolicitada: string, horaSolicitada: string): Date {
  const fecha = fechaSolicitada.slice(0, 10)
  const hora  = horaSolicitada.slice(0, 5)
  return new Date(`${fecha}T${hora}:00`)
}

export const GET: APIRoute = async ({ request, url }) => {
  if (!autorizado(request, url)) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }

  const supabase = createSupabaseAdmin()
  const ahora     = new Date()
  let aEnCurso    = 0
  let aCompletada = 0
  const errores: string[] = []

  // Aceptada -> En curso: ya llegó la fecha/hora de inicio.
  const { data: aceptadas } = await supabase
    .from('solicitudes')
    .select('id, fecha_solicitada, hora_solicitada')
    .eq('estado', 'aceptada')
    .not('fecha_solicitada', 'is', null)
    .not('hora_solicitada', 'is', null)

  for (const s of aceptadas ?? []) {
    const inicio = inicioSolicitud(s.fecha_solicitada as string, s.hora_solicitada as string)
    if (ahora < inicio) continue
    try {
      await notificarCambioEstado(supabase, s.id, 'en_curso', null)
      aEnCurso++
    } catch (err) {
      errores.push(`en_curso ${s.id}: ${err}`)
    }
  }

  // En curso -> Completada: PAUSADO a pedido de Agustín (2026-07-24). Dependía de
  // "horas_estimadas", campo que se sacó porque los trabajos ya no se van a medir por horas (van
  // a usar m² u otra métrica a definir). Hasta que se defina un criterio nuevo, el paso a
  // "Completada" queda 100% manual: el técnico lo hace vía "Completar trabajo"
  // (src/pages/api/tecnico/completar.ts) o el admin lo cambia a mano. No borramos esta lógica,
  // solo la desactivamos, para retomarla cuando haya una métrica definida.
  // const { data: enCurso } = await supabase
  //   .from('solicitudes')
  //   .select('id, fecha_solicitada, hora_solicitada, horas_estimadas')
  //   .eq('estado', 'en_curso')
  //   .not('fecha_solicitada', 'is', null)
  //   .not('hora_solicitada', 'is', null)
  //
  // for (const s of enCurso ?? []) {
  //   const inicio = inicioSolicitud(s.fecha_solicitada as string, s.hora_solicitada as string)
  //   const fin    = new Date(inicio.getTime() + (s.horas_estimadas ?? 1) * 60 * 60 * 1000)
  //   if (ahora < fin) continue
  //   try {
  //     await notificarCambioEstado(supabase, s.id, 'completada', null)
  //     aCompletada++
  //   } catch (err) {
  //     errores.push(`completada ${s.id}: ${err}`)
  //   }
  // }

  if (errores.length) console.error('[cron/actualizar-estados]', errores)

  return new Response(JSON.stringify({ ok: true, aEnCurso, aCompletada, errores }), { status: 200 })
}
