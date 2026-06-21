// Tipos del sistema de temas White-label para el motor de reservas público

export interface AmenidadLanding {
  id: string
  icono: string
  nombre: string
}

export interface LandingSettings {
  hero: { titulo: string; subtitulo: string }
  secciones: {
    mostrar_amenidades: boolean
    mostrar_galeria: boolean
    mostrar_testimonios: boolean
    mostrar_mapa: boolean
  }
  amenidades_custom: AmenidadLanding[]
}

export interface PosadaTheme {
  colorPrimario: string
  colorSecundario: string
  logoUrl: string | null
  heroImageUrl: string | null
  galeriaUrls: string[]
}

export interface PosadaPublica {
  id: string
  nombre: string
  descripcion: string | null
  politicas: string | null
  moneda_base: 'USD' | 'EUR' | 'VES'
  slug: string
  tiene_landing_propia: boolean
  edad_max_infantes: number
  edad_max_ninos: number
  amenidades: {
    wifi?: boolean
    desayuno?: boolean
    piscina?: boolean
    parking?: boolean
    [key: string]: boolean | undefined
  } | null
  theme: PosadaTheme
  landing_settings: LandingSettings
}

export interface HabitacionDisponible {
  categoria_id: string
  nombre_categoria: string
  descripcion: string | null
  capacidad_base_pax: number
  capacidad_max_pax: number
  fotos: string[]
  servicios: string[]
  precio_total: number
  desglose?: { base: number, adultos_extra: number, ninos: number }
  moneda: string
  habitaciones_disponibles: number
  /** true cuando no hay temporadas/tarifas configuradas para ese período */
  sin_tarifa?: boolean
  modalidad_tarifa?: 'por_habitacion' | 'por_persona'
}

export interface ReservaSeleccion {
  categoriaId: string
  nombreCategoria: string
  fotoUrl: string | null
  checkIn: Date
  checkOut: Date
  adultos: number
  ninos: number
  precioTotal: number
  moneda: string
  noches: number
}
