import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabaseUser = createSupabaseServer({ request, cookies })
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

  const supabase = createSupabaseAdmin()
  const { data: self } = await supabase.from('usuarios').select('tipo').eq('id', user.id).single()
  if (self?.tipo !== 'admin') return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403 })

  const body = await request.json()
  const { accion } = body

  if (accion === 'editar') {
    const { catId, nombre, icono, porcentaje, precio_base, imagen_url } = body
    if (!catId || !nombre) return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
    const { error } = await supabase.from('categorias')
      .update({ nombre, icono: icono || null, porcentaje_tasa: porcentaje ?? 0, precio_base: precio_base ?? null, imagen_url: imagen_url ?? null })
      .eq('id', catId)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  else if (accion === 'toggle') {
    const { catId, activa } = body
    if (!catId) return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
    const { error } = await supabase.from('categorias').update({ activa: !activa }).eq('id', catId)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  else if (accion === 'eliminar') {
    const { catId } = body
    if (!catId) return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
    const { error } = await supabase.from('categorias').delete().eq('id', catId)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  else if (accion === 'crear') {
    const { nombre, icono, porcentaje, precio_base } = body
    if (!nombre) return new Response(JSON.stringify({ error: 'Nombre requerido' }), { status: 400 })
    const { data, error } = await supabase.from('categorias')
      .insert({ nombre, icono: icono || null, porcentaje_tasa: porcentaje ?? 0, precio_base: precio_base ?? null, imagen_url: null, activa: true })
      .select('id, nombre, icono, imagen_url, porcentaje_tasa, precio_base, activa')
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    return new Response(JSON.stringify({ ok: true, categoria: data }), { status: 200 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
