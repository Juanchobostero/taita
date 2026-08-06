import { useState } from 'react'

interface Props {
  solicitudId: string
  titulo:      string
}

export default function CerrarServicio({ solicitudId, titulo }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  const cerrar = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/tecnico/finalizar-servicio', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ solicitudId }),
    })
    if (res.ok) {
      window.location.reload()
      return
    }
    const json = await res.json().catch(() => ({}))
    setError(json.error ?? 'No se pudo cerrar el servicio')
    setLoading(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="text-xs font-semibold bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-full transition-colors"
      >
        ✅ Cerrar servicio
      </button>

      {/* Modal centrado en vez de un bloque inline — en listados con varios elementos en fila (ej.
          SolicitudesTecnico) un bloque de confirmación ancho empujaba y desarmaba el resto de la
          fila; el `position: fixed` no participa del flujo normal, así que no mueve nada, y evita
          el riesgo de que un `overflow-hidden` de algún contenedor padre lo recorte (como pasaría
          con un popover "flotante" anclado al botón). Mismo patrón que el modal del recibo. */}
      {confirmando && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !loading && setConfirmando(false)}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 flex flex-col gap-3 text-sm text-[#1B4D2E]"
            onClick={(e) => e.stopPropagation()}
          >
            <p>
              ¿Confirmás cerrar definitivamente <strong>{titulo}</strong>? Ya se acreditó el pago
              del cliente — esto marca el trabajo como terminado en tus estadísticas y no se puede
              deshacer.
            </p>
            {error && <p className="text-red-600 font-semibold text-xs">{error}</p>}
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={loading}
                onClick={cerrar}
                className="font-semibold bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-full transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'Cerrando...' : 'Sí, cerrar servicio'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmando(false)}
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
