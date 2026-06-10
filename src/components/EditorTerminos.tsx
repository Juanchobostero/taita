import { useState } from 'react'

type SaveState = 'idle' | 'saving' | 'ok' | 'error'

export default function EditorTerminos({ contenido: inicial }: { contenido: string }) {
  const [texto,     setTexto]     = useState(inicial)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const guardar = async () => {
    setSaveState('saving')
    const res = await fetch('/api/admin/configuracion', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: 'terminos_y_condiciones', valor: texto }),
    })
    setSaveState(res.ok ? 'ok' : 'error')
    if (res.ok) setTimeout(() => setSaveState('idle'), 2000)
  }

  const btnCfg = {
    idle:   { label: 'Guardar cambios',  cls: 'bg-primary hover:bg-primary-hover text-white' },
    saving: { label: 'Guardando…',       cls: 'bg-primary/60 text-white cursor-not-allowed' },
    ok:     { label: '✓ Guardado',       cls: 'bg-green-500 text-white' },
    error:  { label: '✗ Error al guardar', cls: 'bg-red-500 text-white' },
  }[saveState]

  return (
    <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
      <div className="px-6 py-4 border-b border-cream flex items-center justify-between">
        <p className="text-xs text-gray-400">El contenido se guarda como texto plano. Podés usar saltos de línea.</p>
        <button
          onClick={guardar}
          disabled={saveState === 'saving'}
          className={`text-sm font-medium px-4 py-2 rounded-full transition-all shrink-0 ${btnCfg.cls}`}
        >
          {btnCfg.label}
        </button>
      </div>

      <div className="p-6 flex flex-col gap-4">
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          rows={28}
          className="w-full border border-cream-dark rounded-xl px-4 py-3 text-sm text-gray-700 font-mono leading-relaxed focus:outline-none focus:border-primary resize-y"
          placeholder="Escribí aquí el contenido de los Términos y condiciones..."
        />
        <p className="text-xs text-gray-400 text-right">{texto.length} caracteres</p>
      </div>

      <div className="px-6 pb-6">
        <p className="text-xs text-gray-400 bg-cream rounded-xl px-4 py-3">
          Vista previa en{' '}
          <a href="/terminos" target="_blank" className="text-primary hover:underline font-medium">/terminos</a>.
          Los cambios se aplican inmediatamente después de guardar.
        </p>
      </div>
    </div>
  )
}
