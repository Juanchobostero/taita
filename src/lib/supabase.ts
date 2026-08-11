import { createBrowserClient } from '@supabase/ssr'

// `detectSessionInUrl` desactivado a propósito: por default el SDK auto-loguea apenas ve un
// `?code=` en la URL (PKCE), en cualquier página que cargue este cliente (Navbar lo hace en todo
// el sitio) — eso le ganaba de mano al script de login.astro que solo quiere leer el código del
// link de confirmación de email para mostrar el banner, sin loguear solo (ver AuthRedirectBanner).
// La app no usa magic link/OAuth en ningún lado (solo signInWithPassword), así que no hace falta
// esta detección automática para nada más.
export const supabase = createBrowserClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  { auth: { detectSessionInUrl: false } }
)
