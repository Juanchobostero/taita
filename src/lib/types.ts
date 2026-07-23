// ── Enums ─────────────────────────────────────────────────────────────────
export type UserTipo        = 'cliente' | 'tecnico' | 'admin'
export type SolicitudEstado = 'pendiente' | 'aceptada' | 'en_curso' | 'completada' | 'cancelada'

// ── Tablas base ───────────────────────────────────────────────────────────
export interface Usuario {
  id:              string
  nombre_completo: string
  email:           string
  tipo:            UserTipo
  telefono:        string | null
  foto_url:        string | null
  creado_en:       string
}

export interface Tecnico {
  id:                   string
  usuario_id:           string
  descripcion:          string | null
  zona_cobertura:       string | null
  tarifa_hora:          number | null
  calificacion_promedio: number
  total_servicios:      number
  activo:               boolean
  nick:                 string | null
  mostrar_nombre:       boolean
}

export interface Categoria {
  id:               string
  nombre:           string
  icono:            string | null
  imagen_url:       string | null
  porcentaje_tasa:  number
  activa:           boolean
}

export interface Solicitud {
  id:                  string
  cliente_id:          string
  tecnico_id:          string | null
  categoria_id:        string
  titulo:              string
  descripcion:         string | null
  horas_estimadas:     number | null
  precio_base:         number | null
  tasa_aplicada:       number | null
  total_estimado:      number | null
  fecha_solicitada:    string | null
  hora_solicitada:     string | null
  direccion:           string | null
  estado:              SolicitudEstado
  creado_en:           string
  gastos_extra:        number | null
  descripcion_gastos:  string | null
  imagenes_trabajo:    string[] | null
}

export interface Resena {
  id:          string
  solicitud_id: string
  cliente_id:  string
  tecnico_id:  string
  calificacion: number
  comentario:  string | null
  creado_en:   string
}

// ── Tipos compuestos (con joins) ──────────────────────────────────────────
export interface TecnicoConUsuario extends Tecnico {
  usuarios: Pick<Usuario, 'nombre_completo' | 'telefono' | 'foto_url'>
  especialidades_tecnico: {
    categorias: Pick<Categoria, 'id' | 'nombre' | 'icono'>
  }[]
}

export interface SolicitudConRelaciones extends Solicitud {
  tecnicos: {
    usuarios: Pick<Usuario, 'nombre_completo'>
  }
  categorias: Pick<Categoria, 'nombre' | 'icono'>
}

export interface SolicitudParaTecnico extends Solicitud {
  usuarios: Pick<Usuario, 'nombre_completo' | 'telefono'>
  categorias: Pick<Categoria, 'nombre' | 'icono'>
}

export interface ResenaConAutor extends Resena {
  usuarios: Pick<Usuario, 'nombre_completo'>
}

// ── Interfaz para FiltroTecnicos (compatible con mock) ────────────────────
export interface TecnicoDisplay {
  id:          string
  nombre:      string
  especialidad: string
  categoria:   string   // slug para filtrado
  calificacion: number
  resenas:     number
  descripcion: string
  zona:        string
  tarifa:      number
  disponible:  boolean
  habilidades:    string[]
  foto_url:       string | null
  nick:           string | null
  mostrar_nombre: boolean
  nombre_display: string
}

// ── Helper: slug de categoría ─────────────────────────────────────────────
export function toSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export function tecnicoToDisplay(t: TecnicoConUsuario): TecnicoDisplay {
  const primaria = t.especialidades_tecnico[0]?.categorias
  const nick     = (t as any).nick as string | null
  const mostrarNombre = (t as any).mostrar_nombre as boolean ?? true
  return {
    id:             t.id,
    nombre:         t.usuarios.nombre_completo,
    nick:           nick ?? null,
    mostrar_nombre: mostrarNombre,
    nombre_display: nick || t.usuarios.nombre_completo,
    especialidad:   primaria?.nombre ?? 'Servicio general',
    categoria:      toSlug(primaria?.nombre ?? ''),
    calificacion:   Number(t.calificacion_promedio),
    resenas:        t.total_servicios,
    descripcion:    t.descripcion ?? 'Técnico especializado.',
    zona:           t.zona_cobertura ?? '',
    tarifa:         Number(t.tarifa_hora ?? 0),
    disponible:     t.activo,
    foto_url:       t.usuarios.foto_url ?? null,
    habilidades:    t.especialidades_tecnico
      .map(e => e.categorias?.nombre)
      .filter((n): n is string => Boolean(n)),
  }
}
