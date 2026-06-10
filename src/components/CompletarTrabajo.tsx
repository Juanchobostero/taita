import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  solicitudId: string
  tecnicoId:   string
  precioBase:  number | null
  tasa:        number | null
}

export default function CompletarTrabajo({ solicitudId, tecnicoId, precioBase, tasa }: Props) {
  const [open,             setOpen]             = useState(false)
  const [imagenes,         setImagenes]         = useState<string[]>([])
  const [gastosExtra,      setGastosExtra]      = useState('')
  const [descripcionGastos, setDescGastos]      = useState('')
  const [uploading,        setUploading]        = useState(false)
  const [submitting,       setSubmitting]       = useState(false)
  const [error,            setError]            = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    const urls: string[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 5 * 1024 * 1024) continue
      const ext  = file.name.split('.').pop()
      const path = `${tecnicoId}/${solicitudId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('trabajos').upload(path, file, { upsert: false })
      if (upErr) continue
      const { data: { publicUrl } } = supabase.storage.from('trabajos').getPublicUrl(path)
      urls.push(publicUrl)
    }
    setImagenes(prev => [...prev, ...urls])
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeImagen = (idx: number) => {
    setImagenes(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/tecnico/completar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solicitudId,
        imagenes,
        gastosExtra:       gastosExtra ? parseFloat(gastosExtra) : 0,
        descripcionGastos: descripcionGastos.trim() || null,
      }),
    })
    if (res.ok) {
      window.location.reload()
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Error al completar el trabajo')
      setSubmitting(false)
    }
  }

  const gastosNum   = parseFloat(gastosExtra) || 0
  const tasaPct     = tasa ?? 0
  const base        = (precioBase ?? 0) + gastosNum
  const totalNuevo  = gastosNum > 0 ? base + Math.round(base * tasaPct / 100) : null
  const fmt         = (n: number) => `$${n.toLocaleString('es-AR')}`

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs bg-primary-soft hover:bg-primary text-primary hover:text-white border border-primary-pale font-medium px-3 py-1.5 rounded-full transition-colors"
      >
        ✓ Completar trabajo
      </button>
    )
  }

  return (
    <div className="mt-3 border border-primary-pale rounded-2xl p-4 flex flex-col gap-4 bg-primary-soft/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#1B4D2E]">Completar trabajo</p>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>

      {/* Fotos */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-gray-600">Fotos del trabajo (opcional, máx 5)</p>
        <div className="flex flex-wrap gap-2">
          {imagenes.map((url, idx) => (
            <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-cream-dark group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImagen(idx)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-lg"
              >
                ×
              </button>
            </div>
          ))}
          {imagenes.length < 5 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-16 h-16 rounded-xl border-2 border-dashed border-primary-pale hover:border-primary text-primary/40 hover:text-primary transition-colors flex items-center justify-center text-2xl"
            >
              {uploading ? <span className="text-xs">…</span> : '+'}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>

      {/* Gastos extras */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-gray-600">Gastos extras (materiales, traslado, etc.)</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">$</span>
          <input
            type="number"
            min="0"
            step="100"
            value={gastosExtra}
            onChange={e => setGastosExtra(e.target.value)}
            placeholder="0"
            className="w-28 border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white"
          />
        </div>
        {gastosNum > 0 && (
          <textarea
            value={descripcionGastos}
            onChange={e => setDescGastos(e.target.value)}
            placeholder="Describí los gastos (ej: materiales $X, traslado $Y)"
            rows={2}
            className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white resize-none"
          />
        )}
        {totalNuevo != null && precioBase != null && (
          <div className="bg-white rounded-xl px-3 py-2 text-xs text-gray-600 border border-cream-dark">
            <div className="flex justify-between">
              <span>Precio base</span>
              <span>{fmt(precioBase)}</span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span>Gastos extras</span>
              <span>+ {fmt(gastosNum)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-cream mt-1 pt-1">
              <span>Nuevo total (con tasa {tasaPct}%)</span>
              <span>{fmt(totalNuevo)}</span>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-[#1B4D2E] hover:bg-primary-hover text-white font-semibold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-60"
      >
        {submitting ? 'Guardando…' : 'Confirmar cierre del trabajo'}
      </button>
    </div>
  )
}
