import type { APIRoute } from 'astro'

// Geocoding inverso (coordenadas → dirección legible) — se usa cuando el cliente aprieta "Usar mi
// ubicación": el navegador solo da lat/lng, y el campo de texto de Dirección necesita algo escrito
// (es obligatorio). Mismo proxy server-side a Nominatim que `geocodificar.ts`, por la misma razón
// (mandar un User-Agent identificable).
export const GET: APIRoute = async ({ url }) => {
  const lat = url.searchParams.get('lat')
  const lng = url.searchParams.get('lng')
  if (!lat || !lng) return new Response(JSON.stringify({ error: 'lat y lng requeridos' }), { status: 400 })

  try {
    const params = new URLSearchParams({ format: 'json', lat, lon: lng })
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { 'User-Agent': 'TaitaSoluciones/1.0 (contacto@taitasoluciones.com.ar)' },
    })
    if (!res.ok) return new Response(JSON.stringify({ error: 'Servicio de mapas no disponible' }), { status: 502 })

    const data = await res.json()
    if (!data?.display_name) return new Response(JSON.stringify({ error: 'No encontramos una dirección para esa ubicación' }), { status: 404 })

    return new Response(JSON.stringify({
      label: (data.display_name as string).split(',').slice(0, 4).join(',').trim(),
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[api/geocodificar-inverso]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
