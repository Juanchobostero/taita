import type { SupabaseClient } from '@supabase/supabase-js'
import { enviarEmail } from './email'

const ADMIN_EMAIL = 'taitasoluciones@gmail.com'
const SITE_URL    = import.meta.env.PUBLIC_SITE_URL || 'https://taita-nu.vercel.app'

const ESTADO_LABEL: Record<string, string> = {
  pendiente:  'Pendiente',
  asignada:   'Asignada',
  aceptada:   'Aceptada',
  en_curso:   'En curso',
  completada: 'Completada',
  cancelada:  'Cancelada',
}

// Estados en los que el cliente recibe email de aviso.
const AVISAR_CLIENTE = new Set(['aceptada', 'en_curso', 'completada', 'cancelada'])
// Estados en los que el técnico asignado recibe email de aviso.
const AVISAR_TECNICO  = new Set(['cancelada'])

interface SolicitudNotif {
  id:               string
  titulo:           string
  fecha_solicitada: string | null
  hora_solicitada:  string | null
  usuarios:         { nombre_completo: string; email: string | null } | null
  tecnicos:         { usuarios: { nombre_completo: string; email: string | null } | null } | null
  categorias:       { nombre: string } | null
}

async function fetchSolicitudNotif(supabase: SupabaseClient, solicitudId: string): Promise<SolicitudNotif | null> {
  const { data } = await supabase
    .from('solicitudes')
    .select(`
      id, titulo, fecha_solicitada, hora_solicitada,
      usuarios!cliente_id ( nombre_completo, email ),
      tecnicos ( usuarios ( nombre_completo, email ) ),
      categorias ( nombre )
    `)
    .eq('id', solicitudId)
    .single()
  return (data as unknown as SolicitudNotif) ?? null
}

function formatearFechaHora(sol: Pick<SolicitudNotif, 'fecha_solicitada' | 'hora_solicitada'>): string | null {
  if (!sol.fecha_solicitada) return null
  const fecha = new Date(sol.fecha_solicitada.slice(0, 10) + 'T00:00:00')
    .toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const hora  = sol.hora_solicitada ? ` a las ${sol.hora_solicitada.slice(0, 5)}` : ''
  return `${fecha}${hora}`
}

/**
 * Cambia el estado de una solicitud, deja registro en el historial (para el timeline del
 * cliente) y dispara los emails correspondientes. Punto único de cambio de estado — no hacer
 * `update({ estado })` directo en otro lado para no perder el historial/las notificaciones.
 */
export async function notificarCambioEstado(
  supabase:    SupabaseClient,
  solicitudId: string,
  estadoNuevo: string,
  cambiadoPor: string | null,
): Promise<void> {
  const { error } = await supabase.from('solicitudes').update({ estado: estadoNuevo }).eq('id', solicitudId)
  if (error) throw error

  const { error: histError } = await supabase.from('solicitud_historial_estados').insert({
    solicitud_id: solicitudId,
    estado:       estadoNuevo,
    cambiado_por: cambiadoPor,
  })
  if (histError) console.error('[notificarCambioEstado] error guardando historial:', histError.message)

  const sol = await fetchSolicitudNotif(supabase, solicitudId)
  if (!sol) return

  const cliente   = sol.usuarios
  const tecnico   = sol.tecnicos?.usuarios ?? null
  const categoria = sol.categorias
  const label     = ESTADO_LABEL[estadoNuevo] ?? estadoNuevo
  const link      = `${SITE_URL}/dashboard/cliente`

  if (cliente?.email && AVISAR_CLIENTE.has(estadoNuevo)) {
    const fechaHora = estadoNuevo === 'aceptada' ? formatearFechaHora(sol) : null
    await enviarEmail({
      to:      cliente.email,
      subject: `Tu solicitud "${sol.titulo}" — ${label}`,
      html: `
        <p>Hola ${cliente.nombre_completo},</p>
        <p>Tu solicitud <strong>${sol.titulo}</strong> (${categoria?.nombre ?? 'servicio'}) cambió de estado a
        <strong>${label}</strong>.</p>
        ${fechaHora ? `<p>Horario confirmado: <strong>${fechaHora}</strong>.</p>` : ''}
        <p><a href="${link}">Ver el detalle en tu panel</a></p>
      `,
    })
  }

  if (tecnico?.email && AVISAR_TECNICO.has(estadoNuevo)) {
    await enviarEmail({
      to:      tecnico.email,
      subject: `Solicitud "${sol.titulo}" — ${label}`,
      html: `
        <p>Hola ${tecnico.nombre_completo},</p>
        <p>La solicitud <strong>${sol.titulo}</strong> pasó a estado <strong>${label}</strong>.</p>
      `,
    })
  }

  // El técnico rechazó el trabajo (vuelve a pendiente) → avisar al admin para reasignar.
  if (estadoNuevo === 'pendiente' && cambiadoPor) {
    await enviarEmail({
      to:      ADMIN_EMAIL,
      subject: `Técnico rechazó la solicitud "${sol.titulo}"`,
      html:    `<p>La solicitud <strong>${sol.titulo}</strong> quedó nuevamente disponible para reasignar.</p>`,
    })
  }
}

/** Email a cliente y admin al crear una solicitud nueva (Paso 2.1 del backlog). */
export async function notificarNuevaSolicitud(supabase: SupabaseClient, solicitudId: string): Promise<void> {
  const sol = await fetchSolicitudNotif(supabase, solicitudId)
  if (!sol) return

  const cliente     = sol.usuarios
  const tecnico     = sol.tecnicos?.usuarios ?? null
  const categoria   = sol.categorias
  const fecha       = formatearFechaHora(sol) ?? 'a coordinar'
  const tecnicoTexto = tecnico ? tecnico.nombre_completo : 'pendiente de asignación'

  const detalle = `
    <ul>
      <li>Servicio: ${categoria?.nombre ?? '—'}</li>
      <li>Técnico: ${tecnicoTexto}</li>
      <li>Fecha: ${fecha}</li>
    </ul>
  `

  if (cliente?.email) {
    await enviarEmail({
      to:      cliente.email,
      subject: `Recibimos tu solicitud "${sol.titulo}"`,
      html: `
        <p>Hola ${cliente.nombre_completo},</p>
        <p>Recibimos tu solicitud <strong>${sol.titulo}</strong>.</p>
        ${detalle}
        <p>Revisá tu perfil para ver el detalle.</p>
      `,
    })
  }

  await enviarEmail({
    to:      ADMIN_EMAIL,
    subject: `Nueva solicitud: ${sol.titulo}`,
    html: `
      <p>Cliente: ${cliente?.nombre_completo ?? '—'}</p>
      ${detalle}
    `,
  })
}
