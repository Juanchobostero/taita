import { useState } from 'react'

interface Props {
  solicitudId: string
  titulo:      string
}

export default function CancelarSolicitud({ solicitudId, titulo }: Props) {
  const [abierto,   setAbierto]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const confirmar = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/cliente/cancelar-solicitud', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ solicitudId }),
    })
    if (res.ok) {
      window.location.reload()
      return
    }
    const json = await res.json().catch(() => ({}))
    setError(json.error ?? 'No se pudo cancelar la solicitud')
    setLoading(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex-1 sm:flex-none text-sm font-semibold bg-red-50 hover:bg-red-500 text-red-600 hover:text-white px-5 py-2.5 rounded-full transition-colors"
      >
        Cancelar solicitud
      </button>

      {/* Modal centrado en vez de un bloque inline — mismo criterio que CerrarServicio y
          ResponderAsignacion, para que sea consistente en toda la app. */}
      {abierto && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !loading && setAbierto(false)}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 flex flex-col gap-3 text-sm text-red-700"
            onClick={(e) => e.stopPropagation()}
          >
            <p>
              ¿Seguro que querés cancelar <strong>{titulo}</strong>? Según nuestros{' '}
              <a href="/terminos" target="_blank" className="underline font-medium">Términos y condiciones</a>,
              la cancelación es definitiva y, si ya hay un técnico asignado, va a ser notificado.
            </p>
            {error && <p className="text-red-600 font-semibold text-xs">{error}</p>}
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={loading}
                onClick={confirmar}
                className="font-semibold bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setAbierto(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
