import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'

const EMOJIS: { e: string; k: string }[] = [
  // Herramientas
  { e: '🔧', k: 'llave herramienta reparacion' },
  { e: '🔨', k: 'martillo herramienta construccion' },
  { e: '🪚', k: 'sierra carpinteria madera' },
  { e: '🪛', k: 'destornillador herramienta' },
  { e: '🔩', k: 'tornillo tuerca' },
  { e: '⚙️', k: 'engranaje mecanica motor' },
  { e: '🛠️', k: 'herramientas reparacion' },
  { e: '🧰', k: 'caja herramientas' },
  { e: '📐', k: 'escuadra medicion' },
  { e: '📏', k: 'regla medicion' },
  // Electricidad
  { e: '⚡', k: 'electricidad rayo luz energia' },
  { e: '💡', k: 'lampara luz bombilla electricidad' },
  { e: '🔌', k: 'enchufe electricidad cable' },
  { e: '🔋', k: 'bateria energia electricidad' },
  // Refrigeración / Clima
  { e: '❄️', k: 'frio hielo nieve refrigeracion aire acondicionado' },
  { e: '🧊', k: 'hielo frio refrigeracion' },
  { e: '🌡️', k: 'temperatura termometro calor frio' },
  { e: '💨', k: 'viento aire ventilacion' },
  // Plomería / Agua
  { e: '🪠', k: 'destape plomeria cañeria' },
  { e: '🚿', k: 'ducha agua plomeria' },
  { e: '🛁', k: 'bañera agua plomeria' },
  { e: '🚰', k: 'canilla agua plomeria' },
  { e: '🌊', k: 'agua inundacion plomeria' },
  // Limpieza
  { e: '🧹', k: 'escoba limpieza barrer' },
  { e: '🧺', k: 'canasta ropa limpieza lavado' },
  { e: '🧽', k: 'esponja limpieza' },
  { e: '🫧', k: 'burbujas jabon limpieza' },
  { e: '🪣', k: 'balde limpieza agua' },
  { e: '🧴', k: 'jabon limpieza producto' },
  { e: '🧻', k: 'papel higienico limpieza' },
  // Jardinería
  { e: '🌿', k: 'planta jardineria verde' },
  { e: '🌱', k: 'brote planta jardineria' },
  { e: '🌳', k: 'arbol jardineria poda' },
  { e: '🌾', k: 'pasto jardineria campo' },
  { e: '🪴', k: 'maceta planta interior jardineria' },
  { e: '🌸', k: 'flor jardineria primavera' },
  { e: '🍃', k: 'hoja planta jardineria' },
  { e: '✂️', k: 'tijera poda corte jardineria' },
  // Mudanzas / Transporte
  { e: '📦', k: 'caja mudanza paquete' },
  { e: '🚚', k: 'camion mudanza transporte flete' },
  { e: '🪤', k: 'carga mudanza' },
  // Fumigación / Plagas
  { e: '🪲', k: 'bicho insecto fumigacion plaga' },
  { e: '🐛', k: 'gusano plaga fumigacion' },
  { e: '🦟', k: 'mosquito plaga fumigacion' },
  { e: '🪳', k: 'cucaracha plaga fumigacion' },
  { e: '🐀', k: 'rata raton plaga fumigacion' },
  // Carpintería / Muebles
  { e: '🪑', k: 'silla mueble carpinteria' },
  { e: '🛋️', k: 'sofa mueble sala' },
  { e: '🪞', k: 'espejo mueble hogar' },
  { e: '🛏️', k: 'cama mueble dormitorio' },
  { e: '🚪', k: 'puerta carpinteria' },
  { e: '🪟', k: 'ventana carpinteria' },
  // Pintura
  { e: '🖌️', k: 'pincel pintura arte' },
  { e: '🎨', k: 'paleta pintura color' },
  // Mecánica / Auto
  { e: '🚗', k: 'auto coche mecanica vehiculo auxilio' },
  { e: '🛞', k: 'rueda llanta mecanica auxilio' },
  { e: '🏎️', k: 'auto coche mecanica rapido' },
  { e: '⛽', k: 'nafta combustible gasolina' },
  // Hogar / Construcción
  { e: '🏠', k: 'casa hogar vivienda' },
  { e: '🏗️', k: 'construccion obra albañileria' },
  { e: '🔑', k: 'llave cerrajeria puerta' },
  { e: '🪜', k: 'escalera construccion' },
  // Gas
  { e: '🔥', k: 'fuego gas calor' },
  { e: '🍳', k: 'cocina gas hornalla' },
  // Seguridad
  { e: '📷', k: 'camara seguridad cctv' },
  { e: '🔐', k: 'candado seguridad' },
  { e: '🚨', k: 'alarma seguridad emergencia' },
  // Varios servicios
  { e: '💈', k: 'peluqueria corte cabello' },
  { e: '🐾', k: 'mascotas animales veterinaria' },
  { e: '👶', k: 'bebe niño cuidado' },
  { e: '👴', k: 'abuelo adulto mayor cuidado' },
  { e: '💪', k: 'fuerza trabajo servicio' },
  { e: '⭐', k: 'estrella calidad destacado' },
]

interface Props {
  name: string
  value?: string
}

export default function EmojiPicker({ name, value: initial = '' }: Props) {
  const [value, setValue]   = useState(initial)
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const [pos, setPos]       = useState({ top: 0, left: 0 })
  const buttonRef           = useRef<HTMLButtonElement>(null)
  const searchRef           = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return EMOJIS
    const q = query.toLowerCase().trim()
    return EMOJIS.filter(({ e, k }) => e.includes(q) || k.includes(q))
  }, [query])

  useEffect(() => {
    if (!open) { setQuery(''); return }
    setTimeout(() => searchRef.current?.focus(), 30)
    const handler = (e: MouseEvent) => {
      const picker = document.getElementById('emoji-portal')
      if (buttonRef.current?.contains(e.target as Node)) return
      if (!picker?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const pickerHeight = 260
      const spaceBelow = window.innerHeight - rect.bottom
      setPos({
        top:  spaceBelow < pickerHeight
          ? rect.top  + window.scrollY - pickerHeight - 4
          : rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      })
    }
    setOpen(o => !o)
  }

  const portal = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          id="emoji-portal"
          style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border border-cream-dark rounded-2xl shadow-xl p-2 w-64"
        >
          {/* Buscador */}
          <div className="flex items-center gap-2 border border-cream-dark rounded-lg px-2 py-1.5 mb-2">
            <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar emoji..."
              className="flex-1 text-xs focus:outline-none bg-transparent text-gray-700 placeholder:text-gray-400"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500 text-xs">✕</button>
            )}
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Sin resultados</p>
          ) : (
            <div className="grid grid-cols-8 gap-0.5 max-h-44 overflow-y-auto">
              {filtered.map(({ e }) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setValue(e); setOpen(false) }}
                  className="w-7 h-7 text-base flex items-center justify-center rounded hover:bg-primary-soft transition-colors"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => { setValue(''); setOpen(false) }}
            className="w-full mt-1.5 text-xs text-gray-400 hover:text-gray-600 py-1 hover:bg-cream rounded transition-colors"
          >
            Quitar emoji
          </button>
        </div>,
        document.body
      )
    : null

  return (
    <div className="relative shrink-0">
      <input type="hidden" name={name} value={value} />
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="w-12 h-9 border border-cream-dark rounded-lg text-lg flex items-center justify-center hover:border-primary transition-colors bg-white"
        title="Elegir emoji"
      >
        {value || <span className="text-gray-300 text-sm">🔧</span>}
      </button>
      {portal}
    </div>
  )
}
