import type { APIRoute } from 'astro'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

const SITE_URL = 'https://taitasoluciones.com.ar'

// Páginas fijas de contenido público — se excluyen a propósito login/registro (sin valor de
// búsqueda) y todo lo que vive bajo /dashboard o /api (privado, ya bloqueado en robots.txt).
const PAGINAS_FIJAS = [
  '', 'como-funciona', 'solicitud', 'tecnicos', 'contacto', 'reclamos', 'terminos', 'privacidad',
]

function url(loc: string, prioridad: string): string {
  return `<url><loc>${loc}</loc><priority>${prioridad}</priority></url>`
}

// Endpoint propio en vez de un plugin de sitemap genérico — el sitio corre en modo SSR
// (output: 'server'), y esos plugins solo listan rutas estáticas conocidas en build time; no se
// enteran de las páginas dinámicas (un perfil por técnico). Acá se arma a mano, consultando los
// técnicos activos en cada request, así el sitemap siempre refleja el estado real sin depender de
// un redeploy cada vez que se suma o desactiva un técnico.
export const GET: APIRoute = async () => {
  const supabase = createSupabaseAdmin()
  const { data: tecnicos } = await supabase
    .from('tecnicos')
    .select('id')
    .eq('activo', true)

  const entradas = [
    ...PAGINAS_FIJAS.map(p => url(`${SITE_URL}/${p}`, p === '' ? '1.0' : '0.7')),
    ...(tecnicos ?? []).map(t => url(`${SITE_URL}/tecnicos/${t.id}`, '0.8')),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entradas.join('\n')}
</urlset>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
