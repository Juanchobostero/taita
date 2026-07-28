import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const { id, todas } = await request.json()
    const supabase = createSupabaseAdmin()

    if (todas) {
      const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('usuario_id', user.id)
        .eq('leida', false)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    if (!id) return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400 })

    // Filtramos también por usuario_id en el UPDATE (no solo verificamos antes) para que sea
    // imposible marcar como leída una notificación ajena aunque alguien mande un id que no es suyo.
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id)
      .eq('usuario_id', user.id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[api/notificaciones/marcar-leida]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
