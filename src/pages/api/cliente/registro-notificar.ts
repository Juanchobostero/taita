import type { APIRoute } from 'astro'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { notificarClientePendienteVerificacion } from '@/lib/notificaciones'

// Sin chequeo de sesión a propósito, mismo criterio que `api/registro-tecnico.ts`: justo después
// del `supabase.auth.signUp()` del cliente, si "Confirm email" está activo en Supabase todavía no
// hay sesión (queda null hasta que confirme), así que no hay cookie de auth que validar acá — se
// confía en el `userId` que manda el propio flujo de registro, recién creado.
export const POST: APIRoute = async ({ request }) => {
  try {
    const { userId } = await request.json()
    if (!userId) return new Response(JSON.stringify({ error: 'userId requerido' }), { status: 400 })

    const supabase = createSupabaseAdmin()
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('nombre_completo')
      .eq('id', userId)
      .single()

    if (usuario) {
      await notificarClientePendienteVerificacion(supabase, userId, usuario.nombre_completo)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[api/cliente/registro-notificar]', err)
    // Mejor esfuerzo — si falla el aviso, el registro en sí ya quedó hecho, no hace falta romper
    // la experiencia del usuario por esto.
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
}
