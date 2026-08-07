import { useState } from 'react'

interface Props {
  solicitudId: string
}

// Form del admin para fijar el precio de una solicitud "en cotización" (Fase 7b) — al confirmar,
// la solicitud sigue en el mismo estado hasta que el cliente responda (ver ResponderCotizacion.tsx).
export default function EnviarCotizacion({ solicitudId }: Props) {
  const [precio,   setPrecio]   = useState('')
  const [tasa,     setTasa]     = useState('5')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const total = precio && !isNaN(parseFloat(precio))
    ? Math.round(parseFloat(precio) * (1 + (parseFloat(tasa) || 0) / 100))
    : null

  const enviar = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/cotizacion/enviar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ solicitudId, precio, tasa }),
    })
    if (res.ok) {
      window.location.reload()
      return
    }
    const json = await res.json().catch(() => ({}))
    setError(json.error ?? 'No se pudo enviar la cotización')
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Precio</label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-400">$</span>
            <input
              type="number" min="0" step="100"
              value={precio}
              onChange={e => setPrecio(e.target.value)}
              placeholder="0"
              className="w-full border border-cream-dark rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Tasa plataforma</label>
          <div className="flex items-center gap-1">
            <input
              type="number" min="0" max="100" step="0.5"
              value={tasa}
              onChange={e => setTasa(e.target.value)}
              className="w-full border border-cream-dark rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
            />
            <span className="text-sm text-gray-400">%</span>
          </div>
        </div>
      </div>

      {total != null && (
        <p className="text-xs text-gray-500">Total para el cliente: <span className="font-semibold text-gray-800">${total.toLocaleString('es-AR')}</span></p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={loading || !precio || parseFloat(precio) <= 0}
        className="text-sm font-semibold bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-full transition-colors disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Enviar cotización al cliente'}
      </button>
    </div>
  )
}
