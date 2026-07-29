import { useState, useEffect, useRef, useId } from 'react'
import { supabase } from '@/lib/supabase'
import CompletarTrabajo from '@/components/CompletarTrabajo'
import ResponderAsignacion from '@/components/ResponderAsignacion'

interface SolicitudRow {
  id:                  string
  titulo:              string
  estado:              string
  total_estimado:      number | null
  precio_base:         number | null
  tasa_aplicada:       number | null
  gastos_extra:        number | null
  imagenes_trabajo:    string[] | null
  conformidad_cliente: boolean
  fecha_solicitada:    string | null
  hora_solicitada:     string | null
  creado_en:           string
  direccion:           string | null
  usuarios:            { nombre_completo: string; telefono: string | null } | null
  categorias:          { nombre: string; icono: string | null } | null
  pagos:               { estado: string; creado_en: string }[] | null
}

// Puede haber más de un intento de pago por solicitud (reintentos tras un rechazo) — se toma el
// más reciente por fecha, no el primero del array (el orden que devuelve Supabase no está garantizado).
function ultimoPago(pagos: SolicitudRow['pagos']): { estado: string } | null {
  if (!pagos?.length) return null
  return pagos.reduce((a, b) => (a.creado_en > b.creado_en ? a : b))
}

const pagoInfo: Record<string, { texto: string; clase: string }> = {
  pagado:          { texto: '✅ Pago acreditado',                          clase: 'text-primary' },
  pendiente_pago:  { texto: '🕓 El cliente todavía no completó el pago',    clase: 'text-amber-600' },
  rechazado:       { texto: '⚠️ El pago del cliente fue rechazado',        clase: 'text-red-600' },
  reembolsado:     { texto: '💸 El pago fue reembolsado',                  clase: 'text-red-600' },
  contracargo:     { texto: '⚠️ Hay una disputa bancaria sobre este pago', clase: 'text-red-600' },
  registrado:      { texto: '✅ El cliente dio conformidad — pago registrado', clase: 'text-primary' },
}

interface Props {
  tecnicoId:   string
  usuarioId:   string
  initialData: SolicitudRow[]
}

const estadoLabel: Record<string, string> = {
  pendiente:  'Pendiente',
  asignada:   'Esperando tu confirmación',
  aceptada:   'Aceptada',
  en_curso:   'En curso',
  completada: 'Completada',
  cancelada:  'Cancelada',
}
const estadoColor: Record<string, string> = {
  pendiente:  'bg-amber-100 text-amber-800',
  asignada:   'bg-purple-100 text-purple-700',
  aceptada:   'bg-blue-100 text-blue-800',
  en_curso:   'bg-blue-100 text-blue-800',
  completada: 'bg-primary-soft text-[#1B4D2E]',
  cancelada:  'bg-gray-100 text-gray-500',
}

export default function SolicitudesTecnico({ tecnicoId, usuarioId, initialData }: Props) {
  const [rows,   setRows]   = useState<SolicitudRow[]>(initialData)
  const [synced, setSynced] = useState(false)
  const instanceId = useId()
  const fetching = useRef(false)

  async function refetch() {
    if (fetching.current) return
    fetching.current = true
    try {
      const res  = await fetch('/api/tecnico/solicitudes')
      const json = await res.json()
      if (Array.isArray(json.data)) setRows(json.data)
    } finally {
      fetching.current = false
    }
  }

  // Tiempo real: escucha la tabla `notificaciones` (no `solicitudes` directo) como disparador de
  // refresco. La política RLS de "el técnico ve sus solicitudes" hace un JOIN contra `tecnicos`
  // para resolver el dueño, y ese tipo de política no le llega bien a Realtime — probado en la
  // práctica (la notificación sí llegaba, la lista no se actualizaba). `notificaciones` en cambio
  // tiene una política simple (`usuario_id = auth.uid()`) que sí funciona, y el técnico ya recibe
  // una notificación para cada evento relevante de sus solicitudes (asignación, cambios de
  // estado, cancelación — ver AVISAR_TECNICO en notificaciones.ts), así que sirve igual de bien
  // como señal de "algo cambió, refrescá".
  useEffect(() => {
    const channel = supabase
      .channel(`solicitudes-tecnico-${usuarioId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${usuarioId}` },
        () => { setSynced(true); refetch() },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId, instanceId])

  return (
    <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
      <div className="px-6 py-4 border-b border-cream flex items-center justify-between">
        <h2 className="font-serif font-bold text-[#1B4D2E] text-lg">Solicitudes recibidas</h2>
        {synced && (
          <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> En vivo
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
          <span className="text-3xl">📋</span>
          <p>Todavía no recibiste solicitudes.</p>
        </div>
      ) : (
        <div className="divide-y divide-cream">
          {rows.map(s => (
            <div key={s.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <a href={`/dashboard/tecnico/solicitud/${s.id}`} className="font-semibold text-gray-900 text-sm hover:text-primary transition-colors w-fit">{s.titulo}</a>
                <p className="text-xs text-gray-400">
                  {s.categorias?.icono} {s.categorias?.nombre}
                  {s.usuarios?.nombre_completo && ` · 👤 ${s.usuarios.nombre_completo}`}
                </p>
                {s.direccion && <p className="text-xs text-gray-400">📍 {s.direccion}</p>}
                {s.estado === 'completada' && s.conformidad_cliente && (() => {
                  const info = pagoInfo[ultimoPago(s.pagos)?.estado ?? '']
                  return info ? <p className={`text-xs font-medium ${info.clase}`}>{info.texto}</p> : null
                })()}
                <p className="text-xs text-gray-400">
                  📅 {s.fecha_solicitada
                    ? new Date(s.fecha_solicitada).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
                    : new Date(s.creado_en).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {s.hora_solicitada && ` ${s.hora_solicitada.slice(0, 5)} hs`}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap shrink-0">
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${estadoColor[s.estado]}`}>
                  {estadoLabel[s.estado] ?? s.estado}
                </span>
                {s.total_estimado != null && (
                  <span className="text-sm font-semibold text-gray-700">
                    ${Number(s.total_estimado).toLocaleString('es-AR')}
                  </span>
                )}
                <a
                  href={`/dashboard/tecnico/solicitud/${s.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-soft hover:bg-primary text-[#1B4D2E] hover:text-white px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                >
                  Ver detalle →
                </a>
                {s.estado === 'asignada' && (
                  <ResponderAsignacion solicitudId={s.id} titulo={s.titulo} />
                )}
                {(s.estado === 'aceptada' || s.estado === 'en_curso' ||
                  (s.estado === 'completada' && !(s.imagenes_trabajo?.length) && s.gastos_extra == null)) && (
                  <CompletarTrabajo
                    solicitudId={s.id}
                    tecnicoId={tecnicoId}
                    precioBase={s.precio_base ?? null}
                    tasa={s.tasa_aplicada ?? null}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
