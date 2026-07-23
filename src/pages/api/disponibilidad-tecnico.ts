import type { APIRoute } from 'astro'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { chequearDisponibilidad } from '@/lib/disponibilidad'

export const GET: APIRoute = async ({ url }) => {
  const tecnicoId      = url.searchParams.get('tecnicoId')
  const fecha          = url.searchParams.get('fecha')
  const hora           = url.searchParams.get('hora')
  const horasEstimadas = parseFloat(url.searchParams.get('horasEstimadas') ?? '')

  if (!tecnicoId || !fecha || !hora || !horasEstimadas) {
    return new Response(JSON.stringify({ error: 'Parámetros incompletos' }), { status: 400 })
  }

  const supabase   = createSupabaseAdmin()
  const resultado  = await chequearDisponibilidad(supabase, { tecnicoId, fecha, hora, horasEstimadas })

  return new Response(JSON.stringify(resultado), { status: 200 })
}
