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

    // Borra un cliente o técnico por completo (perfil + login). Solo si no tiene ningún historial
    // real asociado — solicitudes, reseñas, o cambios de estado que haya disparado — para no
    // perder ese registro. Si tiene historial, se bloquea y se sugiere desactivar en su lugar
    // (pedido de Agustín: "poder eliminar usuarios").
    else if (accion === 'eliminar-usuario') {
      const { usuarioId } = body
      if (!usuarioId) return new Response(JSON.stringify({ error: 'usuarioId requerido' }), { status: 400 })

      const { data: objetivo } = await supabase.from('usuarios').select('tipo').eq('id', usuarioId).single()
      if (!objetivo) return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404 })

      let tecnicoRowId: string | null = null
      const checks: Promise<{ count: number | null }>[] = [
        supabase.from('solicitud_historial_estados').select('*', { count: 'exact', head: true }).eq('cambiado_por', usuarioId),
      ]

      if (objetivo.tipo === 'cliente') {
        checks.push(
          supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('cliente_id', usuarioId),
          supabase.from('resenas').select('*', { count: 'exact', head: true }).eq('cliente_id', usuarioId),
        )
      } else if (objetivo.tipo === 'tecnico') {
        const { data: tec } = await supabase.from('tecnicos').select('id').eq('usuario_id', usuarioId).single()
        tecnicoRowId = tec?.id ?? null
        if (tecnicoRowId) {
          checks.push(
            supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('tecnico_id', tecnicoRowId),
            supabase.from('resenas').select('*', { count: 'exact', head: true }).eq('tecnico_id', tecnicoRowId),
          )
        }
      }

      const resultados  = await Promise.all(checks)
      const tieneHistorial = resultados.some(r => (r.count ?? 0) > 0)

      if (tieneHistorial) {
        return new Response(JSON.stringify({
          error: objetivo.tipo === 'tecnico'
            ? 'No se puede eliminar: tiene solicitudes, reseñas o cambios de estado asociados. Desactivalo en su lugar para sacarlo de circulación.'
            : 'No se puede eliminar: tiene solicitudes o reseñas asociadas — se perdería ese historial.',
        }), { status: 409 })
      }

      // Orden importa: primero la fila de `tecnicos` (por si acaso no tuviera ON DELETE CASCADE
      // desde `usuarios`), después el perfil, y por último el login en Supabase Auth.
      if (tecnicoRowId) {
        const { error } = await supabase.from('tecnicos').delete().eq('id', tecnicoRowId)
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }

      const { error: errUsuario } = await supabase.from('usuarios').delete().eq('id', usuarioId)
      if (errUsuario) return new Response(JSON.stringify({ error: errUsuario.message }), { status: 500 })

      const { error: errAuth } = await supabase.auth.admin.deleteUser(usuarioId)
      if (errAuth) console.error('[eliminar-usuario] usuario borrado del perfil pero no de Auth:', errAuth.message)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('[api/admin/usuario]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
