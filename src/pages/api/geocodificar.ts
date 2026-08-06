import type { APIRoute } from 'astro'

// Proxy server-side a Nominatim (geocoding de OpenStreetMap, gratis) — no se llama directo desde
// el browser para poder mandar un User-Agent identificable, como pide la política de uso de
// Nominatim (https://operations.osmfoundation.org/policies/nominatim/).

// Caja que cubre aproximadamente la provincia de Corrientes (zona base de la plataforma hoy) —
// se usa como sesgo suave (`bounded=0`, no excluye el resto del país) para que direcciones
// ambiguas como "Santa Fe 650" prioricen resultados cercanos en vez de la provincia de Santa Fe.
// Formato Nominatim: `<lon_izq>,<lat_arriba>,<lon_der>,<lat_abajo>`.
const VIEWBOX_CORRIENTES = '-60.9,-26.0,-55.5,-30.8'

export const GET: APIRoute = async ({ url }) => {
  const direccion = url.searchParams.get('direccion')?.trim()
  if (!direccion) return new Response(JSON.stringify({ error: 'direccion requerida' }), { status: 400 })

  try {
    const params = new URLSearchParams({
      format:        'json',
      limit:         '5',
      countrycodes:  'ar',
      viewbox:       VIEWBOX_CORRIENTES,
      bounded:       '0',
      q:             direccion,
    })
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'TaitaSoluciones/1.0 (contacto@taitasoluciones.com.ar)' },
    })
    if (!res.ok) return new Response(JSON.stringify({ error: 'Servicio de mapas no disponible' }), { status: 502 })

    const data = await res.json()
    const resultados = Array.isArray(data) ? data : []

    return new Response(JSON.stringify({
      resultados: resultados.map((r: { lat: string; lon: string; display_name: string }) => ({
        lat:   parseFloat(r.lat),
        lng:   parseFloat(r.lon),
        // display_name viene muy largo ("calle, barrio, ciudad, partido, provincia, código
        // postal, Argentina") — se recortan los primeros componentes, que son los que importan
        // para reconocer la dirección de un vistazo.
        label: r.display_name.split(',').slice(0, 4).join(',').trim(),
      })),
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[api/geocodificar]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
