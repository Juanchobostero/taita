import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import type { AstroCookies } from 'astro'

export function createSupabaseServer({
  request,
  cookies,
}: {
  request: Request
  cookies: AstroCookies
}) {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '')
            .map(({ name, value }) => ({ name, value: value ?? '' }))
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, options as Parameters<typeof cookies.set>[2])
          })
        },
      },
    }
  )
}
