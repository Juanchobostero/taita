import { useState } from 'react'
import MercadoPagoBadge from '@/components/MercadoPagoBadge'

interface Props {
  solicitudId:   string
  titulo:        string
  total:         number | null
  yaConfirmado:  boolean
  conformidadEn: string | null
  pagoEstado:    string | null
  initPoint:     string | null
  reciboUrl:     string | null
  reciboDescargaUrl: string | null
}

export default function DarConformidad({
  solicitudId, titulo, total, yaConfirmado, conformidadEn, pagoEstado, initPoint, reciboUrl, reciboDescargaUrl,
}: Props) {
  const [abierto,     setAbierto]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [regenerando, setRegenerando] = useState(false)
  const [errorReintento, setErrorReintento] = useState('')
  const [verRecibo,   setVerRecibo]   = useState(false)

  const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`

  const reintentarPago = async () => {
    setRegenerando(true)
    setErrorReintento('')
    const res = await fetch('/api/cliente/reintentar-pago', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ solicitudId }),
    })
    if (res.ok) {
      window.location.reload()
      return
    }
    const json = await res.json().catch(() => ({}))
    setErrorReintento(json.error ?? 'No se pudo generar un nuevo link de pago')
    setRegenerando(false)
  }

  const confirmar = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/cliente/dar-conformidad', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ solicitudId }),
    })
    if (res.ok) {
      window.location.reload()
      return
    }
    const json = await res.json().catch(() => ({}))
    setError(json.error ?? 'No se pudo registrar la conformidad')
    setLoading(false)
  }

  if (yaConfirmado) {
    const fecha = conformidadEn
      ? new Date(conformidadEn).toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null

    return (
      <>
      <div className="bg-primary-soft border border-primary-pale rounded-xl p-4 flex flex-col gap-2 text-sm text-[#1B4D2E]">
        <p className="font-semibold">✅ Diste conformidad{fecha ? ` el ${fecha}` : ''}</p>

        {pagoEstado === 'pagado' ? (
          <>
            <p className="text-xs flex items-center gap-1.5 flex-wrap">
              <MercadoPagoBadge />
              <span>✅ Pago acreditado{total != null ? ` por ${fmt(total)}` : ''}. Gracias por confiar en Taita.</span>
            </p>
            {reciboUrl && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVerRecibo(true)}
                  className="inline-flex items-center gap-1 w-fit text-xs font-semibold bg-primary-soft hover:bg-primary text-[#1B4D2E] hover:text-white px-3 py-1.5 rounded-full transition-colors"
                >
                  👁️ Ver recibo
                </button>
                {reciboDescargaUrl && (
                  <a
                    href={reciboDescargaUrl}
                    className="inline-flex items-center gap-1 w-fit text-xs font-semibold text-[#1B4D2E] hover:text-primary px-1.5 py-1.5 transition-colors"
                  >
                    ⬇️ Descargar
                  </a>
                )}
              </div>
            )}
          </>
        ) : pagoEstado === 'pendiente_pago' && initPoint ? (
          <>
            <p className="text-xs">
              Pago{total != null ? ` de ${fmt(total)}` : ''} pendiente — completalo con Mercado Pago
              cuando quieras.
            </p>
            <a
              href={initPoint}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#3483FA] hover:bg-[#2968C8] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              <MercadoPagoBadge /> · Pagar
            </a>
            <p className="text-center text-[11px] text-gray-400 flex items-center justify-center gap-1">
              🔒 Pago seguro
            </p>
          </>
        ) : pagoEstado === 'rechazado' ? (
          <>
            <p className="text-xs text-red-600">El pago no pudo procesarse — podés intentarlo de nuevo.</p>
            {errorReintento && <p className="text-xs text-red-600 font-semibold">{errorReintento}</p>}
            <button
              type="button"
              disabled={regenerando}
              onClick={reintentarPago}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#3483FA] hover:bg-[#2968C8] text-white font-semibold py-3 rounded-xl transition-colors text-sm disabled:opacity-50"
            >
              {regenerando ? 'Generando link...' : <><MercadoPagoBadge /> · Pagar</>}
            </button>
            {!regenerando && (
              <p className="text-center text-[11px] text-gray-400 flex items-center justify-center gap-1">
                🔒 Pago seguro
              </p>
            )}
          </>
        ) : pagoEstado === 'reembolsado' ? (
          <p className="text-xs">
            💸 Este pago fue reembolsado{total != null ? ` (${fmt(total)})` : ''}. Cualquier duda,
            escribinos a taitasoluciones@gmail.com.
          </p>
        ) : pagoEstado === 'contracargo' ? (
          <p className="text-xs text-red-600">
            Hay una disputa bancaria abierta sobre este pago. Nos vamos a poner en contacto para resolverlo.
          </p>
        ) : (
          <p className="text-xs">
            Pago registrado{total != null ? ` por ${fmt(total)}` : ''} — pendiente de acreditación.
          </p>
        )}
      </div>

      {verRecibo && reciboUrl && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setVerRecibo(false)}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
          <div
            className="relative w-full max-w-3xl h-[90vh] bg-white rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVerRecibo(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white text-gray-700 hover:bg-gray-100 flex items-center justify-center shadow-md text-lg font-bold leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
            <iframe src={reciboUrl} title="Recibo de pago" className="w-full h-full border-0" />
          </div>
        </div>
      )}
      </>
    )
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
      >
        ✓ Dar conformidad
      </button>
    )
  }

  return (
    <div className="bg-primary-soft border border-primary-pale rounded-xl p-3 flex flex-col gap-2 text-xs text-[#1B4D2E]">
      <p>
        ¿Confirmás que el servicio <strong>{titulo}</strong> se realizó correctamente?
        {total != null && <> Esto registra el pago de <strong>{fmt(total)}</strong>.</>}
      </p>
      {error && <p className="text-red-600 font-semibold">{error}</p>}
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={loading}
          onClick={confirmar}
          className="font-semibold bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
        >
          {loading ? 'Confirmando...' : 'Sí, confirmar'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setAbierto(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          Volver
        </button>
      </div>
    </div>
  )
}
