import type { APIRoute } from 'astro'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const POST: APIRoute = async ({ request }) => {
  const { userId, telefono, descripcion, zona, especialidades, subcategorias, cvu, nick, mostrarNombre } = await request.json()

  if (!userId || !descripcion || !zona || !cvu) {
    return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 })
  }

  const supabase = createSupabaseAdmin()

  if (telefono) {
    await supabase.from('usuarios').update({ telefono }).eq('id', userId)
  }

  const { data: tecnico, error } = await supabase
    .from('tecnicos')
    .insert({
      usuario_id:     userId,
      descripcion,
      zona_cobertura: zona,
      activo:         false,
      cvu:            cvu ?? null,
      nick:           nick ?? null,
      mostrar_nombre: mostrarNombre ?? true,
    })
    .select('id')
    .single()

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  // `especialidades` llega como un array de `id` de categoría (no de nombres) — ver comentario en
  // RegistroForm.tsx. `subcategorias` viene keyeado por esos mismos `id`.
  if (Array.isArray(especialidades) && especialidades.length > 0 && tecnico) {
    const { data: categorias } = await supabase
      .from('categorias')
      .select('id, nombre')
      .in('id', especialidades)

    if (categorias?.length) {
      await supabase
        .from('especialidades_tecnico')
        .insert(categorias.map(c => {
          const subs = (subcategorias?.[c.id] ?? [])
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)
          return {
            tecnico_id:    tecnico.id,
            categoria_id:  c.id,
            subcategorias: subs.length ? subs : null,
          }
        }))
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
