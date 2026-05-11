export interface Tecnico {
  id: string
  nombre: string
  especialidad: string
  categoria: string
  calificacion: number
  resenas: number
  descripcion: string
  zona: string
  tarifa: number
  experiencia: string
  disponible: boolean
  habilidades: string[]
}

export const mockTecnicos: Tecnico[] = [
  {
    id: '1',
    nombre: 'Carlos Méndez',
    especialidad: 'Carpintero / Armado de muebles',
    categoria: 'armado-muebles',
    calificacion: 4.9,
    resenas: 47,
    descripcion: 'Carpintero con más de 8 años de experiencia. Armado de muebles de todo tipo, estanterías, cocinas y placares. Trabajo prolijo y garantizado.',
    zona: 'Centro / Belgrano',
    tarifa: 3500,
    experiencia: '8 años',
    disponible: true,
    habilidades: ['Armado Ikea/Easy', 'Muebles a medida', 'Placares', 'Instalación TV'],
  },
  {
    id: '2',
    nombre: 'María González',
    especialidad: 'Técnica en Refrigeración',
    categoria: 'refrigeracion',
    calificacion: 4.8,
    resenas: 34,
    descripcion: 'Especialista en aire acondicionado y heladeras. Certificada por los principales fabricantes. Atención rápida y garantía en todos los trabajos.',
    zona: 'Nuevo Pompeya / San Martín',
    tarifa: 4000,
    experiencia: '6 años',
    disponible: true,
    habilidades: ['Split', 'Heladeras', 'Cámara frigorífica', 'Carga de gas'],
  },
  {
    id: '3',
    nombre: 'Roberto Acuña',
    especialidad: 'Servicio de Mudanzas',
    categoria: 'mudanzas',
    calificacion: 4.7,
    resenas: 28,
    descripcion: 'Servicio de mudanzas para toda la ciudad. Camión propio, carga y descarga cuidadosa. Experiencia en mudanzas residenciales y comerciales.',
    zona: 'Laguna Seca / Cambá Cuá',
    tarifa: 3000,
    experiencia: '10 años',
    disponible: false,
    habilidades: ['Mudanzas locales', 'Embalaje', 'Carga pesada', 'Guardamuebles'],
  },
  {
    id: '4',
    nombre: 'Lucía Romero',
    especialidad: 'Limpieza del hogar',
    categoria: 'limpieza',
    calificacion: 5.0,
    resenas: 61,
    descripcion: 'Servicio de limpieza profunda y mantenimiento del hogar. Puntual, confiable y con excelentes referencias.',
    zona: 'Centro / Costanera',
    tarifa: 2500,
    experiencia: '5 años',
    disponible: true,
    habilidades: ['Limpieza profunda', 'Mantenimiento', 'Ventanas', 'Alfombras'],
  },
  {
    id: '5',
    nombre: 'Diego Ferreyra',
    especialidad: 'Fumigador / Control de plagas',
    categoria: 'fumigacion',
    calificacion: 4.6,
    resenas: 19,
    descripcion: 'Especialista en control de plagas para hogares y comercios. Productos habilitados y seguros para mascotas y niños. Garantía de efectividad de 3 meses.',
    zona: 'Libertad / San Benito',
    tarifa: 4500,
    experiencia: '4 años',
    disponible: true,
    habilidades: ['Cucarachas', 'Termitas', 'Roedores', 'Mosquitos'],
  },
  {
    id: '6',
    nombre: 'Ana Fernández',
    especialidad: 'Limpieza profunda',
    categoria: 'limpieza',
    calificacion: 4.8,
    resenas: 42,
    descripcion: 'Servicio de limpieza profunda, post-obra y fin de alquiler. Trabajo en equipo para mayor eficiencia y rapidez.',
    zona: 'Toda la ciudad',
    tarifa: 3200,
    experiencia: '7 años',
    disponible: true,
    habilidades: ['Post-obra', 'Fin de alquiler', 'Alfombras', 'Ventanas'],
  },
  {
    id: '7',
    nombre: 'Horacio Leiva',
    especialidad: 'Carpintero / Reparaciones en madera',
    categoria: 'armado-muebles',
    calificacion: 4.5,
    resenas: 15,
    descripcion: 'Carpintero con 12 años de experiencia en reparación y fabricación de muebles. Puertas, ventanas y cocinas a medida.',
    zona: 'Barranqueras / Resistencia',
    tarifa: 3800,
    experiencia: '12 años',
    disponible: true,
    habilidades: ['Puertas', 'Ventanas', 'Cocinas', 'Reparaciones'],
  },
  {
    id: '8',
    nombre: 'Patricia Salinas',
    especialidad: 'Jardinera / Paisajista',
    categoria: 'jardineria',
    calificacion: 4.9,
    resenas: 33,
    descripcion: 'Diseño de jardines, mantenimiento y poda. Especializada en plantas de la región del NEA.',
    zona: 'Toda la ciudad',
    tarifa: 2800,
    experiencia: '9 años',
    disponible: true,
    habilidades: ['Diseño', 'Poda', 'Riego', 'Plantas NEA'],
  },
]
