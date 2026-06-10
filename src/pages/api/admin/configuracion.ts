import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const supabase = createSupabaseAdmin()
    const { data: self } = await supabase.from('usuarios').select('tipo').eq('id', user.id).single()
    if (self?.tipo !== 'admin') return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403 })

    const { clave, valor } = await request.json()
    if (!clave || valor === undefined) {
      return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 })
    }

    const { error } = await supabase
      .from('configuracion')
      .upsert({ clave, valor }, { onConflict: 'clave' })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[api/admin/configuracion]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
