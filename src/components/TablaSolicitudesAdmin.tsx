import { useState, useEffect, useRef, useId } from 'react'
import { supabase } from '@/lib/supabase'

interface SolicitudRow {
  id: string
  titulo: string
  estado: string
  creado_en: string
  tecnico_id: string | null
  usuarios: { nombre_completo: string } | null
  tecnicos: { id: string; usuarios: { nombre_completo: string } } | null
  categorias: { nombre: string } | null
}

interface Props {
  initialData:  SolicitudRow[]
  initialTotal: number
  usuarioId:    string
}

const PAGE_SIZE = 10

const estadoColor: Record<string, string> = {
  pendiente:  'bg-amber-100 text-amber-800',
  asignada:   'bg-purple-100 text-purple-700',
  aceptada:   'bg-blue-100 text-blue-800',
  en_curso:   'bg-blue-100 text-blue-800',
  completada: 'bg-[#E8F5E9] text-[#1B4D2E]',
  cancelada:  'bg-gray-100 text-gray-500',
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

export default function TablaSolicitudesAdmin({ initialData, initialTotal, usuarioId }: Props) {
  const [rows,    setRows]    = useState<SolicitudRow[]>(initialData)
  const [total,   setTotal]   = useState(initialTotal)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [synced,  setSynced]  = useState(false)

  const pageRef = useRef(page)
  pageRef.current = page
  const instanceId = useId()

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const rangeFrom  = (page - 1) * PAGE_SIZE + 1
  const rangeTo    = Math.min(page * PAGE_SIZE, total)

  async function fetchPage(next: number, opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true)
    try {
      const res  = await fetch(`/api/admin/solicitudes?page=${next}`)
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

  // Tiempo real: el admin ve todas las solicitudes, así que no hace falta filtro por `solicitudes`
  // — pero esa policy resuelve "es admin" con un JOIN/EXISTS contra `usuarios`, y ese tipo de
  // policy no le llega bien a Supabase Realtime (mismo hallazgo que con técnico/cliente, ver
  // notificaciones.ts). Además, un pago confirmado por Mercado Pago solo toca la tabla `pagos`,
  // nunca `solicitudes` — así que escuchar solo esa tabla no alcanzaría igual. Se agrega
  // `notificaciones` (política simple, sin JOIN) como disparador adicional: el admin recibe una
  // notificación para todo evento relevante (nueva solicitud, conformidad, pago, vuelta a
  // pendiente), así que sirve como señal confiable de "algo cambió, refrescá".
  useEffect(() => {
    const channel = supabase
      .channel(`tabla-solicitudes-admin-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes' },
        () => {
          setSynced(true)
          fetchPage(pageRef.current, { silent: true })
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${usuarioId}` },
        () => {
          setSynced(true)
          fetchPage(pageRef.current, { silent: true })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, usuarioId])

  return (
    <div className={`transition-opacity duration-150 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>

      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E8E0D5] flex items-center justify-between">
        <h2 className="font-serif font-bold text-[#1B4D2E] text-base">Solicitudes de servicio</h2>
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          {synced && <span className="w-1.5 h-1.5 rounded-full bg-[#1B4D2E]" />}
          {total === 0 ? '0' : `${rangeFrom}–${rangeTo}`} de {total}
        </span>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-400 text-sm">Sin solicitudes aún</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5EFE6] text-left">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500">Servicio</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500">Cliente</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500">Técnico</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500">Estado</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500">Fecha</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFE6]">
              {rows.map(s => (
                <tr key={s.id} className="hover:bg-[#F5EFE6] transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-800 max-w-[180px] truncate">{s.titulo}</td>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{s.usuarios?.nombre_completo ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                    {s.tecnico_id
                      ? (s.tecnicos as any)?.usuarios?.nombre_completo ?? '—'
                      : <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">Sin asignar</span>
                    }
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${estadoColor[s.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                      {s.estado.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(s.creado_en).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/dashboard/admin/solicitud/${s.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-soft hover:bg-primary text-[#1B4D2E] hover:text-white px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                    >
                      Ver detalle →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-[#E8E0D5] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 order-2 sm:order-1">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <button
              onClick={() => goTo(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors disabled:text-gray-300 disabled:border-[#F5EFE6] disabled:cursor-not-allowed text-gray-600 border-[#E8E0D5] hover:border-[#1B4D2E] hover:text-[#1B4D2E]"
            >
              ← Anterior
            </button>

            {pageNumbers(page, totalPages).map((p, i) =>
              p === '...'
                ? <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-xs text-gray-400">…</span>
                : p === page
                  ? <span key={p} className="px-3 py-1.5 text-xs font-bold bg-[#1B4D2E] text-white rounded-lg">{p}</span>
                  : <button key={p} onClick={() => goTo(p as number)} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-[#E8E0D5] rounded-lg hover:border-[#1B4D2E] hover:text-[#1B4D2E] transition-colors">{p}</button>
            )}

            <button
              onClick={() => goTo(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors disabled:text-gray-300 disabled:border-[#F5EFE6] disabled:cursor-not-allowed text-gray-600 border-[#E8E0D5] hover:border-[#1B4D2E] hover:text-[#1B4D2E]"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
