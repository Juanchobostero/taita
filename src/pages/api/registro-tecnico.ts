import type { APIRoute } from 'astro'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const POST: APIRoute = async ({ request }) => {
  const { userId, descripcion, zona, especialidades, cvu } = await request.json()

  if (!userId || !descripcion || !zona) {
    return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
  }

  const supabase = createSupabaseAdmin()

  const { data: tecnico, error } = await supabase
    .from('tecnicos')
    .insert({
      usuario_id:     userId,
      descripcion,
      zona_cobertura: zona,
      activo:         false,
      cvu:            cvu ?? null,
    })
    .select('id')
    .single()

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  if (Array.isArray(especialidades) && especialidades.length > 0 && tecnico) {
    const { data: categorias } = await supabase
      .from('categorias')
      .select('id, nombre')
      .in('nombre', especialidades)

    if (categorias?.length) {
      await supabase
        .from('especialidades_tecnico')
        .insert(categorias.map(c => ({ tecnico_id: tecnico.id, categoria_id: c.id })))
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
