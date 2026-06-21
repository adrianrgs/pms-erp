// Tipos y constantes del Configurador de Landing Page.
// Este archivo NO tiene 'use server' — puede exportar cualquier valor.

export interface AmenidadCustom {
  id: string
  icono: string
  nombre: string
}

export interface LandingSettings {
  hero: {
    titulo: string
    subtitulo: string
  }
  secciones: {
    mostrar_amenidades: boolean
    mostrar_galeria: boolean
    mostrar_testimonios: boolean
    mostrar_mapa: boolean
  }
  amenidades_custom: AmenidadCustom[]
}

export interface PosadaLandingData {
  id: string
  nombre: string
  slug: string | null
  color_primario: string
  color_secundario: string
  logo_url: string | null
  hero_image_url: string | null
  galeria_urls: string[]
  landing_settings: LandingSettings
}

export const DEFAULT_LANDING_SETTINGS: LandingSettings = {
  hero: {
    titulo: '',
    subtitulo: '',
  },
  secciones: {
    mostrar_amenidades: true,
    mostrar_galeria: true,
    mostrar_testimonios: false,
    mostrar_mapa: false,
  },
  amenidades_custom: [],
}
