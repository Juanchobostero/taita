import { useState, useEffect } from 'react'

export interface EstadoFiltro {
  /** Clave estable para el chip — no necesariamente igual al valor de `estado` en la base (ej.
   * "Pendiente" agrupa `pendiente`+`asignada` para el cliente, que ve ambos como lo mismo). */
  key:     string
  label:   string
  /** Uno o más valores reales de `solicitudes.estado` que representa este chip. */
  estados: string[]
  clase:   string
}

export interface CategoriaFiltroOpt {
  id:     string
  nombre: string
  icono:  string | null
}

interface Props {
  estadosDisponibles: EstadoFiltro[]
  categorias:         CategoriaFiltroOpt[]
  onChange:           (filtros: { estados: string[]; categoriaId: string | null }) => void
}

// Búsqueda por filtros seleccionables (no de texto) para los listados de solicitudes — mismo
// componente para cliente/técnico/admin, cada uno le pasa su propio set de chips de estado (ver
// comentario en EstadoFiltro sobre por qué no es un simple 1:1 con la columna `estado`).
export default function FiltrosSolicitudes({ estadosDisponibles, categorias, onChange }: Props) {
  const [estadosActivos, setEstadosActivos] = useState<Set<string>>(new Set())
  const [categoriaId,    setCategoriaId]    = useState<string | null>(null)

  useEffect(() => {
    const estados = estadosDisponibles
      .filter(e => estadosActivos.has(e.key))
      .flatMap(e => e.estados)
    onChange({ estados, categoriaId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadosActivos, categoriaId])

  const toggleEstado = (key: string) => {
    setEstadosActivos(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const limpiar = () => { setEstadosActivos(new Set()); setCategoriaId(null) }
  const hayFiltrosActivos = estadosActivos.size > 0 || categoriaId != null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">Estado</span>
        {estadosDisponibles.map(e => {
          const activo = estadosActivos.has(e.key)
          return (
            <button
              key={e.key}
              type="button"
              onClick={() => toggleEstado(e.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                activo ? `${e.clase} border-transparent` : 'bg-white border-cream-dark text-gray-500 hover:border-primary-pale'
              }`}
            >
              {e.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">Categoría</span>
        <select
          value={categoriaId ?? ''}
          onChange={e => setCategoriaId(e.target.value || null)}
          className="text-sm border border-cream-dark rounded-full px-3 py-1.5 focus:outline-none focus:border-primary bg-white text-gray-700"
        >
          <option value="">Todas</option>
          {categorias.map(c => (
            <option key={c.id} value={c.id}>{c.icono ?? ''} {c.nombre}</option>
          ))}
        </select>

        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={limpiar}
            className="text-xs text-gray-400 hover:text-red-500 font-medium underline underline-offset-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  )
}
