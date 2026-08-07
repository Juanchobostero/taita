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
      <div className="bg-white rounded-2xl shadow-lg border border-cream-dark p-4 sm:p-5 flex flex-col gap-4">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscá por nombre o especialidad..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-11 pr-5 py-3 rounded-full border border-cream-dark bg-cream/40 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-gray-700 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {cats.map(c => (
            <button
              key={c.slug}
              onClick={() => setCategoria(c.slug)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                categoria === c.slug
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-cream border border-cream-dark text-gray-600 hover:border-primary hover:text-primary'
              }`}
            >
              {c.imagen_url && <img src={c.imagen_url} alt="" className="w-4 h-4 object-cover rounded" />}
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🔍</p>
          <p className="font-medium text-gray-500">No encontramos técnicos para esa búsqueda.</p>
          <p className="text-sm mt-1">Probá con otro término o categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtrados.map(t => (
            <a
              key={t.id}
              href={`/tecnicos/${t.id}`}
              className="group bg-white rounded-2xl p-5 border border-cream-dark shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary-pale transition-all duration-300 flex flex-col gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-full bg-primary-soft ring-2 ring-primary-pale flex items-center justify-center text-primary font-bold text-sm shrink-0 overflow-hidden">
                  {t.foto_url
                    ? <img src={t.foto_url} alt={t.nombre} className="w-full h-full object-cover" />
                    : iniciales(t.nombre)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-bold text-gray-900 truncate">{t.nombre_display}</p>
                  <p className="text-sm text-primary font-medium truncate">{t.especialidad}</p>
                </div>
                <span
                  className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-semibold shrink-0 ${
                    t.disponible ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${t.disponible ? 'bg-green-500' : 'bg-gray-300'}`} />
                  {t.disponible ? 'Disponible' : 'Ocupado'}
                </span>
              </div>

              <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{t.descripcion}</p>

              <div className="flex items-center justify-between pt-3 border-t border-cream-dark/60 text-sm">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  <span className="font-semibold text-gray-800">{t.calificacion}</span>
                  <span className="text-gray-400">({t.resenas})</span>
                </span>
                <span className="flex items-center gap-1 text-gray-400 truncate ml-2 text-xs">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t.zona}
                </span>
              </div>

              <span className="inline-flex items-center justify-center text-sm font-semibold text-white bg-primary group-hover:bg-primary-hover rounded-full py-2 transition-colors">
                Ver perfil
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
