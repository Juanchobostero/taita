import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'
import { notificarMensajeCotizacion } from '@/lib/notificaciones'

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const body = await request.json()
    const { solicitudId, mensaje, imagenes } = body
    if (!solicitudId || !mensaje?.trim()) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    const { data: self } = await supabase.from('usuarios').select('tipo').eq('id', user.id).single()
    const esAdmin = self?.tipo === 'admin'

    if (!esAdmin) {
      const { data: sol } = await supabase.from('solicitudes').select('cliente_id').eq('id', solicitudId).single()
      if (!sol || sol.cliente_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403 })
      }
    }

    const { data: nuevoMensaje, error } = await supabase
      .from('cotizacion_mensajes')
      .insert({
        solicitud_id: solicitudId,
        usuario_id:   user.id,
        mensaje:      mensaje.trim(),
        imagenes:     Array.isArray(imagenes) && imagenes.length ? imagenes : null,
      })
      .select('id, usuario_id, mensaje, imagenes, creado_en')
      .single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

    try {
      await notificarMensajeCotizacion(supabase, solicitudId, esAdmin, mensaje.trim())
    } catch (err) {
      console.error('[api/cotizacion/mensaje] error notificando:', err)
    }

    return new Response(JSON.stringify({ ok: true, mensaje: nuevoMensaje }), { status: 200 })
  } catch (err) {
    console.error('[api/cotizacion/mensaje]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
