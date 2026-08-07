import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const supabase = createSupabaseAdmin()

    const { data: tecnico } = await supabase.from('tecnicos').select('id').eq('usuario_id', user.id).single()
    if (!tecnico) return new Response(JSON.stringify({ error: 'No sos técnico' }), { status: 403 })

    // Filtros seleccionables (búsqueda por estado/categoría, no de texto) — ver FiltrosSolicitudes.tsx
    const estados     = url.searchParams.get('estados')?.split(',').filter(Boolean)
    const categoriaId = url.searchParams.get('categoriaId')

    let query = supabase
      .from('solicitudes')
      .select(`
        id, numero, titulo, estado, total_estimado, precio_base, tasa_aplicada,
        gastos_extra, descripcion_gastos, imagenes_trabajo,
        conformidad_cliente,
        fecha_solicitada, hora_solicitada, creado_en, direccion,
        usuarios!cliente_id ( nombre_completo, telefono ),
        categorias ( nombre, icono ),
        pagos ( estado, creado_en )
      `)
      .eq('tecnico_id', tecnico.id)

    if (estados?.length) query = query.in('estado', estados)
    if (categoriaId)     query = query.eq('categoria_id', categoriaId)

    const { data, error } = await query
      .order('actualizado_en', { ascending: false })
      .limit(20)

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

    return new Response(JSON.stringify({ data: data ?? [] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/tecnico/solicitudes]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
