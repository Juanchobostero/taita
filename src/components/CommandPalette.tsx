import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { Tecnico } from '@/data/mockTecnicos'

interface Result {
  type: 'page' | 'tecnico' | 'categoria'
  label: string
  description: string
  href: string
  icon: string
}

const PAGES: Result[] = [
  { type: 'page', icon: '🏠', label: 'Inicio',         description: 'Página principal',              href: '/' },
  { type: 'page', icon: '👷', label: 'Técnicos',        description: 'Ver todos los técnicos',        href: '/tecnicos' },
  { type: 'page', icon: '❓', label: 'Cómo funciona',   description: 'Cómo usar la plataforma',       href: '/como-funciona' },
  { type: 'page', icon: '📝', label: 'Registrarse',     description: 'Crear una cuenta',              href: '/registro' },
  { type: 'page', icon: '🔐', label: 'Ingresar',        description: 'Iniciar sesión',                href: '/login' },
  { type: 'page', icon: '📊', label: 'Mi panel',        description: 'Dashboard del cliente',         href: '/dashboard/cliente' },
]

const CATEGORIAS: Result[] = [
  { type: 'categoria', icon: '❄️',  label: 'Refrigeración',           description: 'Técnicos en refrigeración',    href: '/tecnicos?categoria=refrigeracion' },
  { type: 'categoria', icon: '🧹',  label: 'Limpieza',                description: 'Servicio de limpieza',          href: '/tecnicos?categoria=limpieza' },
  { type: 'categoria', icon: '🌿',  label: 'Jardinería',              description: 'Jardineros y paisajistas',      href: '/tecnicos?categoria=jardineria' },
  { type: 'categoria', icon: '📦',  label: 'Mudanzas',                description: 'Servicio de mudanzas',          href: '/tecnicos?categoria=mudanzas' },
  { type: 'categoria', icon: '⚡',  label: 'Electricidad',            description: 'Técnicos electricistas',        href: '/tecnicos?categoria=electricidad' },
  { type: 'categoria', icon: '🪑',  label: 'Armado de muebles',       description: 'Armado y carpintería',          href: '/tecnicos?categoria=armado-muebles' },
  { type: 'categoria', icon: '🖌️', label: 'Pintura domiciliaria',    description: 'Pintores a domicilio',          href: '/tecnicos?categoria=pintura-domiciliaria' },
  { type: 'categoria', icon: '🚗',  label: 'Auxilios mecánicos',      description: 'Mecánica y asistencia vial',    href: '/tecnicos?categoria=auxilios-mecanicos' },
  { type: 'categoria', icon: '💻',  label: 'Soluciones informáticas', description: 'Soporte y tecnología',          href: '/tecnicos?categoria=soluciones-informaticas' },
  { type: 'categoria', icon: '🪲',  label: 'Fumigación',              description: 'Control de plagas',             href: '/tecnicos?categoria=fumigacion' },
]

function highlight(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary-soft text-primary rounded">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

interface Props {
  tecnicos?: Tecnico[]
}

export default function CommandPalette({ tecnicos = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => { setOpen(false); setQuery(''); setSelected(0) }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [close])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
    else { setQuery(''); setSelected(0) }
  }, [open])

  const tecnicoResults: Result[] = tecnicos.map(t => ({
    type: 'tecnico',
    icon: '👤',
    label: t.nombre,
    description: `${t.especialidad} · ${t.zona}`,
    href: `/tecnicos/${t.id}`,
  }))

  const all = [...PAGES, ...CATEGORIAS, ...tecnicoResults]

  const filtered = query.trim()
    ? all.filter(r =>
        r.label.toLowerCase().includes(query.toLowerCase()) ||
        r.description.toLowerCase().includes(query.toLowerCase())
      )
    : [...PAGES, ...CATEGORIAS]

  const groups = [
    { label: 'Páginas',    items: filtered.filter(r => r.type === 'page') },
    { label: 'Categorías', items: filtered.filter(r => r.type === 'categoria') },
    { label: 'Técnicos',   items: filtered.filter(r => r.type === 'tecnico') },
  ].filter(g => g.items.length > 0)

  const flat = groups.flatMap(g => g.items)

  useEffect(() => { setSelected(0) }, [query])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && flat[selected]) { window.location.href = flat[selected].href; close() }
  }

  if (!open) return null

  let globalIdx = 0

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh] px-4" onClick={close}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />

      <div
        role="dialog"
        aria-modal
        aria-label="Buscador"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Buscá páginas, técnicos, categorías..."
            className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 bg-transparent focus:outline-none"
          />
          <kbd className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono hidden sm:block">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="py-2 max-h-85 overflow-y-auto">
          {flat.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">
              Sin resultados para <span className="font-medium text-gray-600">"{query}"</span>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.label}>
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {group.label}
                </p>
                {group.items.map(item => {
                  const idx = globalIdx++
                  const isActive = idx === selected
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer',
                        isActive ? 'bg-primary-soft' : 'hover:bg-gray-50'
                      )}
                      onMouseEnter={() => setSelected(idx)}
                    >
                      <span className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition-colors',
                        isActive ? 'bg-primary-pale' : 'bg-gray-100'
                      )}>
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {highlight(item.label, query)}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {highlight(item.description, query)}
                        </p>
                      </div>
                      {isActive && (
                        <span className="ml-auto text-xs text-gray-300 shrink-0">↵</span>
                      )}
                    </a>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-50 flex gap-4 text-[10px] text-gray-300 select-none">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>Esc cerrar</span>
          <span className="ml-auto">Ctrl+K</span>
        </div>
      </div>
    </div>
  )
}
