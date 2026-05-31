import { useState, useEffect } from 'react'
import type { TecnicoDisplay as Tecnico } from '../lib/types'
import { toSlug } from '../lib/types'

interface CategoriaFiltro {
  id:         string
  nombre:     string
  icono:      string | null
  imagen_url: string | null
}

function iniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('')
}

function CatIcon({ c, size = 'sm' }: { c: CategoriaFiltro; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'w-8 h-8' : 'w-5 h-5'
  if (c.imagen_url) return <img src={c.imagen_url} alt={c.nombre} className={`${dim} object-cover rounded`} />
  if (c.icono) return <span className={size === 'md' ? 'text-xl' : 'text-sm'}>{c.icono}</span>
  return null
}

export default function FiltroTecnicos({ tecnicos, categoriasFiltro = [] }: { tecnicos: Tecnico[]; categoriasFiltro?: CategoriaFiltro[] }) {
  const [categoria, setCategoria] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCategoria(params.get('categoria') ?? '')
  }, [])

  const cats: ({ slug: string; label: string; icono: string | null; imagen_url: string | null })[] = [
    { slug: '', label: 'Todos', icono: null, imagen_url: null },
    ...categoriasFiltro.map(c => ({ slug: toSlug(c.nombre), label: c.nombre, icono: c.icono, imagen_url: c.imagen_url })),
  ]

  const filtrados = tecnicos.filter(t => {
    const coincideCategoria = !categoria || t.categoria === categoria
    const coincideBusqueda =
      !busqueda ||
      t.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.especialidad.toLowerCase().includes(busqueda.toLowerCase())
    return coincideCategoria && coincideBusqueda
  })

  return (
    <div className="flex flex-col gap-6">
      <input
        type="text"
        placeholder="Buscá por nombre o especialidad..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="w-full px-5 py-3 rounded-full border border-cream-dark shadow-sm focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
      />

      <div className="flex flex-wrap gap-2">
        {cats.map(c => (
          <button
            key={c.slug}
            onClick={() => setCategoria(c.slug)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoria === c.slug
                ? 'bg-primary text-white'
                : 'bg-white border border-cream-dark text-gray-600 hover:border-primary hover:text-primary'
            }`}
          >
            {c.imagen_url && <img src={c.imagen_url} alt="" className="w-4 h-4 object-cover rounded" />}
            {c.label}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🔍</p>
          <p className="font-medium text-gray-500">No encontramos técnicos para esa búsqueda.</p>
          <p className="text-sm mt-1">Probá con otro término o categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(t => (
            <a
              key={t.id}
              href={`/tecnicos/${t.id}`}
              className="bg-white rounded-2xl p-6 border border-cream-dark hover:border-primary-pale transition-all flex flex-col gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center text-primary font-bold text-sm shrink-0 overflow-hidden">
                  {t.foto_url
                    ? <img src={t.foto_url} alt={t.nombre} className="w-full h-full object-cover" />
                    : iniciales(t.nombre)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{t.nombre}</p>
                  <p className="text-sm text-primary font-medium truncate">{t.especialidad}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    t.disponible ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {t.disponible ? 'Disponible' : 'Ocupado'}
                </span>
              </div>

              <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{t.descripcion}</p>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-sm">
                <span className="flex items-center gap-1">
                  <span className="text-yellow-400">⭐</span>
                  <span className="font-semibold text-gray-800">{t.calificacion}</span>
                  <span className="text-gray-400">({t.resenas})</span>
                </span>
                <span className="text-gray-400 truncate ml-2 text-xs">📍 {t.zona}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
