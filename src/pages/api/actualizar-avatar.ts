import type { APIRoute } from 'astro'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin }  from '@/lib/supabase-admin'

export const POST: APIRoute = async ({ request, cookies }) => {
  const { foto_url } = await request.json()
  if (!foto_url) return new Response(JSON.stringify({ error: 'URL requerida' }), { status: 400 })

  const supabaseUser = createSupabaseServer({ request, cookies })
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

  const { error } = await createSupabaseAdmin()
    .from('usuarios')
    .update({ foto_url })
    .eq('id', user.id)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
