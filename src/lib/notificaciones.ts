import type { SupabaseClient } from '@supabase/supabase-js'
import { enviarEmail } from './email'

const ADMIN_EMAIL = 'taitasoluciones@gmail.com'

const ESTADO_LABEL: Record<string, string> = {
  pendiente:  'Pendiente',
  asignada:   'Asignada',
  aceptada:   'Aceptada',
  en_curso:   'En curso',
  completada: 'Completada',
  cancelada:  'Cancelada',
}

// Estados en los que el cliente recibe email de aviso. "pendiente" se agregó porque ese estado
// se re-dispara cuando el admin desasigna un técnico ya confirmado (ver comentario más abajo) —
// nunca en la creación de la solicitud — así que avisarle tiene sentido, y de paso la lista de
// solicitudes del cliente (in-app, tiempo real) usa estas notificaciones como disparador para
// refrescarse sola. La excepción es cuando "pendiente" viene de un técnico que RECHAZÓ una
// asignación todavía no confirmada (ver `estadoAnterior` más abajo) — ahí no se avisa al cliente
// porque nunca llegó a enterarse de que se le había asignado alguien.
const AVISAR_CLIENTE = new Set(['pendiente', 'aceptada', 'en_curso', 'completada', 'cancelada'])
// Estados en los que el técnico asignado recibe email de aviso. "asignada" es cuando el admin le
// asigna el trabajo y queda esperando que lo confirme o lo rechace — el técnico ya no se entera
// recién en "aceptada" (que ahora es una acción del propio técnico, no hace falta avisarle de su
// propia acción). "en_curso"/"completada"/"cancelada" además sirven como disparador para que la
// lista de solicitudes del técnico (in-app, tiempo real) se refresque sola.
const AVISAR_TECNICO  = new Set(['asignada', 'en_curso', 'completada', 'cancelada'])

interface SolicitudNotif {
  id:               string
  titulo:           string
  fecha_solicitada: string | null
  hora_solicitada:  string | null
  total_estimado:   number | null
  usuarios:         { id: string; nombre_completo: string; email: string | null } | null
  tecnicos:         { usuario_id: string; usuarios: { nombre_completo: string; email: string | null } | null } | null
  categorias:       { nombre: string } | null
}

async function fetchSolicitudNotif(supabase: SupabaseClient, solicitudId: string): Promise<SolicitudNotif | null> {
  const { data } = await supabase
    .from('solicitudes')
    .select(`
      id, titulo, fecha_solicitada, hora_solicitada, total_estimado,
      usuarios!cliente_id ( id, nombre_completo, email ),
      tecnicos ( usuario_id, usuarios ( nombre_completo, email ) ),
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

// ── Notificaciones in-app (campanita) ───────────────────────────────────────
// Espejan uno a uno los mismos eventos que ya disparan un email — mismo destinatario, mismo
// momento. No inventar sucesos nuevos acá; si hace falta un aviso nuevo, se define primero el
// email correspondiente y después se replica acá.

async function crearNotificacion(
  supabase:    SupabaseClient,
  usuarioId:   string,
  titulo:      string,
  mensaje:     string,
  solicitudId: string | null = null,
): Promise<void> {
  const { error } = await supabase.from('notificaciones').insert({
    usuario_id:   usuarioId,
    solicitud_id: solicitudId,
    titulo,
    mensaje,
  })
  if (error) console.error('[crearNotificacion] error:', error.message)
}

// El mail de admin va a una casilla fija; la notificación in-app, en cambio, se le crea a
// TODOS los usuarios con tipo 'admin' (por si en el futuro hay más de un admin logueado).
async function crearNotificacionesAdmin(
  supabase:    SupabaseClient,
  titulo:      string,
  mensaje:     string,
  solicitudId: string | null = null,
): Promise<void> {
  const { data: admins } = await supabase.from('usuarios').select('id').eq('tipo', 'admin')
  await Promise.all((admins ?? []).map(a => crearNotificacion(supabase, a.id, titulo, mensaje, solicitudId)))
}

/** Notificación in-app para admin al recibir un mensaje de /contacto o /reclamos (sin mail asociado a una solicitud). */
export async function notificarMensajeAdmin(supabase: SupabaseClient, titulo: string, mensaje: string): Promise<void> {
  await crearNotificacionesAdmin(supabase, titulo, mensaje, null)
}

/**
 * Avisa a un técnico que ya no está asignado a una solicitud (el admin la volvió a Pendiente y lo
 * desasignó). Se llama aparte de `notificarCambioEstado` porque para ese momento el `tecnico_id`
 * ya se puso en null, así que el técnico afectado no se puede resolver desde la propia solicitud —
 * hay que pasarlo explícitamente. Además de avisarle, esta notificación es la que hace que la
 * lista de solicitudes del técnico (in-app, tiempo real) se refresque sola y deje de mostrar un
 * trabajo que ya no es suyo.
 */
export async function notificarDesasignacion(
  supabase:         SupabaseClient,
  tecnicoUsuarioId: string,
  tecnicoEmail:     string | null,
  tecnicoNombre:    string,
  tituloSolicitud:  string,
  solicitudId:      string,
): Promise<void> {
  if (tecnicoEmail) {
    await enviarEmail({
      to:      tecnicoEmail,
      subject: `Ya no estás asignado a "${tituloSolicitud}"`,
      html: `
        <p>Hola ${tecnicoNombre},</p>
        <p>La solicitud <strong>${tituloSolicitud}</strong> ya no está asignada a vos — volvió a quedar
        disponible para asignarse a otro técnico.</p>
      `,
    })
  }
  await crearNotificacion(
    supabase, tecnicoUsuarioId,
    `Ya no estás asignado a "${tituloSolicitud}"`,
    'Volvió a quedar disponible para asignarse a otro técnico.',
    solicitudId,
  )
}

/**
 * Cambia el estado de una solicitud, deja registro en el historial (para el timeline del
 * cliente) y dispara los emails y notificaciones in-app correspondientes. Punto único de cambio
 * de estado — no hacer `update({ estado })` directo en otro lado para no perder el
 * historial/las notificaciones.
 */
export async function notificarCambioEstado(
  supabase:      SupabaseClient,
  solicitudId:   string,
  estadoNuevo:   string,
  cambiadoPor:   string | null,
  estadoAnterior?: string,
): Promise<void> {
  const { error } = await supabase
    .from('solicitudes')
    .update({ estado: estadoNuevo, actualizado_en: new Date().toISOString() })
    .eq('id', solicitudId)
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
  const tecnicoId = sol.tecnicos?.usuario_id ?? null
  const categoria = sol.categorias
  const label     = ESTADO_LABEL[estadoNuevo] ?? estadoNuevo
  const fechaHora = formatearFechaHora(sol)

  // El técnico rechazó una asignación que todavía no había confirmado — el cliente nunca se
  // enteró de que se le había asignado alguien, así que no corresponde avisarle de que "volvió"
  // a pendiente (para él nunca dejó de estarlo).
  const esRechazoSinAvisoCliente = estadoNuevo === 'pendiente' && estadoAnterior === 'asignada'

  if (cliente && AVISAR_CLIENTE.has(estadoNuevo) && !esRechazoSinAvisoCliente) {
    const mostrarHorario = estadoNuevo === 'aceptada'

    if (cliente.email) {
      await enviarEmail({
        to:      cliente.email,
        subject: `Tu solicitud "${sol.titulo}" — ${label}`,
        html: `
          <p>Hola ${cliente.nombre_completo},</p>
          <p>Tu solicitud <strong>${sol.titulo}</strong> (${categoria?.nombre ?? 'servicio'}) cambió de estado a
          <strong>${label}</strong>.</p>
          ${mostrarHorario && fechaHora ? `<p>Horario confirmado: <strong>${fechaHora}</strong>.</p>` : ''}
          <p>Revisá tu panel para ver el detalle.</p>
        `,
      })
    }

    await crearNotificacion(
      supabase, cliente.id,
      `Tu solicitud "${sol.titulo}" — ${label}`,
      mostrarHorario && fechaHora ? `Horario confirmado: ${fechaHora}.` : `Cambió de estado a ${label}.`,
      sol.id,
    )
  }

  if (tecnico && tecnicoId && AVISAR_TECNICO.has(estadoNuevo)) {
    const esAsignacion = estadoNuevo === 'asignada'

    if (tecnico.email) {
      await enviarEmail({
        to:      tecnico.email,
        subject: esAsignacion ? `Nuevo trabajo asignado: "${sol.titulo}"` : `Solicitud "${sol.titulo}" — ${label}`,
        html: esAsignacion ? `
          <p>Hola ${tecnico.nombre_completo},</p>
          <p>Te asignaron la solicitud <strong>${sol.titulo}</strong> (${categoria?.nombre ?? 'servicio'}).</p>
          ${fechaHora ? `<p>Horario propuesto: <strong>${fechaHora}</strong>.</p>` : ''}
          <p>Entrá a tu panel para confirmarla o rechazarla.</p>
        ` : `
          <p>Hola ${tecnico.nombre_completo},</p>
          <p>La solicitud <strong>${sol.titulo}</strong> pasó a estado <strong>${label}</strong>.</p>
        `,
      })
    }

    await crearNotificacion(
      supabase, tecnicoId,
      esAsignacion ? `Nuevo trabajo asignado: "${sol.titulo}"` : `Solicitud "${sol.titulo}" — ${label}`,
      esAsignacion ? 'Confirmalo o rechazalo desde tu panel.' : `La solicitud pasó a estado ${label}.`,
      sol.id,
    )
  }

  // La solicitud volvió a Pendiente (por acción del admin desde el dropdown de estado, o porque
  // el técnico rechazó una asignación) → avisarle al admin que quedó libre para (re)asignar.
  if (estadoNuevo === 'pendiente' && cambiadoPor) {
    await enviarEmail({
      to:      ADMIN_EMAIL,
      subject: `La solicitud "${sol.titulo}" volvió a Pendiente`,
      html:    `<p>La solicitud <strong>${sol.titulo}</strong> volvió al estado <strong>Pendiente</strong> y quedó disponible para asignar un técnico.</p>`,
    })
    await crearNotificacionesAdmin(
      supabase,
      `La solicitud "${sol.titulo}" volvió a Pendiente`,
      'Quedó disponible para asignar un técnico.',
      sol.id,
    )
  }
}

/** Email + notificación in-app a cliente y admin al crear una solicitud nueva (Paso 2.1 del backlog). */
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

  if (cliente) {
    if (cliente.email) {
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
    await crearNotificacion(
      supabase, cliente.id,
      `Recibimos tu solicitud "${sol.titulo}"`,
      `${categoria?.nombre ?? 'Servicio'} · Técnico: ${tecnicoTexto}.`,
      sol.id,
    )
  }

  await enviarEmail({
    to:      ADMIN_EMAIL,
    subject: `Nueva solicitud: ${sol.titulo}`,
    html: `
      <p>Cliente: ${cliente?.nombre_completo ?? '—'}</p>
      ${detalle}
    `,
  })
  await crearNotificacionesAdmin(
    supabase,
    `Nueva solicitud: ${sol.titulo}`,
    `Cliente: ${cliente?.nombre_completo ?? '—'}.`,
    sol.id,
  )
}

/** Email + notificación in-app a admin y técnico cuando el cliente da conformidad final (Paso 5 del backlog). */
export async function notificarConformidad(supabase: SupabaseClient, solicitudId: string): Promise<void> {
  const sol = await fetchSolicitudNotif(supabase, solicitudId)
  if (!sol) return

  const cliente   = sol.usuarios
  const tecnico   = sol.tecnicos?.usuarios ?? null
  const tecnicoId = sol.tecnicos?.usuario_id ?? null
  const monto     = sol.total_estimado != null ? `$${sol.total_estimado.toLocaleString('es-AR')}` : 'a confirmar'

  await enviarEmail({
    to:      ADMIN_EMAIL,
    subject: `Conformidad recibida: ${sol.titulo}`,
    html: `
      <p>El cliente <strong>${cliente?.nombre_completo ?? '—'}</strong> dio conformidad sobre la
      solicitud <strong>${sol.titulo}</strong>.</p>
      <p>Monto a registrar: <strong>${monto}</strong>.</p>
    `,
  })
  await crearNotificacionesAdmin(
    supabase,
    `Conformidad recibida: ${sol.titulo}`,
    `Monto: ${monto}.`,
    sol.id,
  )

  if (tecnico && tecnicoId) {
    if (tecnico.email) {
      await enviarEmail({
        to:      tecnico.email,
        subject: `Conformidad recibida: ${sol.titulo}`,
        html: `
          <p>Hola ${tecnico.nombre_completo},</p>
          <p>El cliente dio conformidad sobre <strong>${sol.titulo}</strong>. El pago se va a reflejar
          próximamente en la cuenta que declaraste.</p>
        `,
      })
    }
    await crearNotificacion(
      supabase, tecnicoId,
      `Conformidad recibida: ${sol.titulo}`,
      'El pago se va a reflejar próximamente en tu cuenta.',
      sol.id,
    )
  }
}
