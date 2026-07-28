import { useState, useEffect, useRef, useId } from 'react'
import { supabase } from '@/lib/supabase'
import CancelarSolicitud from '@/components/CancelarSolicitud'
import ResenaForm from '@/components/ResenaForm'

interface SolicitudRow {
  id:               string
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
}

const PAGE_SIZE = 5

const estadoLabel: Record<string, string> = {
  pendiente:  'Pendiente',
  aceptada:   'Aceptada',
  en_curso:   'En curso',
  completada: 'Completada',
  cancelada:  'Cancelada',
}
const estadoColor: Record<string, string> = {
  pendiente:  'bg-amber-100 text-amber-800',
  aceptada:   'bg-blue-100 text-blue-800',
  en_curso:   'bg-blue-100 text-blue-800',
  completada: 'bg-[#E8F5E9] text-[#1B4D2E]',
  cancelada:  'bg-red-100 text-red-700',
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

export default function MisSolicitudes({ userId, initialData, initialTotal }: Props) {
  const [rows,    setRows]    = useState<SolicitudRow[]>(initialData)
  const [total,   setTotal]   = useState(initialTotal)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [synced,  setSynced]  = useState(false)

  const pageRef = useRef(page)
  pageRef.current = page
  const instanceId = useId()

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const rangeFrom   = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeTo     = Math.min(page * PAGE_SIZE, total)

  async function fetchPage(next: number, opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true)
    try {
      const res  = await fetch(`/api/cliente/solicitudes?page=${next}`)
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

  // Tiempo real: si algo cambia en una solicitud de este cliente (nueva, estado, técnico
  // asignado, etc.) en cualquier lado de la app, se re-trae la página actual sola, sin recargar.
  // Es un refetch de la página completa (5 filas) en vez de un merge campo a campo porque el
  // payload de Realtime trae solo columnas crudas de `solicitudes`, no los joins (técnico,
  // categoría) que ya vienen resueltos en esta lista — así evitamos mostrar datos a medio
  // actualizar mientras llega el resto.
  useEffect(() => {
    const channel = supabase
      .channel(`mis-solicitudes-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes', filter: `cliente_id=eq.${userId}` },
        (payload) => {
          console.log('[mis-solicitudes] evento realtime recibido:', payload)
          setSynced(true)
          fetchPage(pageRef.current, { silent: true })
        },
      )
      .subscribe((status, err) => {
        console.log('[mis-solicitudes] estado de suscripción:', status, err)
      })

    return () => { supabase.removeChannel(channel) }
  }, [userId, instanceId])

  if (rows.length === 0 && total === 0) {
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
      {synced && (
        <p className="px-6 pt-3 text-[11px] text-gray-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Actualizado en tiempo real
        </p>
      )}
      <div className="divide-y divide-cream">
        {rows.map(s => {
          const tec      = s.tecnicos
          const cat      = s.categorias
          const total_   = s.total_estimado
          const base     = s.precio_base
          const tasa     = s.tasa_aplicada
          const ganancia = (total_ != null && base != null) ? total_ - base : null
          // fecha_solicitada es una fecha "pura" guardada a medianoche UTC — se formatea en UTC
          // para no correrla un día por el huso horario local. creado_en sí es un instante real,
          // se muestra en hora local normalmente.
          const fecha = s.fecha_solicitada
            ? new Date(s.fecha_solicitada).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
            : new Date(s.creado_en).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
          const hora = s.hora_solicitada ? s.hora_solicitada.slice(0, 5) : null

          return (
            <div key={s.id} className={`px-6 py-5 flex flex-col gap-4 ${s.estado === 'cancelada' ? 'bg-red-50/70' : ''}`}>

              {/* Fila principal */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-gray-900">{s.titulo}</p>
                  <p className="text-xs text-gray-400">
                    {cat?.icono} {cat?.nombre} · 📅 {fecha}{hora && ` ${hora} hs`}
                  </p>
                </div>
                <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full w-fit ${estadoColor[s.estado]}`}>
                    {estadoLabel[s.estado] ?? s.estado}
                  </span>
                  <a
                    href={`/dashboard/cliente/solicitud/${s.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-soft hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-full transition-colors w-fit"
                  >
                    Ver detalle <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>

              {/* Grid de detalles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">

                {/* Técnico */}
                <div className="flex items-start gap-2.5">
                  {tec?.usuarios ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center text-primary font-bold text-xs shrink-0 mt-0.5 overflow-hidden">
                        {tec.usuarios.foto_url
                          ? <img src={tec.usuarios.foto_url} className="w-full h-full object-cover" />
                          : tec.usuarios.nombre_completo?.split(' ').slice(0, 2).map(p => p[0]).join('')
                        }
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-gray-400">Técnico</span>
                        <span className="font-medium text-gray-800 text-xs">{tec.usuarios.nombre_completo}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-gray-400">Técnico</span>
                      <span className="text-xs text-amber-600 font-medium">Pendiente de asignación</span>
                    </div>
                  )}
                </div>

                {/* Dirección */}
                {s.direccion && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-400">Dirección</span>
                    <span className="text-xs font-medium text-gray-800">📍 {s.direccion}</span>
                  </div>
                )}

                {/* Descripción */}
                {s.descripcion && (
                  <div className="flex flex-col gap-0.5 sm:col-span-2 lg:col-span-1">
                    <span className="text-xs text-gray-400">Detalle</span>
                    <span className="text-xs text-gray-600 leading-relaxed">{s.descripcion}</span>
                  </div>
                )}
              </div>

              {/* Financiero (solo si hay tarifa) */}
              {total_ != null && (
                <div className="bg-cream rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
                  {tasa != null && tasa > 0 && (
                    <span>Tasa plataforma {tasa}%{ganancia != null ? ` = ${fmt(ganancia)}` : ''}</span>
                  )}
                  <span className="font-bold text-gray-900 ml-auto">Total: {fmt(total_)}</span>
                </div>
              )}

              {/* Cancelar — solo en solicitudes que todavía no terminaron */}
              {['pendiente', 'aceptada', 'en_curso'].includes(s.estado) && (
                <CancelarSolicitud solicitudId={s.id} titulo={s.titulo} />
              )}

              {/* Reseña — solo en solicitudes completadas sin reseña previa */}
              {s.estado === 'completada' && !s.resenas?.length && s.tecnico_id && tec?.usuarios && (
                <ResenaForm
                  solicitudId={s.id}
                  tecnicoId={s.tecnico_id}
                  tecnicoNombre={tec.usuarios.nombre_completo}
                />
              )}

            </div>
          )
        })}
      </div>

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
