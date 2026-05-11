import { useState, useEffect } from 'react'
import type { Tecnico } from '../data/mockTecnicos'

const CATEGORIAS = [
  { slug: '',                        label: 'Todos' },
  { slug: 'refrigeracion',           label: 'Refrigeración' },
  { slug: 'limpieza',                label: 'Limpieza' },
  { slug: 'jardineria',              label: 'Jardinería' },
  { slug: 'mudanzas',                label: 'Mudanzas' },
  { slug: 'electricidad',            label: 'Electricidad' },
  { slug: 'armado-muebles',          label: 'Armado de muebles' },
  { slug: 'pintura-domiciliaria',    label: 'Pintura domiciliaria' },
  { slug: 'auxilios-mecanicos',      label: 'Auxilios mecánicos' },
  { slug: 'soluciones-informaticas', label: 'Soluciones informáticas' },
  { slug: 'fumigacion',              label: 'Fumigación' },
]

function iniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('')
}

export default function FiltroTecnicos({ tecnicos }: { tecnicos: Tecnico[] }) {
  const [categoria, setCategoria] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCategoria(params.get('categoria') ?? '')
  }, [])

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
        {CATEGORIAS.map(c => (
          <button
            key={c.slug}
            onClick={() => setCategoria(c.slug)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoria === c.slug
                ? 'bg-primary text-white'
                : 'bg-white border border-cream-dark text-gray-600 hover:border-primary hover:text-primary'
            }`}
          >
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
                <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {iniciales(t.nombre)}
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
