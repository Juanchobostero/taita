import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  userId:     string
  currentUrl: string | null
  nombre:     string
  size?:      'sm' | 'lg'
}

function iniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export default function AvatarUpload({ userId, currentUrl, nombre, size = 'lg' }: Props) {
  const [url,     setUrl]     = useState<string | null>(currentUrl)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const dim = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-12 h-12 text-sm'

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return }
    if (file.size > 2 * 1024 * 1024)    { setError('Máximo 2 MB'); return }

    setError('')
    setLoading(true)

    const ext  = file.name.split('.').pop()
    const path = `${userId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) { setError('Error al subir la imagen'); setLoading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    const res = await fetch('/api/actualizar-avatar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ foto_url: publicUrl }),
    })

    setLoading(false)

    if (!res.ok) { setError('Error al guardar la foto'); return }

    setUrl(`${publicUrl}?t=${Date.now()}`)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="relative group focus:outline-none"
        title="Cambiar foto de perfil"
      >
        <div className={`${dim} rounded-full overflow-hidden bg-primary-soft flex items-center justify-center text-primary font-bold shrink-0`}>
          {url ? (
            <img src={url} alt={nombre} className="w-full h-full object-cover" />
          ) : (
            <span>{iniciales(nombre)}</span>
          )}
        </div>
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {loading
            ? <span className="text-white text-xs font-medium">...</span>
            : <span className="text-white text-lg">📷</span>
          }
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
      {!error && <p className="text-xs text-gray-400">Clic para cambiar foto</p>}
    </div>
  )
}
