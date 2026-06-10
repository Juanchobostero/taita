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

    const body = await request.json()
    const { accion } = body

    if (accion === 'editar-usuario') {
      const { usuarioId, nombre_completo, telefono } = body
      if (!usuarioId) return new Response(JSON.stringify({ error: 'usuarioId requerido' }), { status: 400 })
      const updates: Record<string, unknown> = {}
      if (nombre_completo !== undefined) updates.nombre_completo = nombre_completo.trim()
      if (telefono !== undefined) updates.telefono = telefono?.trim() || null
      const { error } = await supabase.from('usuarios').update(updates).eq('id', usuarioId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    else if (accion === 'editar-tecnico') {
      const { tecnicoId, descripcion, zona_cobertura, tarifa_hora, nick, mostrar_nombre } = body
      if (!tecnicoId) return new Response(JSON.stringify({ error: 'tecnicoId requerido' }), { status: 400 })
      const updates: Record<string, unknown> = {}
      if (descripcion    !== undefined) updates.descripcion    = descripcion?.trim() || null
      if (zona_cobertura !== undefined) updates.zona_cobertura = zona_cobertura?.trim() || null
      if (tarifa_hora    !== undefined) updates.tarifa_hora    = tarifa_hora ? parseFloat(tarifa_hora) : null
      if (nick           !== undefined) updates.nick           = nick?.trim() || null
      if (mostrar_nombre !== undefined) updates.mostrar_nombre = Boolean(mostrar_nombre)
      const { error } = await supabase.from('tecnicos').update(updates).eq('id', tecnicoId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    else if (accion === 'toggle-activo-tecnico') {
      const { tecnicoId, activo } = body
      if (!tecnicoId) return new Response(JSON.stringify({ error: 'tecnicoId requerido' }), { status: 400 })
      const nuevoActivo = activo === true ? false : true
      const { error } = await supabase.from('tecnicos').update({ activo: nuevoActivo }).eq('id', tecnicoId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify({ ok: true, activo: nuevoActivo }), { status: 200 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[api/admin/usuario]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
