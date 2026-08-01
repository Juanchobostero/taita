import { useState } from 'react'

interface Cliente {
  id:              string
  nombre_completo: string
  email:           string
  telefono:        string | null
  creado_en:       string
}

interface TecnicoRow {
  tecnicoId:       string
  usuarioId:       string
  activo:          boolean
  zona_cobertura:  string | null
  tarifa_hora:     number | null
  nick:            string | null
  mostrar_nombre:  boolean
  descripcion:     string | null
  cvu:             string | null
  nombre_completo: string
  email:           string
  telefono:        string | null
  creado_en:       string
}

type SaveState = 'idle' | 'saving' | 'ok' | 'error'

function useSave() {
  const [state, setState] = useState<SaveState>('idle')
  const set = (s: SaveState) => {
    setState(s)
    if (s === 'ok' || s === 'error') setTimeout(() => setState('idle'), 1800)
  }
  return [state, set] as const
}

function FilaCliente({ c }: { c: Cliente }) {
  const [nombre,   setNombre]   = useState(c.nombre_completo)
  const [telefono, setTelefono] = useState(c.telefono ?? '')
  const [expanded, setExpanded] = useState(false)
  const [save, setSave] = useSave()
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState('')

  const guardar = async () => {
    setSave('saving')
    const res = await fetch('/api/admin/usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'editar-usuario', usuarioId: c.id, nombre_completo: nombre, telefono }),
    })
    setSave(res.ok ? 'ok' : 'error')
  }

  const eliminar = async () => {
    setEliminando(true)
    setErrorEliminar('')
    const res = await fetch('/api/admin/usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'eliminar-usuario', usuarioId: c.id }),
    })
    if (res.ok) { window.location.reload(); return }
    const json = await res.json().catch(() => ({}))
    setErrorEliminar(json.error ?? 'No se pudo eliminar')
    setEliminando(false)
  }

  const btn = {
    idle:   { label: 'Guardar', cls: 'bg-primary hover:bg-primary-hover text-white' },
    saving: { label: '…',       cls: 'bg-primary/60 text-white cursor-not-allowed' },
    ok:     { label: '✓',       cls: 'bg-green-500 text-white' },
    error:  { label: '✗',       cls: 'bg-red-500 text-white' },
  }[save]

  return (
    <div className="divide-y divide-cream">
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-cream/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-gray-300 text-xs w-4">{expanded ? '▾' : '▸'}</span>
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
          {nombre.split(' ').slice(0, 2).map(p => p[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{nombre}</p>
          <p className="text-xs text-gray-400 truncate">{c.email}</p>
        </div>
        <span className="text-xs text-gray-300 shrink-0">
          {new Date(c.creado_en).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
        </span>
      </div>
      {expanded && (
        <div className="bg-cream/40 px-6 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Nombre completo</label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onClick={e => e.stopPropagation()}
                className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Teléfono</label>
              <input
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder="—"
                className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white"
              />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={(e) => { e.stopPropagation(); guardar() }}
              disabled={save === 'saving'}
              className={`text-xs font-medium px-4 py-1.5 rounded-full transition-all ${btn.cls}`}
            >
              {btn.label}
            </button>
            {!confirmandoEliminar && (
              <button
                onClick={e => { e.stopPropagation(); setConfirmandoEliminar(true) }}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-cream-dark text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors"
              >
                Eliminar
              </button>
            )}
          </div>
          {confirmandoEliminar && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col gap-2 text-xs text-red-700" onClick={e => e.stopPropagation()}>
              <p>¿Seguro que querés eliminar a <strong>{nombre}</strong>? Es definitivo — se borra el login y el perfil.</p>
              {errorEliminar && <p className="font-semibold">{errorEliminar}</p>}
              <div className="flex items-center gap-4">
                <button
                  disabled={eliminando}
                  onClick={eliminar}
                  className="font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                >
                  {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button disabled={eliminando} onClick={() => setConfirmandoEliminar(false)} className="text-gray-500 hover:text-gray-700">
                  Volver
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FilaTecnico({ t: inicial }: { t: TecnicoRow }) {
  const [t,        setT]        = useState(inicial)
  const [expanded, setExpanded] = useState(false)
  const [save,     setSave]     = useSave()
  const [toggling, setToggling] = useState(false)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState('')
  const [mostrarCvu, setMostrarCvu] = useState(false)
  const [cvuCopiado, setCvuCopiado] = useState(false)

  const copiarCvu = async () => {
    if (!t.cvu) return
    await navigator.clipboard.writeText(t.cvu)
    setCvuCopiado(true)
    setTimeout(() => setCvuCopiado(false), 1500)
  }

  const update = (field: keyof TecnicoRow, val: unknown) =>
    setT(prev => ({ ...prev, [field]: val }))

  const eliminar = async () => {
    setEliminando(true)
    setErrorEliminar('')
    const res = await fetch('/api/admin/usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'eliminar-usuario', usuarioId: t.usuarioId }),
    })
    if (res.ok) { window.location.reload(); return }
    const json = await res.json().catch(() => ({}))
    setErrorEliminar(json.error ?? 'No se pudo eliminar')
    setEliminando(false)
  }

  const guardar = async () => {
    setSave('saving')
    const [r1, r2] = await Promise.all([
      fetch('/api/admin/usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'editar-usuario',
          usuarioId: t.usuarioId,
          nombre_completo: t.nombre_completo,
          telefono: t.telefono,
        }),
      }),
      fetch('/api/admin/usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion:          'editar-tecnico',
          tecnicoId:       t.tecnicoId,
          zona_cobertura:  t.zona_cobertura,
          tarifa_hora:     t.tarifa_hora,
          nick:            t.nick,
          mostrar_nombre:  t.mostrar_nombre,
          descripcion:     t.descripcion,
        }),
      }),
    ])
    setSave(r1.ok && r2.ok ? 'ok' : 'error')
  }

  const toggleActivo = async () => {
    setToggling(true)
    const res = await fetch('/api/admin/usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'toggle-activo-tecnico', tecnicoId: t.tecnicoId, activo: t.activo }),
    })
    if (res.ok) {
      const json = await res.json()
      setT(prev => ({ ...prev, activo: json.activo }))
    }
    setToggling(false)
  }

  const btn = {
    idle:   { label: 'Guardar', cls: 'bg-primary hover:bg-primary-hover text-white' },
    saving: { label: '…',       cls: 'bg-primary/60 text-white cursor-not-allowed' },
    ok:     { label: '✓',       cls: 'bg-green-500 text-white' },
    error:  { label: '✗',       cls: 'bg-red-500 text-white' },
  }[save]

  return (
    <div className="divide-y divide-cream">
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-cream/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-gray-300 text-xs w-4">{expanded ? '▾' : '▸'}</span>
        <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center text-primary font-bold text-xs shrink-0">
          {t.nombre_completo.split(' ').slice(0, 2).map(p => p[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {t.nick ? `${t.nombre_completo} (${t.nick})` : t.nombre_completo}
          </p>
          <p className="text-xs text-gray-400 truncate">{t.email}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${t.activo ? 'bg-primary-soft text-[#1B4D2E]' : 'bg-gray-100 text-gray-400'}`}>
          {t.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      {expanded && (
        <div className="bg-cream/40 px-6 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Nombre completo</label>
              <input
                value={t.nombre_completo}
                onChange={e => update('nombre_completo', e.target.value)}
                onClick={e => e.stopPropagation()}
                className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Teléfono</label>
              <input
                value={t.telefono ?? ''}
                onChange={e => update('telefono', e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder="—"
                className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Nick / Alias</label>
              <input
                value={t.nick ?? ''}
                onChange={e => update('nick', e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder="—"
                className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Zona de cobertura</label>
              <input
                value={t.zona_cobertura ?? ''}
                onChange={e => update('zona_cobertura', e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder="—"
                className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Tarifa / hora ($)</label>
              <input
                type="number"
                value={t.tarifa_hora ?? ''}
                onChange={e => update('tarifa_hora', e.target.value ? parseFloat(e.target.value) : null)}
                onClick={e => e.stopPropagation()}
                placeholder="—"
                className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-gray-400">Descripción</label>
              <textarea
                value={t.descripcion ?? ''}
                onChange={e => update('descripcion', e.target.value)}
                onClick={e => e.stopPropagation()}
                rows={2}
                placeholder="—"
                className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white resize-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">CVU / CBU</label>
              <div className="flex items-center gap-2">
                <span className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm bg-cream/40 flex-1 font-mono">
                  {t.cvu ? (mostrarCvu ? t.cvu : '•'.repeat(Math.min(t.cvu.length, 22))) : '—'}
                </span>
                {t.cvu && (
                  <>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setMostrarCvu(v => !v) }}
                      className="text-gray-400 hover:text-primary transition-colors shrink-0 cursor-pointer"
                      title={mostrarCvu ? 'Ocultar' : 'Mostrar'}
                    >
                      {mostrarCvu ? '🙈' : '👁️'}
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); copiarCvu() }}
                      className="text-gray-400 hover:text-primary transition-colors shrink-0 cursor-pointer"
                      title="Copiar"
                    >
                      {cvuCopiado ? '✅' : '📋'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={e => { e.stopPropagation(); guardar() }}
              disabled={save === 'saving'}
              className={`text-xs font-medium px-4 py-1.5 rounded-full transition-all ${btn.cls}`}
            >
              {btn.label}
            </button>
            <button
              onClick={e => { e.stopPropagation(); toggleActivo() }}
              disabled={toggling}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                t.activo
                  ? 'border-cream-dark text-gray-400 hover:border-red-300 hover:text-red-500'
                  : 'border-primary-pale text-primary hover:bg-primary-soft'
              }`}
            >
              {toggling ? '…' : t.activo ? 'Desactivar' : 'Activar'}
            </button>
            {!confirmandoEliminar && (
              <button
                onClick={e => { e.stopPropagation(); setConfirmandoEliminar(true) }}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-cream-dark text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors"
              >
                Eliminar
              </button>
            )}
          </div>
          {confirmandoEliminar && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col gap-2 text-xs text-red-700" onClick={e => e.stopPropagation()}>
              <p>¿Seguro que querés eliminar a <strong>{t.nombre_completo}</strong>? Es definitivo — se borra el login y el perfil. Si tiene solicitudes o reseñas asociadas, no se va a poder — usá "Desactivar" en su lugar.</p>
              {errorEliminar && <p className="font-semibold">{errorEliminar}</p>}
              <div className="flex items-center gap-4">
                <button
                  disabled={eliminando}
                  onClick={eliminar}
                  className="font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                >
                  {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button disabled={eliminando} onClick={() => setConfirmandoEliminar(false)} className="text-gray-500 hover:text-gray-700">
                  Volver
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function GestionUsuarios({
  clientes,
  tecnicos,
}: {
  clientes: Cliente[]
  tecnicos: TecnicoRow[]
}) {
  const [tab, setTab] = useState<'clientes' | 'tecnicos'>('clientes')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex bg-cream-dark rounded-full p-1 w-fit">
        {(['clientes', 'tecnicos'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'clientes' ? `Clientes (${clientes.length})` : `Técnicos (${tecnicos.length})`}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
        <div className="divide-y divide-cream">
          {tab === 'clientes'
            ? clientes.map(c => <FilaCliente key={c.id} c={c} />)
            : tecnicos.map(t => <FilaTecnico key={t.tecnicoId} t={t} />)
          }
          {tab === 'clientes' && clientes.length === 0 && (
            <p className="px-6 py-8 text-center text-gray-400 text-sm">No hay clientes registrados.</p>
          )}
          {tab === 'tecnicos' && tecnicos.length === 0 && (
            <p className="px-6 py-8 text-center text-gray-400 text-sm">No hay técnicos registrados.</p>
          )}
        </div>
      </div>
    </div>
  )
}
