import { defineMiddleware } from 'astro:middleware'
import { createSupabaseServer } from './lib/supabase-server'

const PROTECTED_PATHS = ['/dashboard', '/solicitud']

export const onRequest = defineMiddleware(async ({ url, request, cookies, locals, redirect }, next) => {
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
