import type { SupabaseClient } from '@supabase/supabase-js'

// Franja laboral en la que se buscan horarios libres para sugerir.
const HORA_INICIO_MIN = 8 * 60   // 08:00
const HORA_FIN_MIN     = 20 * 60  // 20:00
const PASO_MIN         = 30
const DIAS_A_BUSCAR    = 14

// Estados en los que una solicitud realmente "ocupa" la agenda del técnico.
const ESTADOS_OCUPAN = ['aceptada', 'asignada', 'en_curso']

function minutosDesdeHora(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

function horaDesdeMinutos(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().split('T')[0]
}

interface ChequeoParams {
  tecnicoId:           string
  fecha:               string  // 'YYYY-MM-DD'
  hora:                string  // 'HH:MM'
  excluirSolicitudId?: string  // para no chocar contra sí misma al reasignar
}

export interface ResultadoDisponibilidad {
  disponible: boolean
  sugerido?: { fecha: string; hora: string }
}

// Sin una duración de trabajo conocida (se sacó el campo "horas estimadas" a pedido del cliente —
// los trabajos se van a medir por m² u otra métrica, no por horas), el choque de agenda pasa a ser
// simple: mismo técnico + misma fecha + misma hora exacta. Dos horarios distintos (aunque sean
// consecutivos, ej. 10:00 y 10:30) no se consideran conflicto.
async function horasOcupadasDelDia(
  supabase: SupabaseClient,
  tecnicoId: string,
  fecha: string,
  excluirSolicitudId?: string,
): Promise<Set<string>> {
  let query = supabase
    .from('solicitudes')
    .select('id, hora_solicitada')
    .eq('tecnico_id', tecnicoId)
    .eq('fecha_solicitada', fecha)
    .in('estado', ESTADOS_OCUPAN)
    .not('hora_solicitada', 'is', null)

  if (excluirSolicitudId) query = query.neq('id', excluirSolicitudId)

  const { data } = await query
  return new Set((data ?? []).map(s => (s.hora_solicitada as string).slice(0, 5)))
}

/** Chequea si el técnico está libre en esa fecha/hora; si no, sugiere el próximo horario libre. */
export async function chequearDisponibilidad(
  supabase: SupabaseClient,
  params: ChequeoParams,
): Promise<ResultadoDisponibilidad> {
  const { tecnicoId, hora, excluirSolicitudId } = params
  // fecha_solicitada es timestamptz en la base — puede llegar como "2026-07-28" (de un <input
  // type="date">) o como "2026-07-28T00:00:00+00:00" (leído directo de Supabase). Nos quedamos
  // siempre con la parte de fecha, sea cual sea el formato de entrada.
  const fecha    = params.fecha.slice(0, 10)
  const horaBusc = hora.slice(0, 5)

  const ocupadas = await horasOcupadasDelDia(supabase, tecnicoId, fecha, excluirSolicitudId)
  if (!ocupadas.has(horaBusc)) return { disponible: true }

  // Buscar el próximo horario libre: mismo día desde la hora pedida, después cualquier hora
  // dentro del horario laboral en los próximos días.
  const inicioMin = minutosDesdeHora(horaBusc)
  for (let dia = 0; dia < DIAS_A_BUSCAR; dia++) {
    const fechaProbar = dia === 0 ? fecha : sumarDias(fecha, dia)
    const ocupadasDia = dia === 0 ? ocupadas : await horasOcupadasDelDia(supabase, tecnicoId, fechaProbar, excluirSolicitudId)
    const desdeMin    = dia === 0 ? inicioMin + PASO_MIN : HORA_INICIO_MIN

    for (let min = desdeMin; min < HORA_FIN_MIN; min += PASO_MIN) {
      const horaProbar = horaDesdeMinutos(min)
      if (!ocupadasDia.has(horaProbar)) return { disponible: false, sugerido: { fecha: fechaProbar, hora: horaProbar } }
    }
  }

  return { disponible: false }
}

/** Franjas de 30' entre 08:00 y 19:30 para mostrar en el selector de hora. */
export function franjasHorarias(): string[] {
  const franjas: string[] = []
  for (let min = HORA_INICIO_MIN; min < HORA_FIN_MIN; min += PASO_MIN) franjas.push(horaDesdeMinutos(min))
  return franjas
}
