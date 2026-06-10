import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'

export const GET: APIRoute = async ({ url, request, cookies }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const supabase = createSupabaseAdmin()
    const { data: self } = await supabase.from('usuarios').select('tipo').eq('id', user.id).single()
    if (self?.tipo !== 'admin') return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403 })

    const categoriaId = url.searchParams.get('categoria_id')
    if (!categoriaId) return new Response(JSON.stringify({ error: 'categoria_id requerido' }), { status: 400 })

    const { data, error } = await supabase
      .from('categoria_subitems')
      .select('id, nombre, precio, porcentaje_tasa, activo')
      .eq('categoria_id', categoriaId)
      .order('nombre')

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    return new Response(JSON.stringify({ subitems: data ?? [] }), { status: 200 })
  } catch (err) {
    console.error('[api/admin/categoria-subitem GET]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const supabase = createSupabaseAdmin()
    const { data: self } = await supabase.from('usuarios').select('tipo').eq('id', user.id).single()
    if (self?.tipo !== 'admin') return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403 })

    const body = await request.json()
    const { accion } = body

    if (accion === 'crear') {
      const { categoriaId, nombre } = body
      if (!categoriaId || !nombre?.trim()) {
        return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
      }
      const { data, error } = await supabase
        .from('categoria_subitems')
        .insert({ categoria_id: categoriaId, nombre: nombre.trim(), precio: null, porcentaje_tasa: 0, activo: true })
        .select('id, nombre, precio, porcentaje_tasa, activo')
        .single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify({ ok: true, subitem: data }), { status: 200 })
    }

    if (accion === 'editar') {
      const { subitemId, nombre, precio, porcentaje } = body
      if (!subitemId) return new Response(JSON.stringify({ error: 'subitemId requerido' }), { status: 400 })
      const { error } = await supabase
        .from('categoria_subitems')
        .update({
          nombre:          nombre?.trim() || undefined,
          precio:          precio != null ? (parseFloat(precio) || null) : null,
          porcentaje_tasa: parseFloat(porcentaje) || 0,
        })
        .eq('id', subitemId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    else if (accion === 'toggle') {
      const { subitemId, activo } = body
      if (!subitemId) return new Response(JSON.stringify({ error: 'subitemId requerido' }), { status: 400 })
      const nuevoActivo = activo === true ? false : true
      const { error } = await supabase
        .from('categoria_subitems')
        .update({ activo: nuevoActivo })
        .eq('id', subitemId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify({ ok: true, activo: nuevoActivo }), { status: 200 })
    }

    else if (accion === 'eliminar') {
      const { subitemId } = body
      if (!subitemId) return new Response(JSON.stringify({ error: 'subitemId requerido' }), { status: 400 })
      const { error } = await supabase.from('categoria_subitems').delete().eq('id', subitemId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[api/admin/categoria-subitem POST]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
