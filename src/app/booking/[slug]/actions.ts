'use server'

import { createClient } from '@/lib/supabase/server'
import type { PosadaPublica, HabitacionDisponible } from '../types'

// ─── getPosadaBySlug ─────────────────────────────────────────────────────────

/**
 * Resuelve la configuración completa de una posada por su slug público.
 * Es el punto de entrada del sistema multi-tenant: determina qué experiencia
 * debe mostrarse al cliente final.
 */
export async function getPosadaBySlug(slug: string): Promise<PosadaPublica | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('posadas')
    .select(`
      id,
      nombre,
      descripcion,
      politicas,
      moneda_base,
      slug,
      tiene_landing_propia,
      amenidades,
      color_primario,
      color_secundario,
      logo_url,
      hero_image_url,
      galeria_urls,
      landing_settings,
      edad_max_infantes,
      edad_max_ninos
    `)
    .eq('slug', slug)
    .single()

  if (error || !data) return null

  const rawLanding = (data as any).landing_settings as Record<string, any> | null

  return {
    id: data.id,
    nombre: data.nombre,
    descripcion: data.descripcion,
    politicas: data.politicas,
    moneda_base: data.moneda_base as 'USD' | 'EUR' | 'VES',
    slug: data.slug,
    tiene_landing_propia: data.tiene_landing_propia ?? false,
    edad_max_infantes: data.edad_max_infantes ?? 3,
    edad_max_ninos: data.edad_max_ninos ?? 12,
    amenidades: data.amenidades,
    theme: {
      colorPrimario: data.color_primario ?? '#2563eb',
      colorSecundario: data.color_secundario ?? '#7c3aed',
      logoUrl: data.logo_url ?? null,
      heroImageUrl: data.hero_image_url ?? null,
      galeriaUrls: data.galeria_urls ?? [],
    },
    landing_settings: {
      hero: {
        titulo: rawLanding?.hero?.titulo ?? '',
        subtitulo: rawLanding?.hero?.subtitulo ?? '',
      },
      secciones: {
        mostrar_amenidades: rawLanding?.secciones?.mostrar_amenidades ?? true,
        mostrar_galeria: rawLanding?.secciones?.mostrar_galeria ?? true,
        mostrar_testimonios: rawLanding?.secciones?.mostrar_testimonios ?? false,
        mostrar_mapa: rawLanding?.secciones?.mostrar_mapa ?? false,
      },
      amenidades_custom: rawLanding?.amenidades_custom ?? [],
    },
  }
}

// ─── getHabitacionesDisponibles ──────────────────────────────────────────────

/**
 * Retorna las categorías de habitación disponibles para el período solicitado.
 *
 * Lógica:
 * 1. Obtiene todas las categorías con sus habitaciones (join LEFT para no perder nada).
 * 2. Filtra habitaciones con reservas solapadas confirmadas.
 * 3. Calcula precio vía RPC calcular_precio_estadia.
 *    - Si el RPC falla (sin temporada configurada), muestra la habitación con
 *      precio 0 y un flag `sin_tarifa: true` para que el UI lo indique.
 */
export async function getHabitacionesDisponibles(
  posadaId: string,
  checkIn: string,   // 'YYYY-MM-DD'
  checkOut: string,  // 'YYYY-MM-DD'
  adultos: number,
  ninos: number,
  edadesNinos: number[] = [],
): Promise<HabitacionDisponible[]> {
  const supabase = await createClient()

  // ── 0. Fetch posada edad_max_ninos e infantes ───────────────────────────────
  const { data: posadaInfo } = await supabase.from('posadas').select('edad_max_infantes, edad_max_ninos').eq('id', posadaId).single()
  const edadMaxInfantes = posadaInfo?.edad_max_infantes ?? 3
  const edadMaxNinos = posadaInfo?.edad_max_ninos ?? 12

  let adultosEfectivos = adultos
  let ninosEfectivos = 0
  let infantesEfectivos = 0

  edadesNinos.forEach(edad => {
    if (edad <= edadMaxInfantes) {
      infantesEfectivos++
    } else if (edad > edadMaxInfantes && edad <= edadMaxNinos) {
      ninosEfectivos++
    } else {
      adultosEfectivos++
    }
  })

  // Fallback si no se enviaron edades (por retrocompatibilidad o llamadas antiguas)
  if (edadesNinos.length === 0 && ninos > 0) {
    ninosEfectivos = ninos
  }

  // ── 1. Categorías de la posada ──────────────────────────────────────────────
  // Nombres reales de columnas según schema aplicado:
  //   categorias_habitacion: capacidad_max_adultos, capacidad_max_ninos (NO capacidad_max_pax)
  //   habitaciones: fotos (JSONB array, NO foto_url)
  const { data: categorias, error: catError } = await supabase
    .from('categorias_habitacion')
    .select(`
      id,
      nombre,
      descripcion,
      capacidad_base_pax,
      capacidad_max_adultos,
      capacidad_max_ninos,
      habitaciones (
        id,
        estado,
        fotos,
        servicios
      )
    `)
    .eq('posada_id', posadaId)

  if (catError) {
    console.error('[booking] Error cargando categorías:', catError.message)
    return []
  }

  if (!categorias || categorias.length === 0) {
    console.warn('[booking] No se encontraron categorías para posada:', posadaId)
    return []
  }

  // ── 2. Habitaciones con reservas solapadas ────────────────────────────────
  const { data: reservasSolapadas } = await supabase
    .from('reservas')
    .select('habitacion_id')
    .eq('posada_id', posadaId)
    .in('estado', ['confirmada', 'check-in'])
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)
    .not('habitacion_id', 'is', null)

  const habitacionesOcupadas = new Set(
    (reservasSolapadas ?? []).map((r) => r.habitacion_id)
  )

  // ── 3. Filtrar y calcular precio por categoría ──────────────────────────────
  const resultados: HabitacionDisponible[] = []

  for (const cat of categorias) {
    const habitaciones = (cat.habitaciones as any[]) ?? []

    // Habitaciones físicas disponibles (cualquier estado salvo 'mantenimiento')
    const disponibles = habitaciones.filter(
      (h) =>
        h.estado !== 'mantenimiento' &&
        !habitacionesOcupadas.has(h.id)
    )

    if (disponibles.length === 0) continue

    // Calcular precio vía RPC de temporadas
    let precioTotal: number = 0
    let sinTarifa = false

    const { data: result, error: precioError } = await supabase
      .rpc('calcular_precio_estadia', {
        p_posada_id: posadaId,
        p_categoria_id: cat.id,
        p_check_in: checkIn,
        p_check_out: checkOut,
        p_adultos: adultosEfectivos,
        p_ninos: ninosEfectivos,
      })

    let desglose = undefined;
    if (precioError) {
      // Falla cuando no hay temporadas/tarifas para ese período.
      // Mostramos igual con precio 0 y flag sinTarifa.
      console.warn(`[booking] Sin tarifa para ${cat.nombre}:`, precioError.message)
      sinTarifa = true
      precioTotal = 0
    } else {
      precioTotal = result?.total ?? 0
      desglose = result?.desglose
    }

    // Extract todas las fotos y servicios de las habitaciones disponibles
    const fotosSet = new Set<string>()
    const serviciosSet = new Set<string>()

    disponibles.forEach((h) => {
      if (Array.isArray(h.fotos)) h.fotos.forEach((f: string) => fotosSet.add(f))
      if (Array.isArray(h.servicios)) h.servicios.forEach((s: string) => serviciosSet.add(s))
    })

    // Fetch modalidad_tarifa for display purposes
    const { data: tpt } = await supabase
      .from('tarifas_por_temporada')
      .select('modalidad_tarifa')
      .eq('categoria_id', cat.id)
      .limit(1)
      .maybeSingle()

    resultados.push({
      categoria_id: cat.id,
      nombre_categoria: cat.nombre,
      descripcion: cat.descripcion,
      capacidad_base_pax: cat.capacidad_base_pax,
      capacidad_max_pax: (cat as any).capacidad_max_adultos ?? cat.capacidad_base_pax,
      fotos: Array.from(fotosSet),
      servicios: Array.from(serviciosSet),
      precio_total: precioTotal,
      desglose,
      moneda: 'USD',
      habitaciones_disponibles: disponibles.length,
      sin_tarifa: sinTarifa,
      modalidad_tarifa: tpt?.modalidad_tarifa as 'por_habitacion' | 'por_persona' | undefined,
    })
  }

  return resultados
}
