import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'

export const POST: APIRoute = async ({ request, cookies }) => {
  const { accion, tecnicoId, categoriaId } = await request.json()

  if (!accion || !tecnicoId || !categoriaId) {
    return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
  }

  const supabaseUser = createSupabaseServer({ request, cookies })
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

  const supabase = createSupabaseAdmin()

  // Verificar que el tecnico pertenece al usuario
  const { data: tec } = await supabase
    .from('tecnicos')
    .select('id')
    .eq('id', tecnicoId)
    .eq('usuario_id', user.id)
    .single()

  if (!tec) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 })

  if (accion === 'agregar') {
    const { error } = await supabase
      .from('especialidades_tecnico')
      .insert({ tecnico_id: tecnicoId, categoria_id: categoriaId })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (accion === 'quitar') {
    const { error } = await supabase
      .from('especialidades_tecnico')
      .delete()
      .eq('tecnico_id', tecnicoId)
      .eq('categoria_id', categoriaId)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
