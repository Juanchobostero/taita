import { useState } from 'react'

interface Props {
  solicitudId: string
  titulo:      string
}

// UI del cliente para aceptar/rechazar el horario que le propuso el admin (Fase 8.4) — mismo
// patrón de modal centrado que ResponderCotizacion.tsx/ResponderAsignacion.tsx para el rechazo
// (es la acción que devuelve la solicitud a reprogramar; aceptar es directa).
export default function ResponderHorario({ solicitudId, titulo }: Props) {
  const [confirmandoRechazo, setConfirmandoRechazo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const responder = async (accion: 'aceptar' | 'rechazar') => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/cliente/responder-horario', {
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

  return (
    <div className="flex flex-col gap-2">
      {error && !confirmandoRechazo && <p className="text-xs text-destructive font-semibold">{error}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          disabled={loading}
          onClick={() => responder('aceptar')}
          className="flex-1 sm:flex-none text-sm font-semibold bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
        >
          {loading ? 'Confirmando...' : '✓ Confirmar horario'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setConfirmandoRechazo(true)}
          className="flex-1 sm:flex-none text-sm font-semibold bg-red-50 hover:bg-red-500 text-red-600 hover:text-white px-5 py-2.5 rounded-full transition-colors"
        >
          No me sirve
        </button>
      </div>

      {confirmandoRechazo && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !loading && setConfirmandoRechazo(false)}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 flex flex-col gap-3 text-sm text-red-700"
            onClick={(e) => e.stopPropagation()}
          >
            <p>¿Seguro que el horario propuesto para <strong>{titulo}</strong> no te sirve? La solicitud vuelve a quedar pendiente para que te propongamos otro.</p>
            {error && <p className="text-red-600 font-semibold text-xs">{error}</p>}
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={loading}
                onClick={() => responder('rechazar')}
                className="font-semibold bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'Enviando...' : 'Sí, no me sirve'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmandoRechazo(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
