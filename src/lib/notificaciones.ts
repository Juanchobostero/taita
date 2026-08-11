import type { SupabaseClient } from '@supabase/supabase-js'
import { enviarEmail } from './email'
import { generarReciboPDF } from './recibo'
import { FRANJA_LABEL, type FranjaHoraria } from './disponibilidad'

const ADMIN_EMAIL = 'taitasoluciones@gmail.com'

const ESTADO_LABEL: Record<string, string> = {
  pendiente:     'Pendiente',
  asignada:      'Asignada',
  aceptada:      'Aceptada',
  en_curso:      'En curso',
  completada:    'Completada',
  finalizada:    'Finalizada',
  cancelada:     'Cancelada',
  en_cotizacion: 'En cotización',
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
// propia acción). "en_curso"/"completada"/"cancelada"/"finalizada" además sirven como disparador
// para que la lista de solicitudes del técnico (in-app, tiempo real) se refresque sola — y sí, el
// técnico recibe aviso aunque "completada"/"finalizada" sean acciones suyas: es el mismo criterio
// que ya existía para "completada" (queda como una especie de recibo/confirmación en su panel de
// notificaciones), no hace falta un caso especial para "finalizada".
const AVISAR_TECNICO  = new Set(['asignada', 'en_curso', 'completada', 'finalizada', 'cancelada'])

interface SolicitudNotif {
  id:               string
  numero:           number
  titulo:           string
  fecha_solicitada: string | null
  hora_solicitada:  string | null
  total_estimado:   number | null
  usuarios:         { id: string; nombre_completo: string; email: string | null } | null
  tecnicos:         { usuario_id: string; usuarios: { nombre_completo: string; email: string | null } | null } | null
  categorias:       { nombre: string } | null
}

// Etiqueta que se usa en todos los emails y notificaciones al referenciar una solicitud — el
// número corto es más fácil de decir/buscar que el título solo, y es el mismo que ve el usuario
// en su panel (pedido de Agustín: "mostrar código/nro de solicitud como título").
function etiqueta(sol: { numero: number; titulo: string }): string {
  return `#${sol.numero} — ${sol.titulo}`
}

async function fetchSolicitudNotif(supabase: SupabaseClient, solicitudId: string): Promise<SolicitudNotif | null> {
  const { data } = await supabase
    .from('solicitudes')
    .select(`
      id, numero, titulo, fecha_solicitada, hora_solicitada, total_estimado,
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
 * Se llama cuando se registra un técnico nuevo (queda `activo: false` hasta que el admin lo
 * aprueba manualmente desde el panel). Avisa a las dos puntas: al admin, para que sepa que hay
 * alguien esperando aprobación, y al propio técnico, para que sepa que su cuenta quedó pendiente
 * y no es un error — antes esto no avisaba a nadie, el único indicio era el aviso pasivo dentro
 * del panel del técnico ("Tu perfil está pendiente de aprobación").
 */
export async function notificarNuevoTecnico(
  supabase:         SupabaseClient,
  tecnicoUsuarioId: string,
  nombreCompleto:   string,
  tecnicoEmail:     string | null,
): Promise<void> {
  await enviarEmail({
    to:      ADMIN_EMAIL,
    subject: `Nuevo técnico registrado: ${nombreCompleto}`,
    html: `
      <p><strong>${nombreCompleto}</strong> se registró como técnico y está esperando aprobación.</p>
      <p>Entrá al panel de administración para revisar sus datos y activarlo.</p>
    `,
  })
  await crearNotificacionesAdmin(
    supabase,
    `Nuevo técnico registrado: ${nombreCompleto}`,
    'Está esperando tu aprobación para empezar a recibir trabajos.',
    null,
  )

  if (tecnicoEmail) {
    await enviarEmail({
      to:      tecnicoEmail,
      subject: 'Recibimos tu registro en Taita Soluciones',
      html: `
        <p>Hola ${nombreCompleto},</p>
        <p>Recibimos tu registro como técnico. Antes de que puedas empezar a recibir trabajos, un
        administrador va a revisar y validar tu identidad.</p>
        <p>Te avisamos apenas tu cuenta esté aprobada.</p>
      `,
    })
  }
  await crearNotificacion(
    supabase, tecnicoUsuarioId,
    'Recibimos tu registro',
    'Tu cuenta está pendiente de aprobación — te avisamos apenas un administrador la valide.',
    null,
  )
}

/**
 * Se llama cuando se registra un cliente nuevo (Fase 8.1) — a diferencia del técnico, el cliente
 * no espera aprobación manual, sino que confirme su email (link que le manda Supabase Auth) antes
 * de poder pedir un servicio. Avisa al admin (que hay un registro nuevo sin confirmar) y deja una
 * notificación in-app para el propio cliente — **sin mandarle un email aparte**: Supabase Auth ya
 * le manda el suyo con el link real de confirmación (ver Custom SMTP/template en Fase 8.1), así
 * que un segundo email desde acá solo sería ruido duplicado (probado por Jota: dos correos por un
 * mismo registro, confuso — el de acá ni siquiera tenía el link, solo decía "mirá el otro mail").
 */
export async function notificarClientePendienteVerificacion(
  supabase:         SupabaseClient,
  clienteUsuarioId: string,
  nombreCompleto:   string,
): Promise<void> {
  await enviarEmail({
    to:      ADMIN_EMAIL,
    subject: `Nuevo cliente registrado: ${nombreCompleto}`,
    html: `
      <p><strong>${nombreCompleto}</strong> se registró como cliente y está esperando confirmar su email.</p>
    `,
  })
  await crearNotificacionesAdmin(
    supabase,
    `Nuevo cliente registrado: ${nombreCompleto}`,
    'Todavía no confirmó su correo.',
    null,
  )

  await crearNotificacion(
    supabase, clienteUsuarioId,
    'Confirmá tu correo',
    'Todavía no podés pedir servicios — confirmá tu correo desde el link que te mandamos.',
    null,
  )
}

/**
 * Se llama cuando el cliente confirma su email (Fase 8.1) — ya puede pedir servicios. Avisa al
 * propio cliente (confirmación) y al admin (deja de estar "pendiente de verificar").
 */
export async function notificarEmailVerificado(
  supabase:         SupabaseClient,
  clienteUsuarioId: string,
  nombreCompleto:   string,
  clienteEmail:     string | null,
): Promise<void> {
  if (clienteEmail) {
    await enviarEmail({
      to:      clienteEmail,
      subject: '¡Tu correo fue verificado!',
      html: `
        <p>Hola ${nombreCompleto},</p>
        <p>Confirmamos tu correo — ya podés pedir servicios en Taita Soluciones.</p>
      `,
    })
  }
  await crearNotificacion(
    supabase, clienteUsuarioId,
    '¡Tu correo fue verificado!',
    'Ya podés pedir servicios.',
    null,
  )
  await crearNotificacionesAdmin(
    supabase,
    `${nombreCompleto} confirmó su correo`,
    'Ya puede pedir servicios.',
    null,
  )
}

/**
 * Se llama cuando el admin aprueba a un técnico pendiente (`activo` pasa a `true` desde el panel).
 * Antes esto no avisaba nada — el técnico solo se enteraba si volvía a entrar a su panel y notaba
 * que el aviso de "pendiente de aprobación" ya no estaba.
 */
export async function notificarTecnicoAprobado(
  supabase:         SupabaseClient,
  tecnicoUsuarioId: string,
  nombreCompleto:   string,
  tecnicoEmail:     string | null,
): Promise<void> {
  if (tecnicoEmail) {
    await enviarEmail({
      to:      tecnicoEmail,
      subject: '¡Tu cuenta de técnico fue aprobada!',
      html: `
        <p>Hola ${nombreCompleto},</p>
        <p>Validamos tu registro y tu cuenta ya está activa. Ya podés empezar a recibir trabajos a
        través de Taita Soluciones.</p>
      `,
    })
  }
  await crearNotificacion(
    supabase, tecnicoUsuarioId,
    '¡Tu cuenta fue aprobada!',
    'Tu perfil de técnico ya está activo — ya podés empezar a recibir trabajos.',
    null,
  )
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
  numeroSolicitud:  number,
  tituloSolicitud:  string,
  solicitudId:      string,
): Promise<void> {
  const label = etiqueta({ numero: numeroSolicitud, titulo: tituloSolicitud })
  if (tecnicoEmail) {
    await enviarEmail({
      to:      tecnicoEmail,
      subject: `Ya no estás asignado a ${label}`,
      html: `
        <p>Hola ${tecnicoNombre},</p>
        <p>La solicitud <strong>${label}</strong> ya no está asignada a vos — volvió a quedar
        disponible para asignarse a otro técnico.</p>
      `,
    })
  }
  await crearNotificacion(
    supabase, tecnicoUsuarioId,
    `Ya no estás asignado a ${label}`,
    'Volvió a quedar disponible para asignarse a otro técnico.',
    solicitudId,
  )
}

/**
 * Avisa al cliente que la franja horaria que el admin le comprometió al técnico (mañana/tarde/
 * noche) no coincide con la que él había pedido en el formulario — se llama solo cuando hay
 * discrepancia, no en cada asignación. No bloquea nada ni cambia el estado de la solicitud, es
 * puramente informativo (decisión tomada con Jota: el admin decide, el cliente se entera).
 */
export async function notificarFranjaAsignada(
  supabase:    SupabaseClient,
  solicitudId: string,
  franja:      FranjaHoraria,
): Promise<void> {
  const sol = await fetchSolicitudNotif(supabase, solicitudId)
  if (!sol?.usuarios) return

  const cliente = sol.usuarios
  const label   = FRANJA_LABEL[franja]

  if (cliente.email) {
    await enviarEmail({
      to:      cliente.email,
      subject: `Ajustamos el horario de tu solicitud ${etiqueta(sol)}`,
      html: `
        <p>Hola ${cliente.nombre_completo},</p>
        <p>Le asignamos un técnico a tu solicitud <strong>${etiqueta(sol)}</strong>, pero con una
        franja horaria distinta a la que habías pedido: <strong>${label}</strong>. Es el horario en
        el que el técnico asignado tiene disponibilidad.</p>
        <p>Revisá tu panel para ver el detalle.</p>
      `,
    })
  }

  await crearNotificacion(
    supabase, cliente.id,
    `Ajustamos el horario de tu solicitud ${etiqueta(sol)}`,
    `Nueva franja asignada: ${label}.`,
    sol.id,
  )
}

/**
 * Se llama cuando el admin asigna técnico + horario a una solicitud (Fase 8.4) — el horario final
 * (coordinado por el admin con el técnico, dentro o fuera de la app) puede no coincidir con la
 * franja que había pedido el cliente. Antes esto era solo informativo (`notificarFranjaAsignada`,
 * arriba); ahora el cliente tiene que aceptarlo o rechazarlo explícitamente
 * (`ResponderHorario.tsx` / `api/cliente/responder-horario.ts`), así que el aviso tiene que
 * pedirle una acción, no solo informar.
 */
export async function notificarHorarioPropuesto(
  supabase:    SupabaseClient,
  solicitudId: string,
  franja:      FranjaHoraria,
): Promise<void> {
  const sol = await fetchSolicitudNotif(supabase, solicitudId)
  if (!sol?.usuarios) return

  const cliente   = sol.usuarios
  const label     = FRANJA_LABEL[franja]
  const fechaHora = formatearFechaHora(sol)

  if (cliente.email) {
    await enviarEmail({
      to:      cliente.email,
      subject: `Te proponemos un horario para tu solicitud ${etiqueta(sol)}`,
      html: `
        <p>Hola ${cliente.nombre_completo},</p>
        <p>Le asignamos un técnico a tu solicitud <strong>${etiqueta(sol)}</strong>, con este horario:
        <strong>${fechaHora ?? '—'} (${label})</strong>.</p>
        <p>Entrá a tu panel para aceptarlo o pedir que se reprograme.</p>
      `,
    })
  }
  await crearNotificacion(
    supabase, cliente.id,
    `Te proponemos un horario — ${etiqueta(sol)}`,
    `${fechaHora ?? ''} (${label}). Entrá a tu panel para aceptarlo o rechazarlo.`,
    sol.id,
  )
}

/**
 * Se llama cuando el cliente responde (acepta/rechaza) el horario propuesto (Fase 8.4) — aparte
 * del efecto que ya tiene la respuesta en sí (aceptar solo guarda el flag; rechazar dispara
 * `notificarCambioEstado(..., 'pendiente', ...)`, que ya avisa genérico), esta función le manda al
 * admin un aviso explícito de qué pasó, mismo criterio que `notificarCotizacionRespuesta` en
 * Fase 7b.
 */
export async function notificarHorarioRespuesta(
  supabase:    SupabaseClient,
  solicitudId: string,
  aceptado:    boolean,
): Promise<void> {
  const sol = await fetchSolicitudNotif(supabase, solicitudId)
  if (!sol) return

  const titulo = aceptado
    ? `El cliente confirmó el horario — ${etiqueta(sol)}`
    : `El cliente rechazó el horario — ${etiqueta(sol)}`
  const mensaje = aceptado
    ? 'Ya quedó confirmado.'
    : 'Quedó disponible para reprogramar con otro horario.'

  await enviarEmail({ to: ADMIN_EMAIL, subject: titulo, html: `<p>${mensaje}</p>` })
  await crearNotificacionesAdmin(supabase, titulo, mensaje, sol.id)
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
        subject: `Tu solicitud ${etiqueta(sol)} — ${label}`,
        html: `
          <p>Hola ${cliente.nombre_completo},</p>
          <p>Tu solicitud <strong>${etiqueta(sol)}</strong> (${categoria?.nombre ?? 'servicio'}) cambió de estado a
          <strong>${label}</strong>.</p>
          ${mostrarHorario && fechaHora ? `<p>Horario confirmado: <strong>${fechaHora}</strong>.</p>` : ''}
          <p>Revisá tu panel para ver el detalle.</p>
        `,
      })
    }

    await crearNotificacion(
      supabase, cliente.id,
      `Tu solicitud ${etiqueta(sol)} — ${label}`,
      mostrarHorario && fechaHora ? `Horario confirmado: ${fechaHora}.` : `Cambió de estado a ${label}.`,
      sol.id,
    )
  }

  if (tecnico && tecnicoId && AVISAR_TECNICO.has(estadoNuevo)) {
    const esAsignacion = estadoNuevo === 'asignada'

    if (tecnico.email) {
      await enviarEmail({
        to:      tecnico.email,
        subject: esAsignacion ? `Nuevo trabajo asignado: ${etiqueta(sol)}` : `Solicitud ${etiqueta(sol)} — ${label}`,
        html: esAsignacion ? `
          <p>Hola ${tecnico.nombre_completo},</p>
          <p>Te asignaron la solicitud <strong>${etiqueta(sol)}</strong> (${categoria?.nombre ?? 'servicio'}).</p>
          ${fechaHora ? `<p>Horario propuesto: <strong>${fechaHora}</strong>.</p>` : ''}
          <p>Entrá a tu panel para confirmarla o rechazarla.</p>
        ` : `
          <p>Hola ${tecnico.nombre_completo},</p>
          <p>La solicitud <strong>${etiqueta(sol)}</strong> pasó a estado <strong>${label}</strong>.</p>
        `,
      })
    }

    await crearNotificacion(
      supabase, tecnicoId,
      esAsignacion ? `Nuevo trabajo asignado: ${etiqueta(sol)}` : `Solicitud ${etiqueta(sol)} — ${label}`,
      esAsignacion ? 'Confirmalo o rechazalo desde tu panel.' : `La solicitud pasó a estado ${label}.`,
      sol.id,
    )
  }

  // La solicitud volvió a Pendiente (por acción del admin desde el dropdown de estado, o porque
  // el técnico rechazó una asignación) → avisarle al admin que quedó libre para (re)asignar.
  if (estadoNuevo === 'pendiente' && cambiadoPor) {
    await enviarEmail({
      to:      ADMIN_EMAIL,
      subject: `La solicitud ${etiqueta(sol)} volvió a Pendiente`,
      html:    `<p>La solicitud <strong>${etiqueta(sol)}</strong> volvió al estado <strong>Pendiente</strong> y quedó disponible para asignar un técnico.</p>`,
    })
    await crearNotificacionesAdmin(
      supabase,
      `La solicitud ${etiqueta(sol)} volvió a Pendiente`,
      'Quedó disponible para asignar un técnico.',
      sol.id,
    )
  }

  // El técnico terminó el trabajo — el admin no se enteraba de esto antes (pedido de Agustín).
  if (estadoNuevo === 'completada') {
    await enviarEmail({
      to:      ADMIN_EMAIL,
      subject: `Trabajo completado — ${etiqueta(sol)}`,
      html: `
        <p>El técnico <strong>${tecnico?.nombre_completo ?? '—'}</strong> marcó como completada la
        solicitud <strong>${etiqueta(sol)}</strong>${cliente ? ` (cliente: ${cliente.nombre_completo})` : ''}.</p>
      `,
    })
    await crearNotificacionesAdmin(
      supabase,
      `Trabajo completado — ${etiqueta(sol)}`,
      `Técnico: ${tecnico?.nombre_completo ?? '—'}.`,
      sol.id,
    )
  }

  // El técnico cerró definitivamente el servicio (después de que se acreditó el pago) — recién
  // acá cuenta como "terminado" para las estadísticas (ver api/tecnico/finalizar-servicio.ts).
  // Solo se avisa al admin — cliente y técnico ya se enteraron de todo lo que importa en los pasos
  // anteriores (conformidad, pago acreditado); esto es un cierre administrativo interno.
  if (estadoNuevo === 'finalizada') {
    await crearNotificacionesAdmin(
      supabase,
      `Servicio cerrado — ${etiqueta(sol)}`,
      `El técnico ${tecnico?.nombre_completo ?? '—'} cerró el servicio. Ya cuenta en sus estadísticas.`,
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
        subject: `Recibimos tu solicitud ${etiqueta(sol)}`,
        html: `
          <p>Hola ${cliente.nombre_completo},</p>
          <p>Recibimos tu solicitud <strong>${etiqueta(sol)}</strong>.</p>
          ${detalle}
          <p>Revisá tu perfil para ver el detalle.</p>
        `,
      })
    }
    await crearNotificacion(
      supabase, cliente.id,
      `Recibimos tu solicitud ${etiqueta(sol)}`,
      `${categoria?.nombre ?? 'Servicio'} · Técnico: ${tecnicoTexto}.`,
      sol.id,
    )
  }

  await enviarEmail({
    to:      ADMIN_EMAIL,
    subject: `Nueva solicitud: ${etiqueta(sol)}`,
    html: `
      <p>Cliente: ${cliente?.nombre_completo ?? '—'}</p>
      ${detalle}
    `,
  })
  await crearNotificacionesAdmin(
    supabase,
    `Nueva solicitud: ${etiqueta(sol)}`,
    `Cliente: ${cliente?.nombre_completo ?? '—'}.`,
    sol.id,
  )
}

/**
 * Se llama cuando cliente o admin mandan un mensaje nuevo en el chat de una solicitud "en
 * cotización" (Fase 7b). Avisa siempre al OTRO participante — nunca al que acaba de escribir.
 * Igual que el resto de los chats/notificaciones de la app, esto es lo único que dispara el
 * refresco en tiempo real del widget de chat (ver comentario en `ChatCotizacion.tsx` sobre por
 * qué no se escucha Realtime directo sobre `cotizacion_mensajes`).
 */
export async function notificarMensajeCotizacion(
  supabase:        SupabaseClient,
  solicitudId:     string,
  remitenteEsAdmin: boolean,
  mensajePreview:  string,
): Promise<void> {
  const sol = await fetchSolicitudNotif(supabase, solicitudId)
  if (!sol?.usuarios) return

  const cliente  = sol.usuarios
  const preview  = mensajePreview.length > 140 ? `${mensajePreview.slice(0, 140)}…` : mensajePreview

  if (remitenteEsAdmin) {
    if (cliente.email) {
      await enviarEmail({
        to:      cliente.email,
        subject: `Nuevo mensaje sobre tu cotización ${etiqueta(sol)}`,
        html: `
          <p>Hola ${cliente.nombre_completo},</p>
          <p>Te escribieron sobre tu solicitud <strong>${etiqueta(sol)}</strong>:</p>
          <p style="color:#555;">"${preview}"</p>
          <p>Respondé desde tu panel para seguir la conversación.</p>
        `,
      })
    }
    await crearNotificacion(
      supabase, cliente.id,
      `Nuevo mensaje sobre tu cotización ${etiqueta(sol)}`,
      preview,
      sol.id,
    )
  } else {
    await enviarEmail({
      to:      ADMIN_EMAIL,
      subject: `Nuevo mensaje de cotización — ${etiqueta(sol)}`,
      html: `
        <p><strong>${cliente.nombre_completo}</strong> escribió sobre su solicitud de cotización
        <strong>${etiqueta(sol)}</strong>:</p>
        <p style="color:#555;">"${preview}"</p>
      `,
    })
    await crearNotificacionesAdmin(
      supabase,
      `Nuevo mensaje de cotización — ${etiqueta(sol)}`,
      `${cliente.nombre_completo}: "${preview}"`,
      sol.id,
    )
  }
}

/** Se llama cuando el admin envía el precio de una cotización (Fase 7b) — avisa al cliente. */
export async function notificarCotizacionEnviada(
  supabase:    SupabaseClient,
  solicitudId: string,
  total:       number,
): Promise<void> {
  const sol = await fetchSolicitudNotif(supabase, solicitudId)
  if (!sol?.usuarios) return

  const cliente = sol.usuarios
  const monto   = `$${total.toLocaleString('es-AR')}`

  if (cliente.email) {
    await enviarEmail({
      to:      cliente.email,
      subject: `Te enviamos una cotización — ${etiqueta(sol)}`,
      html: `
        <p>Hola ${cliente.nombre_completo},</p>
        <p>Ya tenemos un precio para tu solicitud <strong>${etiqueta(sol)}</strong>:
        <strong>${monto}</strong>.</p>
        <p>Entrá a tu panel para aceptarla o rechazarla.</p>
      `,
    })
  }
  await crearNotificacion(
    supabase, cliente.id,
    `Te enviamos una cotización — ${etiqueta(sol)}`,
    `Precio propuesto: ${monto}. Entrá a tu panel para responder.`,
    sol.id,
  )
}

/**
 * Se llama cuando el cliente acepta o rechaza la cotización que le envió el admin (Fase 7b) —
 * aparte de `notificarCambioEstado` (que hace la transición de estado real y su propio aviso
 * genérico), porque ese genérico no cubre el caso "rechazada → cancelada" para el admin, y el
 * caso "aceptada → pendiente" solo le llega como el mensaje genérico de "volvió a pendiente", sin
 * decir explícitamente que fue por una cotización aceptada. Esta función avisa ambas puntas de
 * forma explícita: al admin (que fue el cliente quien decidió) y al propio cliente (confirmación
 * de su propia acción — el genérico de `notificarCambioEstado` solo dice "cambió de estado a
 * Pendiente/Cancelada", sin contexto de que fue por responder una cotización).
 */
export async function notificarCotizacionRespuesta(
  supabase:    SupabaseClient,
  solicitudId: string,
  aceptada:    boolean,
): Promise<void> {
  const sol = await fetchSolicitudNotif(supabase, solicitudId)
  if (!sol) return

  const tituloAdmin = aceptada
    ? `El cliente aceptó la cotización — ${etiqueta(sol)}`
    : `El cliente rechazó la cotización — ${etiqueta(sol)}`
  const mensajeAdmin = aceptada
    ? 'Ya podés asignarle un técnico como a cualquier otra solicitud.'
    : 'La solicitud quedó cancelada.'

  await enviarEmail({
    to:      ADMIN_EMAIL,
    subject: tituloAdmin,
    html:    `<p>${mensajeAdmin}</p>`,
  })
  await crearNotificacionesAdmin(supabase, tituloAdmin, mensajeAdmin, sol.id)

  if (sol.usuarios) {
    const cliente = sol.usuarios
    const tituloCliente = aceptada
      ? `Aceptaste la cotización — ${etiqueta(sol)}`
      : `Rechazaste la cotización — ${etiqueta(sol)}`
    const mensajeCliente = aceptada
      ? 'Tu solicitud ya está pendiente de que te asignemos un técnico.'
      : 'Tu solicitud quedó cancelada.'

    if (cliente.email) {
      await enviarEmail({
        to:      cliente.email,
        subject: tituloCliente,
        html: `
          <p>Hola ${cliente.nombre_completo},</p>
          <p>${mensajeCliente}</p>
        `,
      })
    }
    await crearNotificacion(supabase, cliente.id, tituloCliente, mensajeCliente, sol.id)
  }
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
    subject: `Conformidad recibida: ${etiqueta(sol)}`,
    html: `
      <p>El cliente <strong>${cliente?.nombre_completo ?? '—'}</strong> dio conformidad sobre la
      solicitud <strong>${etiqueta(sol)}</strong>.</p>
      <p>Monto a registrar: <strong>${monto}</strong>.</p>
    `,
  })
  await crearNotificacionesAdmin(
    supabase,
    `Conformidad recibida: ${etiqueta(sol)}`,
    `Monto: ${monto}.`,
    sol.id,
  )

  if (tecnico && tecnicoId) {
    if (tecnico.email) {
      await enviarEmail({
        to:      tecnico.email,
        subject: `Conformidad recibida: ${etiqueta(sol)}`,
        html: `
          <p>Hola ${tecnico.nombre_completo},</p>
          <p>El cliente dio conformidad sobre <strong>${etiqueta(sol)}</strong>. El pago se va a reflejar
          próximamente en la cuenta que declaraste.</p>
        `,
      })
    }
    await crearNotificacion(
      supabase, tecnicoId,
      `Conformidad recibida: ${etiqueta(sol)}`,
      'El pago se va a reflejar próximamente en tu cuenta.',
      sol.id,
    )
  }
}

/**
 * Se llama cuando `pagos.estado` pasa a 'pagado' (Mercado Pago, Fase 1) — nunca antes de
 * reconsultar el pago real contra la API de MP (ver `actualizarPagoDesdeMP` en mercadopago.ts).
 * Genera el recibo en PDF, lo sube a Storage, y avisa a cliente, técnico y admin.
 */
export async function notificarPagoConfirmado(
  supabase:    SupabaseClient,
  solicitudId: string,
  paymentId:   string,
): Promise<void> {
  const { data: sol } = await supabase
    .from('solicitudes')
    .select(`
      id, numero, titulo, precio_base, gastos_extra, total_estimado,
      usuarios!cliente_id ( id, nombre_completo, email ),
      tecnicos ( usuario_id, usuarios ( nombre_completo, email ) ),
      categorias ( nombre )
    `)
    .eq('id', solicitudId)
    .single()
  if (!sol) return

  const cliente   = sol.usuarios as unknown as { id: string; nombre_completo: string; email: string | null } | null
  const tecnicoRel = sol.tecnicos as unknown as { usuario_id: string; usuarios: { nombre_completo: string; email: string | null } | null } | null
  const tecnico    = tecnicoRel?.usuarios ?? null
  const tecnicoId  = tecnicoRel?.usuario_id ?? null
  const categoria  = (sol.categorias as unknown as { nombre: string } | null)?.nombre ?? null
  const total      = sol.total_estimado ?? 0
  const montoTxt   = `$${total.toLocaleString('es-AR')}`

  // El recibo es "mejor esfuerzo": si falla la generación o la subida, el pago igual queda
  // acreditado y se avisa igual — el cliente puede pedirlo por otro medio si hace falta.
  let reciboUrl: string | null = null
  try {
    const pdf = await generarReciboPDF({
      solicitudId,
      numero:        sol.numero,
      titulo:        sol.titulo,
      categoria,
      clienteNombre: cliente?.nombre_completo ?? '—',
      tecnicoNombre: tecnico?.nombre_completo ?? null,
      precioBase:    sol.precio_base,
      gastosExtra:   sol.gastos_extra,
      total,
      paymentId,
      fechaPago:     new Date(),
    })
    const path = `${solicitudId}/recibo-${paymentId}.pdf`
    const { error: upErr } = await supabase.storage.from('recibos').upload(path, pdf, {
      contentType: 'application/pdf',
      upsert:      true,
    })
    if (upErr) {
      console.error('[notificarPagoConfirmado] error subiendo recibo:', upErr.message)
    } else {
      await supabase.from('pagos').update({ recibo_path: path }).eq('solicitud_id', solicitudId)
      const { data: signed } = await supabase.storage.from('recibos')
        .createSignedUrl(path, 60 * 60 * 24 * 7) // 7 días — se puede volver a generar desde el panel cuando venza
      reciboUrl = signed?.signedUrl ?? null
    }
  } catch (err) {
    console.error('[notificarPagoConfirmado] error generando recibo:', err)
  }

  if (cliente) {
    if (cliente.email) {
      await enviarEmail({
        to:      cliente.email,
        subject: `Pago acreditado — ${etiqueta(sol)}`,
        html: `
          <p>Hola ${cliente.nombre_completo},</p>
          <p>Confirmamos que tu pago de <strong>${montoTxt}</strong> por <strong>${etiqueta(sol)}</strong>
          fue acreditado. ¡Gracias por confiar en Taita!</p>
          ${reciboUrl ? `<p><a href="${reciboUrl}">Descargar recibo (PDF)</a></p>` : ''}
        `,
      })
    }
    await crearNotificacion(
      supabase, cliente.id,
      `Pago acreditado — ${etiqueta(sol)}`,
      `Se acreditó tu pago de ${montoTxt}.`,
      solicitudId,
    )
  }

  if (tecnico && tecnicoId) {
    if (tecnico.email) {
      await enviarEmail({
        to:      tecnico.email,
        subject: `Pago del cliente acreditado — ${etiqueta(sol)}`,
        html: `
          <p>Hola ${tecnico.nombre_completo},</p>
          <p>El cliente pagó <strong>${montoTxt}</strong> por <strong>${etiqueta(sol)}</strong>. Tu parte se
          va a acreditar según lo acordado.</p>
        `,
      })
    }
    await crearNotificacion(
      supabase, tecnicoId,
      `Pago del cliente acreditado — ${etiqueta(sol)}`,
      `El cliente pagó ${montoTxt}.`,
      solicitudId,
    )
  }

  await enviarEmail({
    to:      ADMIN_EMAIL,
    subject: `Pago acreditado — ${etiqueta(sol)}`,
    html: `
      <p>Se acreditó el pago de <strong>${montoTxt}</strong> para <strong>${etiqueta(sol)}</strong>
      (cliente: ${cliente?.nombre_completo ?? '—'}).</p>
    `,
  })
  await crearNotificacionesAdmin(
    supabase,
    `Pago acreditado — ${etiqueta(sol)}`,
    `Monto: ${montoTxt}.`,
    solicitudId,
  )
}

/**
 * Se llama cuando Mercado Pago informa un pago rechazado. Solo el cliente recibe mail (es quien
 * puede reintentar) — técnico y admin se enteran solo por la campanita in-app, sin llenarles la
 * bandeja de algo que no pueden accionar.
 */
export async function notificarPagoRechazado(supabase: SupabaseClient, solicitudId: string): Promise<void> {
  const { data: sol } = await supabase
    .from('solicitudes')
    .select(`
      id, numero, titulo,
      usuarios!cliente_id ( id, nombre_completo, email ),
      tecnicos ( usuario_id )
    `)
    .eq('id', solicitudId)
    .single()
  if (!sol) return

  const cliente   = sol.usuarios as unknown as { id: string; nombre_completo: string; email: string | null } | null
  const tecnicoId = (sol.tecnicos as unknown as { usuario_id: string } | null)?.usuario_id ?? null

  if (cliente) {
    if (cliente.email) {
      await enviarEmail({
        to:      cliente.email,
        subject: `No pudimos procesar tu pago — ${etiqueta(sol)}`,
        html: `
          <p>Hola ${cliente.nombre_completo},</p>
          <p>El pago de <strong>${etiqueta(sol)}</strong> no pudo procesarse. Podés reintentarlo desde el
          detalle de la solicitud en tu panel.</p>
        `,
      })
    }
    await crearNotificacion(
      supabase, cliente.id,
      `No pudimos procesar tu pago — ${etiqueta(sol)}`,
      'Podés reintentarlo desde el detalle de la solicitud.',
      solicitudId,
    )
  }

  if (tecnicoId) {
    await crearNotificacion(
      supabase, tecnicoId,
      `Pago rechazado — ${etiqueta(sol)}`,
      'El intento de pago del cliente no pudo procesarse.',
      solicitudId,
    )
  }

  await crearNotificacionesAdmin(
    supabase,
    `Pago rechazado — ${etiqueta(sol)}`,
    'El intento de pago del cliente no pudo procesarse.',
    solicitudId,
  )
}

/**
 * Se llama cuando Mercado Pago informa que un pago ya acreditado fue reembolsado. Llega siempre
 * después de 'pagado' — nunca es el primer estado de un pago.
 */
export async function notificarPagoReembolsado(supabase: SupabaseClient, solicitudId: string): Promise<void> {
  const { data: sol } = await supabase
    .from('solicitudes')
    .select(`
      id, numero, titulo, total_estimado,
      usuarios!cliente_id ( id, nombre_completo, email ),
      tecnicos ( usuario_id )
    `)
    .eq('id', solicitudId)
    .single()
  if (!sol) return

  const cliente   = sol.usuarios as unknown as { id: string; nombre_completo: string; email: string | null } | null
  const tecnicoId = (sol.tecnicos as unknown as { usuario_id: string } | null)?.usuario_id ?? null
  const montoTxt  = sol.total_estimado != null ? `$${sol.total_estimado.toLocaleString('es-AR')}` : 'el monto'

  if (cliente) {
    if (cliente.email) {
      await enviarEmail({
        to:      cliente.email,
        subject: `Pago reembolsado — ${etiqueta(sol)}`,
        html: `
          <p>Hola ${cliente.nombre_completo},</p>
          <p>Te reembolsamos ${montoTxt} correspondiente a <strong>${etiqueta(sol)}</strong>.</p>
        `,
      })
    }
    await crearNotificacion(
      supabase, cliente.id,
      `Pago reembolsado — ${etiqueta(sol)}`,
      `Se te reembolsó ${montoTxt}.`,
      solicitudId,
    )
  }

  if (tecnicoId) {
    await crearNotificacion(
      supabase, tecnicoId,
      `Pago reembolsado — ${etiqueta(sol)}`,
      'El pago del cliente fue reembolsado.',
      solicitudId,
    )
  }

  // El reembolso siempre implica una decisión/acción manual (plata que sale) — el admin lo tiene
  // que saber por mail sí o sí, no solo por la campanita.
  await enviarEmail({
    to:      ADMIN_EMAIL,
    subject: `Pago reembolsado — ${etiqueta(sol)}`,
    html: `<p>Se reembolsó ${montoTxt} de la solicitud <strong>${etiqueta(sol)}</strong>.</p>`,
  })
  await crearNotificacionesAdmin(
    supabase,
    `Pago reembolsado — ${etiqueta(sol)}`,
    `Monto: ${montoTxt}.`,
    solicitudId,
  )
}

/**
 * Se llama cuando Mercado Pago informa un contracargo (disputa con el banco del cliente) — el
 * caso más grave, requiere atención del admin cuanto antes.
 */
export async function notificarPagoContracargo(supabase: SupabaseClient, solicitudId: string): Promise<void> {
  const { data: sol } = await supabase
    .from('solicitudes')
    .select(`
      id, numero, titulo, total_estimado,
      usuarios!cliente_id ( id, nombre_completo ),
      tecnicos ( usuario_id )
    `)
    .eq('id', solicitudId)
    .single()
  if (!sol) return

  const tecnicoId = (sol.tecnicos as unknown as { usuario_id: string } | null)?.usuario_id ?? null
  const montoTxt  = sol.total_estimado != null ? `$${sol.total_estimado.toLocaleString('es-AR')}` : 'el monto'

  if (tecnicoId) {
    await crearNotificacion(
      supabase, tecnicoId,
      `Contracargo — ${etiqueta(sol)}`,
      'El cliente inició una disputa bancaria sobre este pago.',
      solicitudId,
    )
  }

  await enviarEmail({
    to:      ADMIN_EMAIL,
    subject: `⚠️ Contracargo — ${etiqueta(sol)}`,
    html: `
      <p>El cliente <strong>${(sol.usuarios as unknown as { nombre_completo: string } | null)?.nombre_completo ?? '—'}</strong>
      inició una disputa bancaria (contracargo) por ${montoTxt} sobre <strong>${etiqueta(sol)}</strong>.
      Requiere atención cuanto antes.</p>
    `,
  })
  await crearNotificacionesAdmin(
    supabase,
    `⚠️ Contracargo — ${etiqueta(sol)}`,
    `Disputa bancaria por ${montoTxt} — requiere atención.`,
    solicitudId,
  )
}
