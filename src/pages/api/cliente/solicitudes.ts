import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'

const PAGE_SIZE = 5

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const supabase = createSupabaseAdmin()

    const pageParam = parseInt(url.searchParams.get('page') ?? '1', 10)
    const page      = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
    const from      = (page - 1) * PAGE_SIZE
    const to        = from + PAGE_SIZE - 1

    // Filtros seleccionables (búsqueda por estado/categoría, no de texto) — ver FiltrosSolicitudes.tsx
    const estados     = url.searchParams.get('estados')?.split(',').filter(Boolean)
    const categoriaId = url.searchParams.get('categoriaId')

    let query = supabase
      .from('solicitudes')
      .select(`
        id, numero, titulo, descripcion, estado, direccion, tecnico_id,
        precio_base, tasa_aplicada, total_estimado, fecha_solicitada, hora_solicitada, creado_en,
        tecnicos ( usuarios ( nombre_completo ) ),
        categorias ( nombre, icono ),
        resenas ( id )
      `, { count: 'exact' })
      .eq('cliente_id', user.id)

    if (estados?.length) query = query.in('estado', estados)
    if (categoriaId)     query = query.eq('categoria_id', categoriaId)

    const { data, count, error } = await query
      .order('actualizado_en', { ascending: false })
      .range(from, to)

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

    return new Response(JSON.stringify({ data: data ?? [], total: count ?? 0, page }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/cliente/solicitudes]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
