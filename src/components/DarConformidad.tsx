import { useState } from 'react'

interface Props {
  solicitudId:   string
  titulo:        string
  total:         number | null
  yaConfirmado:  boolean
  conformidadEn: string | null
  pagoEstado:    string | null
  initPoint:     string | null
  reciboUrl:     string | null
}

export default function DarConformidad({
  solicitudId, titulo, total, yaConfirmado, conformidadEn, pagoEstado, initPoint, reciboUrl,
}: Props) {
  const [abierto, setAbierto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`

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
      <div className="bg-primary-soft border border-primary-pale rounded-xl p-4 flex flex-col gap-2 text-sm text-[#1B4D2E]">
        <p className="font-semibold">✅ Diste conformidad{fecha ? ` el ${fecha}` : ''}</p>

        {pagoEstado === 'pagado' ? (
          <>
            <p className="text-xs">
              ✅ Pago acreditado{total != null ? ` por ${fmt(total)}` : ''}. Gracias por confiar en Taita.
            </p>
            {reciboUrl && (
              <a
                href={reciboUrl}
                className="inline-flex items-center gap-1 w-fit text-xs font-semibold bg-primary-soft hover:bg-primary text-[#1B4D2E] hover:text-white px-3 py-1.5 rounded-full transition-colors"
              >
                📄 Descargar recibo
              </a>
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
              className="w-full text-center bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
            >
              Pagar con Mercado Pago
            </a>
          </>
        ) : pagoEstado === 'rechazado' ? (
          <p className="text-xs text-red-600">
            El pago fue rechazado. Escribinos a taitasoluciones@gmail.com para coordinarlo de otra forma.
          </p>
        ) : (
          <p className="text-xs">
            Pago registrado{total != null ? ` por ${fmt(total)}` : ''} — pendiente de acreditación.
          </p>
        )}
      </div>
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
