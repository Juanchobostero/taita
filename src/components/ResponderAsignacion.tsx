import { useState } from 'react'

interface Props {
  solicitudId: string
  titulo:      string
}

export default function ResponderAsignacion({ solicitudId, titulo }: Props) {
  const [confirmandoRechazo, setConfirmandoRechazo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const responder = async (accion: 'aceptar' | 'rechazar') => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/tecnico/responder-asignacion', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ solicitudId, accion }),
    })
    if (res.ok) {
      window.location.reload()
      return
    }
    const json = await res.json().catch(() => ({}))
    setError(json.error ?? 'No se pudo procesar la respuesta')
    setLoading(false)
  }

  if (confirmandoRechazo) {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col gap-2 text-xs text-red-700">
        <p>¿Seguro que querés rechazar <strong>{titulo}</strong>? Va a volver a quedar disponible para que se le asigne a otro técnico.</p>
        {error && <p className="text-red-600 font-semibold">{error}</p>}
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => responder('rechazar')}
            className="font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
          >
            {loading ? 'Rechazando...' : 'Sí, rechazar'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setConfirmandoRechazo(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => responder('aceptar')}
          className="text-xs font-semibold bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
        >
          {loading ? 'Confirmando...' : '✓ Aceptar trabajo'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setConfirmandoRechazo(true)}
          className="text-xs font-semibold bg-red-50 hover:bg-red-500 text-red-600 hover:text-white px-3 py-1.5 rounded-full transition-colors"
        >
          Rechazar
        </button>
      </div>
    </div>
  )
}
