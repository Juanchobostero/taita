import { defineMiddleware } from 'astro:middleware'
import { createSupabaseServer } from './lib/supabase-server'

const PROTECTED_PATHS = ['/dashboard', '/solicitud']

// Rutas públicas que no necesitan saber si hay sesión — se saltea el chequeo de auth (una llamada
// de red a Supabase en cada request) para que respondan lo más rápido posible. Importa en
// particular para /sitemap.xml: los rastreadores (Googlebot) tienen menos tolerancia a latencia
// que un navegador, y esta ruta ni siquiera usa `Astro.locals.user`.
const SIN_CHEQUEO_AUTH = ['/sitemap.xml', '/robots.txt']

export const onRequest = defineMiddleware(async ({ url, request, cookies, locals, redirect }, next) => {
  if (SIN_CHEQUEO_AUTH.includes(url.pathname)) {
    return next()
  }

  const supabase = createSupabaseServer({ request, cookies })

  // Refrescar sesión en cada request (actualiza cookies si el token expiró)
  const { data: { session } } = await supabase.auth.getSession()

  locals.session = session
  locals.user    = session?.user ?? null

  const isProtected = PROTECTED_PATHS.some(p => url.pathname.startsWith(p))
  if (isProtected && !session) {
    const origin = encodeURIComponent(url.pathname + url.search)
    return redirect(`/login?redirect=${origin}`)
  }

  return next()
})
