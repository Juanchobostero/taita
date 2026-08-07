import { useState, useEffect, useRef, useId } from 'react'
import { supabase } from '@/lib/supabase'
import CancelarSolicitud from '@/components/CancelarSolicitud'
import ResenaForm from '@/components/ResenaForm'
import FiltrosSolicitudes, { type EstadoFiltro, type CategoriaFiltroOpt } from '@/components/FiltrosSolicitudes'

interface SolicitudRow {
  id:               string
  numero:           number
  titulo:           string
  descripcion:      string | null
  estado:           string
  direccion:        string | null
  tecnico_id:       string | null
  precio_base:      number | null
  tasa_aplicada:    number | null
  total_estimado:   number | null
  fecha_solicitada: string | null
  hora_solicitada:  string | null
  creado_en:        string
  tecnicos:         { usuarios: { nombre_completo: string; foto_url?: string | null } | null } | null
  categorias:       { nombre: string; icono: string | null } | null
  resenas:          { id: string }[] | null
}

interface Props {
  userId:       string
  initialData:  SolicitudRow[]
  initialTotal: number
  categorias:   CategoriaFiltroOpt[]
}

const PAGE_SIZE = 5

// Agrupado igual que `estadoLabel` más abajo: el cliente ve "Pendiente" tanto para `pendiente`
// como para `asignada` (técnico todavía sin confirmar), y "Completada" tanto para `completada`
// como para `finalizada` — el filtro respeta esa misma agrupación en vez de exponer los 8 valores
// crudos de la base, que para el cliente no significan nada distinto.
const ESTADOS_FILTRO: EstadoFiltro[] = [
  { key: 'pendiente',     label: 'Pendiente',     estados: ['pendiente', 'asignada'],   clase: 'bg-amber-100 text-amber-800' },
  { key: 'en_cotizacion', label: 'En cotización',  estados: ['en_cotizacion'],           clase: 'bg-amber-100 text-amber-800' },
  { key: 'aceptada',      label: 'Aceptada',       estados: ['aceptada'],                clase: 'bg-blue-100 text-blue-800' },
  { key: 'en_curso',      label: 'En curso',       estados: ['en_curso'],                clase: 'bg-blue-100 text-blue-800' },
  { key: 'completada',    label: 'Completada',     estados: ['completada', 'finalizada'], clase: 'bg-[#E8F5E9] text-[#1B4D2E]' },
  { key: 'cancelada',     label: 'Cancelada',      estados: ['cancelada'],               clase: 'bg-red-100 text-red-700' },
]

// "asignada" (técnico asignado pero todavía sin confirmar) se muestra igual que "pendiente" acá
// — el cliente no ve nada distinto hasta que el técnico confirma de verdad, para no mostrar un
// estado intermedio que no puede accionar. Mismo criterio para "finalizada" (cierre administrativo
// del técnico tras cobrar): para el cliente es exactamente "Completada", no hay nada nuevo que ver.
const estadoLabel: Record<string, string> = {
  pendiente:     'Pendiente',
  asignada:      'Pendiente',
  aceptada:      'Aceptada',
  en_curso:      'En curso',
  completada:    'Completada',
  finalizada:    'Completada',
  cancelada:     'Cancelada',
  en_cotizacion: 'En cotización',
}
const estadoColor: Record<string, string> = {
  pendiente:     'bg-amber-100 text-amber-800',
  asignada:      'bg-amber-100 text-amber-800',
  aceptada:      'bg-blue-100 text-blue-800',
  en_curso:      'bg-blue-100 text-blue-800',
  completada:    'bg-[#E8F5E9] text-[#1B4D2E]',
  finalizada:    'bg-[#E8F5E9] text-[#1B4D2E]',
  cancelada:     'bg-red-100 text-red-700',
  en_cotizacion: 'bg-amber-100 text-amber-800',
}
// Acento visual de cada card: borde izquierdo + fondo con tinte muy suave del color del estado —
// se usa el color fuerte solo en el borde/badge, nunca como fondo sólido, para no perder contraste
// de lectura en el resto del contenido de la card (pedido de Jota: "cambiar el background por el
// color de estado", resuelto como tinte + acento en vez de color plano).
const estadoAcento: Record<string, string> = {
  pendiente:     'border-l-amber-400 bg-amber-50/50',
  asignada:      'border-l-amber-400 bg-amber-50/50',
  aceptada:      'border-l-blue-400 bg-blue-50/40',
  en_curso:      'border-l-blue-400 bg-blue-50/40',
  completada:    'border-l-primary bg-primary-soft/40',
  finalizada:    'border-l-primary bg-primary-soft/40',
  cancelada:     'border-l-red-300 bg-red-50/60',
  en_cotizacion: 'border-l-amber-400 bg-amber-50/50',
}

function pageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`

export default function MisSolicitudes({ userId, initialData, initialTotal, categorias }: Props) {
  const [rows,    setRows]    = useState<SolicitudRow[]>(initialData)
  const [total,   setTotal]   = useState(initialTotal)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [synced,  setSynced]  = useState(false)
  const [filtros, setFiltros] = useState<{ estados: string[]; categoriaId: string | null }>({ estados: [], categoriaId: null })

  const pageRef = useRef(page)
  pageRef.current = page
  const filtrosRef = useRef(filtros)
  filtrosRef.current = filtros
  const instanceId = useId()

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const rangeFrom   = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeTo     = Math.min(page * PAGE_SIZE, total)

  async function fetchPage(next: number, opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(next) })
      if (filtrosRef.current.estados.length) params.set('estados', filtrosRef.current.estados.join(','))
      if (filtrosRef.current.categoriaId)     params.set('categoriaId', filtrosRef.current.categoriaId)
      const res  = await fetch(`/api/cliente/solicitudes?${params}`)
      const json = await res.json()
      setRows(json.data)
      setTotal(json.total)
      setPage(next)
    } finally {
      if (!opts.silent) setLoading(false)
    }
  }

  async function goTo(next: number) {
    if (next === page || next < 1 || next > totalPages) return
    await fetchPage(next)
  }

  // Los filtros disparan su propio refetch (desde la página 1) — separado del efecto de Realtime
  // de abajo para no reabrir el canal cada vez que se toca un filtro. Se salta el primer render
  // (los datos iniciales ya vienen del server con "sin filtros", no hace falta repetir el pedido).
  const montadoRef = useRef(false)
  useEffect(() => {
    if (!montadoRef.current) { montadoRef.current = true; return }
    fetchPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

  // Tiempo real: escucha la tabla `notificaciones` (no `solicitudes` directo) como disparador de
  // refresco. La tabla `solicitudes` tiene, además de la política del cliente, políticas de
  // técnico y admin que hacen JOIN contra otras tablas — y ese tipo de política rompe Realtime
  // para TODA la tabla, no solo para el rol afectado (probado en la práctica: ni siquiera la
  // política simple del cliente recibía eventos). `notificaciones` en cambio tiene una política
  // simple (`usuario_id = auth.uid()`) que sí funciona, y el cliente ya recibe una notificación
  // para cada evento relevante de sus solicitudes (nueva, pendiente, aceptada, en_curso,
  // completada, cancelada — ver AVISAR_CLIENTE en notificaciones.ts), así que sirve igual de bien
  // como señal de "algo cambió, refrescá". Se hace un refetch de la página completa (5 filas) en
  // vez de un merge campo a campo porque no tenemos los joins (técnico, categoría) resueltos acá.
  useEffect(() => {
    const channel = supabase
      .channel(`mis-solicitudes-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${userId}` },
        () => {
          setSynced(true)
          fetchPage(pageRef.current, { silent: true })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, instanceId])

  const hayFiltrosActivos = filtros.estados.length > 0 || filtros.categoriaId != null

  // El estado "sin ninguna solicitud" solo aplica cuando no hay filtros tocados — si hay filtros
  // activos y no matchean nada, es un resultado de búsqueda vacío, no que el cliente nunca pidió
  // nada (mensajes y CTA distintos, y hay que dejar la barra de filtros para que pueda limpiarlos).
  if (rows.length === 0 && total === 0 && !hayFiltrosActivos) {
    return (
      <div className="px-6 py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
        <span className="text-3xl">🔍</span>
        <p>Todavía no hiciste ninguna solicitud.</p>
        <a href="/solicitud" className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-soft hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-full transition-colors">
          Solicitá un servicio →
        </a>
      </div>
    )
  }

  return (
    <div className={`transition-opacity duration-150 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="px-4 sm:px-6 pt-4">
        <FiltrosSolicitudes estadosDisponibles={ESTADOS_FILTRO} categorias={categorias} onChange={setFiltros} />
      </div>

      {synced && (
        <p className="px-6 pt-3 text-[11px] text-gray-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Actualizado en tiempo real
        </p>
      )}

      {rows.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
          <span className="text-3xl">🔍</span>
          <p>Ninguna solicitud coincide con estos filtros.</p>
        </div>
      ) : (
      <div className="p-4 sm:p-6 flex flex-col gap-4">
        {rows.map(s => {
          const tec      = s.tecnicos
          const cat      = s.categorias
          const total_   = s.total_estimado
          const base     = s.precio_base
          const tasa     = s.tasa_aplicada
          const ganancia = (total_ != null && base != null) ? total_ - base : null
          // fecha_solicitada es una fecha "pura" guardada a medianoche UTC — se formatea en UTC
          // para no correrla un día por el huso horario local. creado_en sí es un instante real,
          // se muestra siempre en hora de Argentina (no la del servidor, que en producción corre
          // en otro huso).
          const fecha = s.fecha_solicitada
            ? new Date(s.fecha_solicitada).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
            : new Date(s.creado_en).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })
          const hora = s.hora_solicitada ? s.hora_solicitada.slice(0, 5) : null

          return (
            <div key={s.id} className={`rounded-3xl border border-cream-dark border-l-8 shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6 flex flex-col gap-4 ${estadoAcento[s.estado] ?? 'border-l-gray-300 bg-white'}`}>

              {/* Fila principal */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl sm:text-2xl shrink-0">
                    {cat?.icono ?? '🛠️'}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white bg-gray-800/80 px-2 py-0.5 rounded-md tracking-wide">#{s.numero}</span>
                      <span className="font-serif font-bold text-gray-900 text-xl sm:text-2xl leading-tight">{s.titulo}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {cat?.nombre} · 📅 {fecha}{hora && ` ${hora} hs`}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold px-4 py-1.5 rounded-full w-fit shrink-0 ${estadoColor[s.estado]}`}>
                  {estadoLabel[s.estado] ?? s.estado}
                </span>
              </div>

              {/* Grid de detalles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* Técnico — oculto mientras está en "asignada" (todavía sin confirmar) */}
                <div className="flex items-start gap-2.5">
                  {tec?.usuarios && s.estado !== 'asignada' ? (
                    <>
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-primary font-bold text-sm shrink-0 mt-0.5 overflow-hidden shadow-sm">
                        {tec.usuarios.foto_url
                          ? <img src={tec.usuarios.foto_url} className="w-full h-full object-cover" />
                          : tec.usuarios.nombre_completo?.split(' ').slice(0, 2).map(p => p[0]).join('')
                        }
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Técnico</span>
                        <span className="font-semibold text-gray-800 text-sm">{tec.usuarios.nombre_completo}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Técnico</span>
                      <span className="text-sm text-amber-600 font-semibold">Pendiente de asignación</span>
                    </div>
                  )}
                </div>

                {/* Dirección */}
                {s.direccion && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Dirección</span>
                    <span className="text-sm font-medium text-gray-800">📍 {s.direccion}</span>
                  </div>
                )}

                {/* Descripción */}
                {s.descripcion && (
                  <div className="flex flex-col gap-0.5 sm:col-span-2 lg:col-span-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Detalle</span>
                    <span className="text-sm text-gray-600 leading-relaxed">{s.descripcion}</span>
                  </div>
                )}
              </div>

              {/* Financiero (solo si hay tarifa) */}
              {total_ != null && (
                <div className="bg-white/70 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 border border-white">
                  {tasa != null && tasa > 0 && (
                    <span>Tasa plataforma {tasa}%{ganancia != null ? ` = ${fmt(ganancia)}` : ''}</span>
                  )}
                  <span className="font-bold text-gray-900 text-base ml-auto">Total: {fmt(total_)}</span>
                </div>
              )}

              {/* Acciones */}
              <div className="flex flex-wrap items-stretch sm:items-center gap-2 pt-3 border-t border-white">
                <a
                  href={`/dashboard/cliente/solicitud/${s.id}`}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 text-sm font-semibold bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full transition-colors"
                >
                  Ver detalle <span aria-hidden="true">→</span>
                </a>

                {/* Cancelar — solo en solicitudes que todavía no terminaron */}
                {['pendiente', 'en_cotizacion', 'asignada', 'aceptada', 'en_curso'].includes(s.estado) && (
                  <CancelarSolicitud solicitudId={s.id} titulo={s.titulo} />
                )}

                {/* Reseña — solo en solicitudes completadas sin reseña previa */}
                {(s.estado === 'completada' || s.estado === 'finalizada') && !s.resenas?.length && s.tecnico_id && tec?.usuarios && (
                  <ResenaForm
                    solicitudId={s.id}
                    tecnicoId={s.tecnico_id}
                    tecnicoNombre={tec.usuarios.nombre_completo}
                  />
                )}
              </div>

            </div>
          )
        })}
      </div>
      )}

      {/* Paginado */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-cream flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 order-2 sm:order-1">
            {rangeFrom}–{rangeTo} de {total}
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <button
              onClick={() => goTo(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors disabled:text-gray-300 disabled:border-cream disabled:cursor-not-allowed text-gray-600 border-cream-dark hover:border-primary hover:text-primary"
            >
              ← Anterior
            </button>

            {pageNumbers(page, totalPages).map((p, i) =>
              p === '...'
                ? <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-xs text-gray-400">…</span>
                : p === page
                  ? <span key={p} className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-lg">{p}</span>
                  : <button key={p} onClick={() => goTo(p as number)} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-cream-dark rounded-lg hover:border-primary hover:text-primary transition-colors">{p}</button>
            )}

            <button
              onClick={() => goTo(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors disabled:text-gray-300 disabled:border-cream disabled:cursor-not-allowed text-gray-600 border-cream-dark hover:border-primary hover:text-primary"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
