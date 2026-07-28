import { useState, useEffect, useId } from 'react'
import { supabase } from '@/lib/supabase'

interface Suscripcion {
  tabla:  string
  filtro: string  // sintaxis de filtro de Supabase Realtime, ej. `id=eq.${id}` o `tecnico_id=eq.${id}`
}

interface Props {
  suscripciones: Suscripcion[]
  /** Si es true, recarga sola después de `delayMs` en vez de esperar un click. Default false. */
  autoReload?: boolean
  /** Espera antes de auto-recargar, en ms. Default 2500. Sin efecto si autoReload es false. */
  delayMs?: number
}

/**
 * Banner chico y no invasivo: avisa "hay cambios nuevos" cuando algo relevante se actualiza en
 * tiempo real. Por default deja que el usuario decida cuándo refrescar (no recarga sola, para no
 * interrumpir a alguien completando un formulario en esa misma pantalla) — pero con
 * `autoReload` recarga sola después de un delay corto, para pantallas de solo lectura donde no
 * hay riesgo de perder algo a medio completar.
 *
 * Reusable en cualquier página — se le pasan una o más tablas/filtros a escuchar. Ver
 * docs/guia-notificaciones-realtime-supabase.md para el patrón completo.
 */
export default function CambiosEnVivo({ suscripciones, autoReload = false, delayMs = 2500 }: Props) {
  const [hayCambios, setHayCambios] = useState(false)
  const instanceId = useId()

  useEffect(() => {
    const channels = suscripciones.map((s, i) =>
      supabase
        .channel(`cambios-${instanceId}-${i}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: s.tabla, filter: s.filtro },
          () => setHayCambios(true),
        )
        .subscribe()
    )
    return () => { channels.forEach(c => supabase.removeChannel(c)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, JSON.stringify(suscripciones)])

  useEffect(() => {
    if (!hayCambios || !autoReload) return
    const t = setTimeout(() => window.location.reload(), delayMs)
    return () => clearTimeout(t)
  }, [hayCambios, autoReload, delayMs])

  if (!hayCambios) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 bg-[#1B4D2E] text-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 text-sm">
      {autoReload ? (
        <span>🔄 Esta página se actualizó, refrescando…</span>
      ) : (
        <>
          <span>🔄 Hay cambios nuevos en esta página</span>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-[#1B4D2E] font-semibold px-3 py-1.5 rounded-full text-xs hover:bg-primary-soft transition-colors shrink-0"
          >
            Actualizar
          </button>
        </>
      )}
    </div>
  )
}
