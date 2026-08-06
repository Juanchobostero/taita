import { useEffect, useRef, useState } from 'react'
import type L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Íconos servidos desde el CDN de Leaflet en vez de empaquetados localmente — con imports locales
// (`import x from 'leaflet/dist/images/marker-icon.png'`) el ícono no se veía (imagen rota) por
// cómo Vite resuelve esos assets dentro de un componente que también se evalúa en el server; el
// CDN evita ese problema por completo y ya se depende de servicios externos igual (tiles de OSM,
// geocoding de Nominatim), así que no suma una dependencia nueva en la práctica.
const LEAFLET_CDN = 'https://unpkg.com/leaflet@1.9.4/dist/images'

// Corrientes Capital — centro por default cuando todavía no hay ubicación elegida.
const CENTRO_DEFAULT: [number, number] = [-27.4806, -58.8341]
const ZOOM_DEFAULT    = 13
const ZOOM_UBICADO    = 16

interface Props {
  lat:        number | null
  lng:        number | null
  // El tercer parámetro (dirección resuelta por geocoding inverso) solo viene cuando el cliente
  // aprieta "Usar mi ubicación" — el click/arrastre manual del marcador no la manda, para no
  // pisarle al cliente una dirección que ya escribió a mano solo porque ajustó el pin un poco.
  onChange?:  (lat: number, lng: number, direccion?: string) => void
}

// La búsqueda por dirección (autocompletado) vive en el componente del formulario, pegada al
// input de Dirección — este componente solo dibuja el mapa y reacciona a lat/lng por props,
// más el botón de geolocalización y el arrastre/click manual del marcador.
export default function MapaUbicacion({ lat, lng, onChange }: Props) {
  const contenedorRef  = useRef<HTMLDivElement>(null)
  const leafletRef     = useRef<typeof L | null>(null)
  const mapRef         = useRef<L.Map | null>(null)
  const markerRef      = useRef<L.Marker | null>(null)
  const [ubicando,  setUbicando]  = useState(false)
  const [error,     setError]     = useState('')

  const interactivo = Boolean(onChange)

  const colocarMarcador = (nuevoLat: number, nuevoLng: number, zoom = ZOOM_UBICADO) => {
    const leaflet = leafletRef.current
    const mapa    = mapRef.current
    if (!leaflet || !mapa) return
    mapa.setView([nuevoLat, nuevoLng], zoom)
    if (markerRef.current) {
      markerRef.current.setLatLng([nuevoLat, nuevoLng])
    } else {
      markerRef.current = leaflet.marker([nuevoLat, nuevoLng], { draggable: interactivo }).addTo(mapa)
      if (interactivo) {
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current!.getLatLng()
          onChange?.(pos.lat, pos.lng)
        })
      }
    }
  }

  // Init del mapa — una sola vez, y solo del lado del cliente: Leaflet toca `window` apenas se
  // importa, así que un `import` estático rompería el render en el servidor (Astro renderiza el
  // componente en SSR incluso con `client:load`, para generar el HTML inicial). El import
  // dinámico dentro del efecto evita que ese código corra fuera del navegador.
  useEffect(() => {
    if (!contenedorRef.current || mapRef.current) return
    let cancelado = false

    import('leaflet').then(({ default: leaflet }) => {
      if (cancelado || !contenedorRef.current) return

      delete (leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: `${LEAFLET_CDN}/marker-icon-2x.png`,
        iconUrl:       `${LEAFLET_CDN}/marker-icon.png`,
        shadowUrl:     `${LEAFLET_CDN}/marker-shadow.png`,
      })

      leafletRef.current = leaflet

      const mapa = leaflet.map(contenedorRef.current, {
        zoomControl:     interactivo,
        dragging:        true,
        scrollWheelZoom: false,
      }).setView(lat != null && lng != null ? [lat, lng] : CENTRO_DEFAULT, lat != null ? ZOOM_UBICADO : ZOOM_DEFAULT)

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapa)

      mapRef.current = mapa

      if (lat != null && lng != null) colocarMarcador(lat, lng, ZOOM_UBICADO)

      if (interactivo) {
        mapa.on('click', (e: L.LeafletMouseEvent) => {
          colocarMarcador(e.latlng.lat, e.latlng.lng)
          onChange?.(e.latlng.lat, e.latlng.lng)
        })
      }
    })

    return () => {
      cancelado = true
      mapRef.current?.remove()
      mapRef.current    = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Si lat/lng cambian desde afuera (ej. se eligió una sugerencia del autocompletado, o se cargó
  // la solicitud ya con ubicación guardada), reflejarlo.
  useEffect(() => {
    if (lat != null && lng != null) colocarMarcador(lat, lng, ZOOM_UBICADO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.')
      return
    }
    setUbicando(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        colocarMarcador(lat, lng)
        // Geocoding inverso "mejor esfuerzo" — si falla, igual se manda la ubicación (el cliente
        // puede completar la dirección a mano), no bloquea el flujo.
        let direccion: string | undefined
        try {
          const res  = await fetch(`/api/geocodificar-inverso?lat=${lat}&lng=${lng}`)
          const json = await res.json()
          if (res.ok) direccion = json.label
        } catch {
          // sin conexión al servicio de geocoding — se sigue igual solo con las coordenadas.
        }
        onChange?.(lat, lng, direccion)
        setUbicando(false)
      },
      () => {
        setError('No pudimos acceder a tu ubicación — probá marcarla manualmente en el mapa.')
        setUbicando(false)
      },
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {interactivo && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={usarMiUbicacion}
            disabled={ubicando}
            className="text-xs font-semibold bg-cream hover:bg-cream-dark text-gray-700 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
          >
            {ubicando ? 'Ubicando...' : '📍 Usar mi ubicación'}
          </button>
        </div>
      )}
      {/* `relative z-0` aísla el contexto de apilado del mapa — Leaflet usa z-index internos
          altos (200-700) para sus capas/panes, y sin esto se "escapan" por encima de cualquier
          elemento que esté después en el DOM (ej. el dropdown de sugerencias de dirección),
          aunque ese elemento tenga un z-index mayor. */}
      <div ref={contenedorRef} className="relative z-0 w-full h-56 sm:h-72 rounded-xl border border-cream-dark overflow-hidden" />
      {interactivo && (
        <p className={`text-xs ${error ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
          {error || 'También podés arrastrar el marcador o tocar el mapa para ajustar la ubicación.'}
        </p>
      )}
    </div>
  )
}
