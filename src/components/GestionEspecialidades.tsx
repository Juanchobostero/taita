import { useState } from 'react'

interface Categoria {
  id:     string
  nombre: string
  icono:  string | null
}

interface Props {
  tecnicoId: string
  todas:     Categoria[]
  actuales:  Categoria[]
}

export default function GestionEspecialidades({ tecnicoId, todas, actuales }: Props) {
  const [activas, setActivas] = useState<Categoria[]>(actuales)
  const [loading, setLoading] = useState<string | null>(null)
  const [error,   setError]   = useState('')

  const activasIds = new Set(activas.map(c => c.id))
  const disponibles = todas.filter(c => !activasIds.has(c.id))

  const call = async (accion: 'agregar' | 'quitar', categoria: Categoria) => {
    setLoading(categoria.id)
    setError('')
    const res = await fetch('/api/gestionar-especialidades', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ accion, tecnicoId, categoriaId: categoria.id }),
    })
    setLoading(null)
    if (!res.ok) { setError('Error al actualizar'); return }
    if (accion === 'agregar') setActivas(prev => [...prev, categoria])
    else setActivas(prev => prev.filter(c => c.id !== categoria.id))
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Actuales */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Mis especialidades</p>
        {activas.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin especialidades. Agregá al menos una.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activas.map(c => (
              <div key={c.id} className="flex items-center gap-1.5 bg-primary-soft text-primary border border-primary-pale rounded-full px-3 py-1 text-sm font-medium">
                {c.icono && <span>{c.icono}</span>}
                <span>{c.nombre}</span>
                <button
                  onClick={() => call('quitar', c)}
                  disabled={loading === c.id}
                  className="ml-1 text-primary-light hover:text-red-500 transition-colors font-bold leading-none"
                  title="Quitar"
                >
                  {loading === c.id ? '...' : '×'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disponibles para agregar */}
      {disponibles.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Agregar especialidad</p>
          <div className="flex flex-wrap gap-2">
            {disponibles.map(c => (
              <button
                key={c.id}
                onClick={() => call('agregar', c)}
                disabled={loading === c.id}
                className="flex items-center gap-1.5 bg-white border border-cream-dark hover:border-primary text-gray-600 hover:text-primary rounded-full px-3 py-1 text-sm transition-colors"
              >
                {c.icono && <span>{c.icono}</span>}
                <span>{loading === c.id ? '...' : `+ ${c.nombre}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
