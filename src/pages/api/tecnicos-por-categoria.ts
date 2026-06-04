import type { APIRoute } from 'astro'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const GET: APIRoute = async ({ url }) => {
  const categoriaId = url.searchParams.get('categoria_id')
  if (!categoriaId) {
    return new Response(JSON.stringify({ error: 'categoria_id requerido' }), { status: 400 })
  }

  const supabase = createSupabaseAdmin()

  const { data, error } = await supabase
    .from('tecnicos')
    .select(`
      id,
      calificacion_promedio,
      total_servicios,
      nick,
      mostrar_nombre,
      zona_cobertura,
      usuarios!inner ( nombre_completo, foto_url ),
      especialidades_tecnico!inner ( categoria_id )
    `)
    .eq('activo', true)
    .eq('especialidades_tecnico.categoria_id', categoriaId)
    .order('calificacion_promedio', { ascending: false })
    .order('total_servicios', { ascending: false })
    .limit(10)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const tecnicos = (data ?? []).map((t: any) => ({
    id:                   t.id,
    nombre_display:       t.nick || t.usuarios.nombre_completo,
    foto_url:             t.usuarios.foto_url ?? null,
    calificacion_promedio: Number(t.calificacion_promedio),
    total_servicios:      t.total_servicios,
    zona:                 t.zona_cobertura ?? '',
  }))

  return new Response(JSON.stringify({ tecnicos }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
