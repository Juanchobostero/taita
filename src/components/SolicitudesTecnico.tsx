import { useState, useEffect, useRef, useId } from 'react'
import { supabase } from '@/lib/supabase'
import CompletarTrabajo from '@/components/CompletarTrabajo'
import ResponderAsignacion from '@/components/ResponderAsignacion'
import CerrarServicio from '@/components/CerrarServicio'
import MercadoPagoBadge from '@/components/MercadoPagoBadge'
import FiltrosSolicitudes, { type EstadoFiltro, type CategoriaFiltroOpt } from '@/components/FiltrosSolicitudes'

interface SolicitudRow {
  id:                  string
  numero:              number
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
  categorias:  CategoriaFiltroOpt[]
}

// El técnico nunca ve `pendiente`/`en_cotizacion` (esta lista ya viene filtrada por su propio
// `tecnico_id`, que recién se asigna a partir de `asignada`) — no tiene sentido ofrecer esos
// chips acá, a diferencia del listado del cliente o la tabla del admin.
const ESTADOS_FILTRO: EstadoFiltro[] = [
  { key: 'asignada',   label: 'Esperando confirmación', estados: ['asignada'],   clase: 'bg-purple-100 text-purple-700' },
  { key: 'aceptada',   label: 'Aceptada',               estados: ['aceptada'],   clase: 'bg-blue-100 text-blue-800' },
  { key: 'en_curso',   label: 'En curso',               estados: ['en_curso'],  clase: 'bg-blue-100 text-blue-800' },
  { key: 'completada', label: 'Completada',             estados: ['completada'], clase: 'bg-primary-soft text-[#1B4D2E]' },
  { key: 'finalizada', label: 'Finalizada',             estados: ['finalizada'], clase: 'bg-[#1B4D2E] text-white' },
  { key: 'cancelada',  label: 'Cancelada',              estados: ['cancelada'], clase: 'bg-gray-100 text-gray-500' },
]

const estadoLabel: Record<string, string> = {
  pendiente:  'Pendiente',
  asignada:   'Esperando tu confirmación',
  aceptada:   'Aceptada',
  en_curso:   'En curso',
  completada: 'Completada',
  finalizada: 'Finalizada',
  cancelada:  'Cancelada',
}
const estadoColor: Record<string, string> = {
  pendiente:  'bg-amber-100 text-amber-800',
  asignada:   'bg-purple-100 text-purple-700',
  aceptada:   'bg-blue-100 text-blue-800',
  en_curso:   'bg-blue-100 text-blue-800',
  completada: 'bg-primary-soft text-[#1B4D2E]',
  finalizada: 'bg-[#1B4D2E] text-white',
  cancelada:  'bg-gray-100 text-gray-500',
}
// Mismo criterio que en MisSolicitudes.tsx (cliente): borde izquierdo + tinte suave del color del
// estado, nunca un fondo sólido, para no perder legibilidad del contenido de la card.
const estadoAcento: Record<string, string> = {
  pendiente:  'border-l-amber-400 bg-amber-50/50',
  asignada:   'border-l-purple-400 bg-purple-50/50',
  aceptada:   'border-l-blue-400 bg-blue-50/40',
  en_curso:   'border-l-blue-400 bg-blue-50/40',
  completada: 'border-l-primary bg-primary-soft/40',
  finalizada: 'border-l-[#1B4D2E] bg-primary-soft/60',
  cancelada:  'border-l-gray-300 bg-gray-50/70',
}

export default function SolicitudesTecnico({ tecnicoId, usuarioId, initialData, categorias }: Props) {
  const [rows,   setRows]   = useState<SolicitudRow[]>(initialData)
  const [synced, setSynced] = useState(false)
  const [filtros, setFiltros] = useState<{ estados: string[]; categoriaId: string | null }>({ estados: [], categoriaId: null })
  const instanceId = useId()
  const fetching = useRef(false)
  const filtrosRef = useRef(filtros)
  filtrosRef.current = filtros
  const montadoRef = useRef(false)

  async function refetch() {
    if (fetching.current) return
    fetching.current = true
    try {
      const params = new URLSearchParams()
      if (filtrosRef.current.estados.length) params.set('estados', filtrosRef.current.estados.join(','))
      if (filtrosRef.current.categoriaId)     params.set('categoriaId', filtrosRef.current.categoriaId)
      const res  = await fetch(`/api/tecnico/solicitudes?${params}`)
      const json = await res.json()
      if (Array.isArray(json.data)) setRows(json.data)
    } finally {
      fetching.current = false
    }
  }

  // Los filtros disparan su propio refetch — se salta el primer render (los datos iniciales ya
  // vienen del server sin filtros).
  useEffect(() => {
    if (!montadoRef.current) { montadoRef.current = true; return }
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

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

      <div className="px-4 sm:px-6 pt-4">
        <FiltrosSolicitudes estadosDisponibles={ESTADOS_FILTRO} categorias={categorias} onChange={setFiltros} />
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
          <span className="text-3xl">📋</span>
          <p>{filtros.estados.length || filtros.categoriaId ? 'Ninguna solicitud coincide con estos filtros.' : 'Todavía no recibiste solicitudes.'}</p>
        </div>
      ) : (
        <div className="p-4 sm:p-6 flex flex-col gap-4">
          {rows.map(s => (
            <div key={s.id} className={`rounded-3xl border border-cream-dark border-l-8 shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6 flex flex-col gap-4 ${estadoAcento[s.estado] ?? 'border-l-gray-300 bg-white'}`}>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl sm:text-2xl shrink-0">
                    {s.categorias?.icono ?? '🛠️'}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white bg-gray-800/80 px-2 py-0.5 rounded-md tracking-wide">#{s.numero}</span>
                      <span className="font-serif font-bold text-gray-900 text-xl sm:text-2xl leading-tight">{s.titulo}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {s.categorias?.nombre}
                      {s.usuarios?.nombre_completo && ` · 👤 ${s.usuarios.nombre_completo}`}
                    </p>
                    {s.direccion && <p className="text-sm text-gray-600">📍 {s.direccion}</p>}
                    {(s.estado === 'completada' || s.estado === 'finalizada') && s.conformidad_cliente && (() => {
                      const estadoPago = ultimoPago(s.pagos)?.estado ?? ''
                      const info = pagoInfo[estadoPago]
                      if (!info) return null
                      return (
                        <p className={`text-sm font-semibold flex items-center gap-1.5 flex-wrap ${info.clase}`}>
                          {estadoPago === 'pagado' && <MercadoPagoBadge />}
                          <span>{info.texto}</span>
                        </p>
                      )
                    })()}
                    <p className="text-sm text-gray-600">
                      📅 {s.fecha_solicitada
                        ? new Date(s.fecha_solicitada).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
                        : new Date(s.creado_en).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })}
                      {s.hora_solicitada && ` ${s.hora_solicitada.slice(0, 5)} hs`}
                    </p>
                  </div>
                </div>
                <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                  <span className={`text-sm font-bold px-4 py-1.5 rounded-full w-fit ${estadoColor[s.estado]}`}>
                    {estadoLabel[s.estado] ?? s.estado}
                  </span>
                  {s.total_estimado != null && (
                    <span className="text-base font-bold text-gray-800">
                      ${Number(s.total_estimado).toLocaleString('es-AR')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-stretch sm:items-center gap-2 pt-3 border-t border-white">
                <a
                  href={`/dashboard/tecnico/solicitud/${s.id}`}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 text-sm font-semibold bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full transition-colors whitespace-nowrap"
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
                {s.estado === 'completada' && ultimoPago(s.pagos)?.estado === 'pagado' && (
                  <CerrarServicio solicitudId={s.id} titulo={s.titulo} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
