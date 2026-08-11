import { useState, useRef, useEffect } from 'react'
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
  destacada:       boolean
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

interface Subitem {
  id:              string
  nombre:          string
  descripcion:     string | null
  precio:          number | null
  porcentaje_tasa: number
  activo:          boolean
}

// Sub-ítem con guardado explícito (a diferencia de la fila de la categoría, que usa el mismo
// patrón pero ya existía) — antes se guardaba solo al salir de cada campo (`onBlur`), sin ningún
// indicador, y en la práctica no quedaba claro si había guardado o no (Jota probó y no lo notó).
// Botón con ícono de disquete en vez de un texto plano como el resto de los botones de esta
// pantalla, para que no quede todo con la misma pinta.
function SubitemRow({ sub, toggling, onToggle, onEliminar, onGuardado }: {
  sub:        Subitem
  toggling:   boolean
  onToggle:   () => void
  onEliminar: () => void
  onGuardado: (updated: Subitem) => void
}) {
  const [nombre,      setNombre]      = useState(sub.nombre)
  const [descripcion, setDescripcion] = useState(sub.descripcion ?? '')
  const [precio,      setPrecio]      = useState(sub.precio != null ? String(sub.precio) : '')
  const [porcentaje,  setPorcentaje]  = useState(String(sub.porcentaje_tasa))
  const [guardando,   setGuardando]   = useSaveState()

  const guardar = async () => {
    setGuardando('saving')
    const res = await fetch('/api/admin/categoria-subitem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion:      'editar',
        subitemId:   sub.id,
        nombre,
        descripcion,
        precio,
        porcentaje,
      }),
    })
    setGuardando(res.ok ? 'ok' : 'error')
    if (res.ok) {
      onGuardado({
        ...sub,
        nombre:          nombre.trim() || sub.nombre,
        descripcion:     descripcion.trim() || null,
        precio:          parseFloat(precio) || null,
        porcentaje_tasa: parseFloat(porcentaje) || 0,
      })
    }
  }

  const btnCfg = {
    idle:   { label: 'Guardar',     icon: '💾', cls: 'bg-primary hover:bg-primary-hover text-white' },
    saving: { label: 'Guardando…',  icon: '💾', cls: 'bg-primary/60 text-white cursor-not-allowed' },
    ok:     { label: '¡Guardado!',  icon: '✓',  cls: 'bg-green-500 text-white' },
    error:  { label: 'Error',       icon: '✗',  cls: 'bg-red-500 text-white' },
  }[guardando]

  return (
    <div className={`bg-white rounded-xl border border-cream-dark shadow-sm p-3 flex flex-col gap-2 transition-opacity ${!sub.activo ? 'opacity-50' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          className="flex-1 min-w-35 font-semibold text-sm text-gray-800 border border-transparent hover:border-cream-dark focus:border-primary rounded-lg px-2 py-1 focus:outline-none bg-white"
        />
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-sm text-gray-400">$</span>
          <input
            type="number" min="0" step="100"
            value={precio}
            onChange={e => setPrecio(e.target.value)}
            placeholder="—"
            className="w-24 border border-cream-dark rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-primary bg-white"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number" min="0" max="100" step="0.5"
            value={porcentaje}
            onChange={e => setPorcentaje(e.target.value)}
            className="w-14 border border-cream-dark rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-primary bg-white"
          />
          <span className="text-sm text-gray-400">%</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Descripción — qué incluye</label>
        <textarea
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          rows={2}
          placeholder="Ej: hasta 2,5 mts de caños incluidos"
          className="w-full border border-cream-dark rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary bg-white resize-none"
        />
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando === 'saving'}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all shrink-0 ${btnCfg.cls}`}
        >
          <span aria-hidden="true">{btnCfg.icon}</span>
          {btnCfg.label}
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={toggling}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
            sub.activo
              ? 'border-cream-dark text-gray-400 hover:border-red-300 hover:text-red-500'
              : 'border-primary-pale text-primary-light hover:bg-primary-soft'
          }`}
        >
          {toggling ? '…' : sub.activo ? 'Desactivar' : 'Activar'}
        </button>
        <button
          onClick={onEliminar}
          className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none shrink-0 px-1"
          title="Eliminar"
        >
          ×
        </button>
      </div>
    </div>
  )
}

function SubitemsPanel({ catId }: { catId: string }) {
  const [subitems,    setSubitems]    = useState<Subitem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [nuevo,       setNuevo]       = useState('')
  const [adding,      setAdding]      = useState(false)
  const [togglingId,  setTogglingId]  = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/categoria-subitem?categoria_id=${catId}`)
      .then(r => r.json())
      .then(d => { setSubitems(d.subitems ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [catId])

  const agregarSubitem = async () => {
    if (!nuevo.trim()) return
    setAdding(true)
    const res = await fetch('/api/admin/categoria-subitem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'crear', categoriaId: catId, nombre: nuevo.trim() }),
    })
    if (res.ok) {
      const { subitem } = await res.json()
      setSubitems(prev => [...prev, subitem])
      setNuevo('')
    }
    setAdding(false)
  }

  const toggleSubitem = async (sub: Subitem) => {
    setTogglingId(sub.id)
    const res = await fetch('/api/admin/categoria-subitem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'toggle', subitemId: sub.id, activo: sub.activo }),
    })
    if (res.ok) {
      const json = await res.json().catch(() => ({}))
      const nuevoActivo = json.activo ?? !sub.activo
      setSubitems(prev => prev.map(s => s.id === sub.id ? { ...s, activo: nuevoActivo } : s))
    }
    setTogglingId(null)
  }

  const eliminar = async (id: string) => {
    const res = await fetch('/api/admin/categoria-subitem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'eliminar', subitemId: id }),
    })
    if (res.ok) setSubitems(prev => prev.filter(s => s.id !== id))
  }

  const totalPrecio = subitems.filter(s => s.activo).reduce((sum, s) => sum + (s.precio ?? 0), 0)

  if (loading) return <div className="px-4 py-3 text-xs text-gray-400">Cargando subitems…</div>

  return (
    <div className="border-t border-cream-dark bg-cream/60 px-4 py-4 flex flex-col gap-3">
      <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Sub-ítems</p>
      {subitems.length === 0 && (
        <p className="text-sm text-gray-400">Sin sub-ítems todavía. Agregá uno abajo — por ejemplo "Instalación", con su precio, tasa y una descripción de lo que incluye.</p>
      )}
      {subitems.map(s => (
        <SubitemRow
          key={s.id}
          sub={s}
          toggling={togglingId === s.id}
          onToggle={() => toggleSubitem(s)}
          onEliminar={() => eliminar(s.id)}
          onGuardado={updated => setSubitems(prev => prev.map(x => x.id === updated.id ? updated : x))}
        />
      ))}
      {/* Nuevo sub-ítem */}
      <div className="flex items-center gap-2">
        <input
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregarSubitem()}
          placeholder="Nombre del nuevo sub-ítem…"
          className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
        />
        <button
          onClick={agregarSubitem}
          disabled={adding || !nuevo.trim()}
          className="text-sm font-semibold bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-full transition-colors disabled:opacity-40 shrink-0"
        >
          {adding ? '…' : '+ Agregar'}
        </button>
      </div>
      {subitems.some(s => s.activo && s.precio != null) && (
        <div className="border-t border-cream-dark pt-2 flex justify-between text-sm font-semibold text-gray-700">
          <span>Total activos</span>
          <span>${totalPrecio.toLocaleString('es-AR')}</span>
        </div>
      )}
    </div>
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
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)
  const [expanded,   setExpanded]   = useState(false)
  const [togglingDestacada, setTogglingDestacada] = useState(false)

  const guardar = async () => {
    setErrorMsg(null)
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
    if (res.ok) {
      const json = await res.json().catch(() => ({}))
      onUpdate({ ...cat, activa: json.activa ?? !cat.activa })
    }
  }

  const toggleDestacada = async () => {
    setErrorMsg(null)
    setTogglingDestacada(true)
    const res = await fetch('/api/admin/categoria', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'toggle-destacada', catId: cat.id, destacada: cat.destacada }),
    })
    setTogglingDestacada(false)
    if (res.ok) {
      const json = await res.json().catch(() => ({}))
      onUpdate({ ...cat, destacada: json.destacada ?? !cat.destacada })
    } else {
      const json = await res.json().catch(() => ({}))
      setErrorMsg(json.error ?? 'No se pudo actualizar.')
    }
  }

  const eliminar = async () => {
    setErrorMsg(null)
    const res = await fetch('/api/admin/categoria', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'eliminar', catId: cat.id }),
    })
    if (res.ok) {
      onRemove(cat.id)
    } else {
      const json = await res.json().catch(() => ({}))
      setErrorMsg(json.error ?? 'No se pudo eliminar la categoría.')
      setConfirmDel(false)
    }
  }

  return (
    <div className={`transition-opacity ${!cat.activa ? 'opacity-50' : ''}`}>
    <div className="px-4 py-3 flex items-center gap-2">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        title="Ver sub-ítems"
        className="text-gray-300 hover:text-primary transition-colors text-xs w-5 shrink-0"
      >
        {expanded ? '▾' : '▸'}
      </button>
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

      <button
        type="button"
        onClick={toggleDestacada}
        disabled={togglingDestacada}
        title="Mostrar en la página principal"
        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
          cat.destacada
            ? 'border-amber-300 text-amber-600 bg-amber-50 hover:bg-amber-100'
            : 'border-cream-dark text-gray-300 hover:border-amber-300 hover:text-amber-500'
        }`}
      >
        {togglingDestacada ? '…' : cat.destacada ? '⭐ Destacada' : '☆ Destacar'}
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
    {errorMsg && (
      <div className="mx-4 mb-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
        <span className="mt-0.5 shrink-0">⚠</span>
        <span className="flex-1">{errorMsg}</span>
        <button
          type="button"
          onClick={() => setErrorMsg(null)}
          className="text-red-400 hover:text-red-600 font-bold leading-none shrink-0"
        >
          ×
        </button>
      </div>
    )}
    {expanded && <SubitemsPanel catId={cat.id} />}
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

  const activas    = categorias.filter(c => c.activa).length
  const destacadas = categorias.filter(c => c.destacada).length

  return (
    <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
      <div className="px-6 py-4 border-b border-cream flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Editá nombre, ícono, precio base y tasa. "Destacar" la muestra en la página principal (máximo 9).
        </p>
        <span className="text-xs text-gray-400">{categorias.length} registradas · {activas} activas · {destacadas}/9 destacadas</span>
      </div>
      <div className="divide-y divide-cream">
        {categorias.map(c => (
          <FilaCategoria
            key={c.id}
            cat={c}
            onUpdate={updated => setCategorias(prev =>
              prev.map(x => x.id === updated.id ? updated : x)
                  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
            )}
            onRemove={id => setCategorias(prev => prev.filter(x => x.id !== id))}
          />
        ))}
        <NuevaCategoria onCrear={cat => setCategorias(prev =>
          [...prev, cat].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        )} />
      </div>
    </div>
  )
}
