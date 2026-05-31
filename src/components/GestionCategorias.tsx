import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'

function PlaceholderImg() {
  return (
    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

interface Categoria {
  id:              string
  nombre:          string
  icono:           string | null
  imagen_url:      string | null
  porcentaje_tasa: number
  precio_base:     number | null
  activa:          boolean
}

function ImagenUpload({ catId, imagenUrl, onUpdate }: {
  catId:    string
  imagenUrl: string | null
  onUpdate: (url: string | null) => void
}) {
  const [url,     setUrl]     = useState<string | null>(imagenUrl)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!url) return
    const r = e.currentTarget.getBoundingClientRect()
    setPreview({ x: r.right + 12, y: r.top + r.height / 2 - 80 })
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 2 * 1024 * 1024) return

    setLoading(true)
    const ext  = file.name.split('.').pop()
    const path = `${catId}.${ext}`

    const { error } = await supabase.storage.from('categorias').upload(path, file, { upsert: true })
    if (error) { setLoading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('categorias').getPublicUrl(path)

    setLoading(false)
    setUrl(`${publicUrl}?t=${Date.now()}`)
    onUpdate(publicUrl)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <>
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setPreview(null)}
      disabled={loading}
      title="Subir imagen"
      className="relative group w-9 h-9 rounded-lg overflow-hidden border border-cream-dark hover:border-primary transition-colors shrink-0 bg-cream flex items-center justify-center"
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <PlaceholderImg />
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
        {loading
          ? <span className="text-white text-[10px]">…</span>
          : <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        }
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/webp,image/jpeg" className="hidden" onChange={handleFile} />
    </button>

    {preview && url && createPortal(
      <div
        style={{ position: 'fixed', left: preview.x, top: preview.y, zIndex: 9999 }}
        className="w-40 h-40 rounded-2xl overflow-hidden shadow-2xl border border-white/10 pointer-events-none animate-fade-in"
      >
        <img src={url} alt="" className="w-full h-full object-cover" />
      </div>,
      document.body
    )}
    </>
  )
}

type SaveState = 'idle' | 'saving' | 'ok' | 'error'

function useSaveState() {
  const [state, setState] = useState<SaveState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const set = (s: SaveState) => {
    setState(s)
    if (s === 'ok' || s === 'error') {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setState('idle'), 1800)
    }
  }
  return [state, set] as const
}

function SaveBtn({ state, onClick }: { state: SaveState; onClick: () => void }) {
  const cfg = {
    idle:   { label: 'Guardar',     cls: 'bg-primary hover:bg-primary-hover text-white' },
    saving: { label: 'Guardando…',  cls: 'bg-primary/60 text-white cursor-not-allowed' },
    ok:     { label: '✓ Guardado',  cls: 'bg-green-500 text-white' },
    error:  { label: '✗ Error',     cls: 'bg-red-500 text-white' },
  }[state]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'saving'}
      className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all shrink-0 ${cfg.cls}`}
    >
      {cfg.label}
    </button>
  )
}

function FilaCategoria({ cat, onUpdate, onRemove }: {
  cat: Categoria
  onUpdate: (updated: Categoria) => void
  onRemove: (id: string) => void
}) {
  const [nombre,     setNombre]     = useState(cat.nombre)
  const [imagenUrl,  setImagenUrl]  = useState(cat.imagen_url)
  const [porcentaje, setPorcentaje] = useState(String(cat.porcentaje_tasa))
  const [precio,     setPrecio]     = useState(cat.precio_base != null ? String(cat.precio_base) : '')
  const [saveState,  setSaveState]  = useSaveState()
  const [toggling,   setToggling]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const guardar = async () => {
    setSaveState('saving')
    const res = await fetch('/api/admin/categoria', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'editar', catId: cat.id, nombre, icono: cat.icono,
        porcentaje: parseFloat(porcentaje) || 0,
        precio_base: precio ? parseInt(precio) : null,
        imagen_url: imagenUrl,
      }),
    })
    setSaveState(res.ok ? 'ok' : 'error')
    if (res.ok) onUpdate({ ...cat, nombre, imagen_url: imagenUrl, porcentaje_tasa: parseFloat(porcentaje) || 0, precio_base: precio ? parseInt(precio) : null })
  }

  const toggle = async () => {
    setToggling(true)
    const res = await fetch('/api/admin/categoria', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'toggle', catId: cat.id, activa: cat.activa }),
    })
    setToggling(false)
    if (res.ok) onUpdate({ ...cat, activa: !cat.activa })
  }

  const eliminar = async () => {
    const res = await fetch('/api/admin/categoria', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'eliminar', catId: cat.id }),
    })
    if (res.ok) onRemove(cat.id)
  }

  return (
    <div className={`px-4 py-3 flex items-center gap-2 transition-opacity ${!cat.activa ? 'opacity-50' : ''}`}>
      <ImagenUpload catId={cat.id} imagenUrl={imagenUrl} onUpdate={setImagenUrl} />

      <input
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        className="flex-1 border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary min-w-0"
      />

      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-gray-400">$</span>
        <input
          type="number" min="0" step="100"
          value={precio}
          onChange={e => setPrecio(e.target.value)}
          placeholder="—"
          className="w-20 border border-cream-dark rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-primary"
        />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number" min="0" max="100" step="0.5"
          value={porcentaje}
          onChange={e => setPorcentaje(e.target.value)}
          className="w-14 border border-cream-dark rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-primary"
        />
        <span className="text-xs text-gray-400">%</span>
      </div>

      <SaveBtn state={saveState} onClick={guardar} />

      <button
        type="button"
        onClick={toggle}
        disabled={toggling}
        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
          cat.activa
            ? 'border-cream-dark text-gray-400 hover:border-red-300 hover:text-red-500'
            : 'border-primary-pale text-primary-light hover:bg-primary-soft'
        }`}
      >
        {toggling ? '…' : cat.activa ? 'Desactivar' : 'Activar'}
      </button>

      {/* Eliminar (solo inactivas) */}
      {!cat.activa && (
        confirmDel ? (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={eliminar} className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-1.5 rounded-full transition-colors">
              Confirmar
            </button>
            <button onClick={() => setConfirmDel(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5">
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            className="text-xs text-gray-300 hover:text-red-400 transition-colors shrink-0"
            title="Eliminar"
          >
            🗑
          </button>
        )
      )}
    </div>
  )
}

function NuevaCategoria({ onCrear }: { onCrear: (cat: Categoria) => void }) {
  const [nombre,     setNombre]     = useState('')
  const [porcentaje, setPorcentaje] = useState('')
  const [precio,     setPrecio]     = useState('')
  const [saveState,  setSaveState]  = useSaveState()

  const crear = async () => {
    if (!nombre.trim()) return
    setSaveState('saving')
    const res = await fetch('/api/admin/categoria', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'crear', nombre: nombre.trim(), icono: null,
        porcentaje: parseFloat(porcentaje) || 0,
        precio_base: precio ? parseInt(precio) : null,
      }),
    })
    if (!res.ok) { setSaveState('error'); return }
    const { categoria } = await res.json()
    setSaveState('ok')
    onCrear(categoria)
    setNombre(''); setPorcentaje(''); setPrecio('')
  }

  return (
    <div className="px-4 py-4 flex items-center gap-2 bg-cream/60">
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <PlaceholderImg />
      </div>
      <input
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        placeholder="Nueva categoría"
        className="flex-1 border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary min-w-0 bg-white"
      />
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-gray-400">$</span>
        <input
          type="number" min="0" step="100"
          value={precio}
          onChange={e => setPrecio(e.target.value)}
          placeholder="—"
          className="w-20 border border-cream-dark rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-primary bg-white"
        />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number" min="0" max="100" step="0.5"
          value={porcentaje}
          onChange={e => setPorcentaje(e.target.value)}
          placeholder="0"
          className="w-14 border border-cream-dark rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-primary bg-white"
        />
        <span className="text-xs text-gray-400">%</span>
      </div>
      <SaveBtn state={saveState} onClick={crear} />
    </div>
  )
}

export default function GestionCategorias({ inicial }: { inicial: Categoria[] }) {
  const [categorias, setCategorias] = useState(inicial)

  const activas = categorias.filter(c => c.activa).length

  return (
    <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
      <div className="px-6 py-4 border-b border-cream flex items-center justify-between">
        <p className="text-xs text-gray-400">Editá nombre, ícono, precio base y tasa. Activá o desactivá cada categoría.</p>
        <span className="text-xs text-gray-400">{categorias.length} registradas · {activas} activas</span>
      </div>
      <div className="divide-y divide-cream">
        {categorias.map(c => (
          <FilaCategoria
            key={c.id}
            cat={c}
            onUpdate={updated => setCategorias(prev => prev.map(x => x.id === updated.id ? updated : x))}
            onRemove={id => setCategorias(prev => prev.filter(x => x.id !== id))}
          />
        ))}
        <NuevaCategoria onCrear={cat => setCategorias(prev => [...prev, cat])} />
      </div>
    </div>
  )
}
