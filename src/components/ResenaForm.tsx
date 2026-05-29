import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  solicitudId: string
  tecnicoId:   string
  tecnicoNombre: string
}

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl leading-none transition-transform hover:scale-110"
        >
          <span className={(hovered || value) >= n ? 'text-yellow-400' : 'text-gray-200'}>★</span>
        </button>
      ))}
    </div>
  )
}

export default function ResenaForm({ solicitudId, tecnicoId, tecnicoNombre }: Props) {
  const [open,        setOpen]        = useState(false)
  const [calificacion, setCalificacion] = useState(0)
  const [comentario,  setComentario]  = useState('')
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState('')

  const submit = async () => {
    if (calificacion === 0) { setError('Seleccioná una calificación'); return }
    setError('')
    setLoading(true)
    const res = await fetch('/api/crear-resena', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ solicitudId, tecnicoId, calificacion, comentario: comentario.trim() || null }),
    })
    setLoading(false)
    if (!res.ok) {
      const { error: msg } = await res.json()
      setError(msg ?? 'Error al enviar la reseña')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="mt-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 text-center font-medium">
        ¡Gracias por tu reseña!
      </div>
    )
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
        >
          ⭐ Dejar reseña a {tecnicoNombre}
        </button>
      ) : (
        <div className="bg-primary-soft border border-primary-pale rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-primary">Tu opinión sobre {tecnicoNombre}</p>
          <Stars value={calificacion} onChange={setCalificacion} />
          <Textarea
            rows={2}
            placeholder="Contá tu experiencia (opcional)..."
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            className="text-sm resize-none"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar reseña'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
