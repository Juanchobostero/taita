import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'

export const GET: APIRoute = async ({ url, request, cookies }) => {
  try {
    const supabaseUser = createSupabaseServer({ request, cookies })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

    const solicitudId = url.searchParams.get('solicitudId')
    if (!solicitudId) return new Response(JSON.stringify({ error: 'solicitudId requerido' }), { status: 400 })

    const supabase = createSupabaseAdmin()

    const { data: self } = await supabase.from('usuarios').select('tipo').eq('id', user.id).single()
    const esAdmin = self?.tipo === 'admin'

    if (!esAdmin) {
      const { data: sol } = await supabase.from('solicitudes').select('cliente_id').eq('id', solicitudId).single()
      if (!sol || sol.cliente_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403 })
      }
    }

    const { data, error } = await supabase
      .from('cotizacion_mensajes')
      .select('id, usuario_id, mensaje, imagenes, creado_en, usuarios ( nombre_completo, tipo )')
      .eq('solicitud_id', solicitudId)
      .order('creado_en', { ascending: true })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    return new Response(JSON.stringify({ mensajes: data ?? [] }), { status: 200 })
  } catch (err) {
    console.error('[api/cotizacion/mensajes]', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 })
  }
}
