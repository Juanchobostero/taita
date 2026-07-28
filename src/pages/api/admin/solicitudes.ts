import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'

const PAGE_SIZE = 10

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const supabase = createSupabaseAdmin()
    const { data: self } = await supabase.from('usuarios').select('tipo').eq('id', user.id).single()
    if (self?.tipo !== 'admin') return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403 })

    const pageParam = parseInt(url.searchParams.get('page') ?? '1', 10)
    const page      = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
    const from      = (page - 1) * PAGE_SIZE
    const to        = from + PAGE_SIZE - 1

    const { data, count, error } = await supabase
      .from('solicitudes')
      .select(`
        id, titulo, estado, creado_en, tecnico_id,
        usuarios!cliente_id ( nombre_completo ),
        tecnicos ( id, usuarios ( nombre_completo ) ),
        categorias ( nombre )
      `, { count: 'exact' })
      .order('actualizado_en', { ascending: false })
      .range(from, to)

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

    return new Response(JSON.stringify({ data: data ?? [], total: count ?? 0, page }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/admin/solicitudes]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
