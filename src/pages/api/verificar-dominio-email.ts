import type { APIRoute } from 'astro'
import { resolveMx } from 'node:dns/promises'

// Chequeo gratis, sin servicio externo: confirma que el DOMINIO del email tiene servidores de
// correo configurados (MX record). No prueba que la casilla puntual exista — eso lo resuelve la
// confirmación por link de Supabase (ver notificarClientePendienteVerificacion en notificaciones.ts)
// — pero descarta de entrada dominios inventados o con errores de tipeo antes de gastar el signup.
export const GET: APIRoute = async ({ url }) => {
  const email = url.searchParams.get('email')
  const dominio = email?.split('@')[1]?.trim()

  if (!dominio) {
    return new Response(JSON.stringify({ valido: false, error: 'Email inválido' }), { status: 400 })
  }

  try {
    const registros = await resolveMx(dominio)
    return new Response(JSON.stringify({ valido: registros.length > 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    // ENOTFOUND / ENODATA — el dominio no existe o no tiene servidores de correo.
    return new Response(JSON.stringify({ valido: false }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
