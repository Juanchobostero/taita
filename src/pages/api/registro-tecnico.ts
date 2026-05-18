import type { APIRoute } from 'astro'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const POST: APIRoute = async ({ request }) => {
  const { userId, descripcion, zona, especialidad, tarifaHora } = await request.json()

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
      tarifa_hora:    tarifaHora ?? null,
    })
    .select('id')
    .single()

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  if (especialidad && tecnico) {
    const { data: categoria } = await supabase
      .from('categorias')
      .select('id')
      .ilike('nombre', especialidad)
      .single()

    if (categoria) {
      await supabase
        .from('especialidades_tecnico')
        .insert({ tecnico_id: tecnico.id, categoria_id: categoria.id })
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
