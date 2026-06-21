'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SearchResult = {
  posada_id: string
  posada_nombre: string
  posada_moneda: string
  categoria_id: string
  categoria_nombre: string
  habitacion_id: string
  habitacion_nombre: string
  descripcion: string
  servicios: string[]
  fotos: string[]
  precio_total: number
  capacidad_base: number
  comision_detalle?: Record<string, number>
}

export async function buscarDisponibilidad(check_in: string, check_out: string, adultos: number, ninos: number, posadas_ids?: string[], edadesNinos: number[] = []) {
  const supabase = await createClient()

  if (!check_in || !check_out) throw new Error("Faltan fechas")
  
  const d1 = new Date(check_in)
  const d2 = new Date(check_out)
  if (d1 >= d2) throw new Error("El Check-out debe ser posterior al Check-in")

  // 1. Get all categories with sufficient capacity
  let query = supabase
    .from('categorias_habitacion')
    .select(`
      id, nombre, capacidad_base_pax, capacidad_max_adultos, capacidad_max_ninos, posada_id,
      posadas (nombre, moneda_base, edad_max_infantes, edad_max_ninos)
    `)
    .gte('capacidad_max_adultos', adultos)
    .gte('capacidad_max_ninos', ninos)

  if (posadas_ids && posadas_ids.length > 0) {
    query = query.in('posada_id', posadas_ids)
  }

  const { data: categorias, error: catError } = await query
  
  if (catError) throw new Error(catError.message)
  if (!categorias || categorias.length === 0) return { results: [], servicios: [] }

  const posadasIds = Array.from(new Set(categorias.map(c => c.posada_id)))
  const results: SearchResult[] = []
  
  // Fetch seasons, rates and services
  const [tempRes, tarifasRes, servRes] = await Promise.all([
    supabase.from('temporadas').select('*').in('posada_id', posadasIds),
    supabase.from('tarifas_por_temporada').select('*'),
    supabase.from('servicios').select('*').in('posada_id', posadasIds).eq('estado', 'activo')
  ])

  const temporadas = tempRes.data || []
  const temporadasIds = temporadas.map(t => t.id)
  const tarifas = (tarifasRes.data || []).filter(t => temporadasIds.includes(t.temporada_id))
  const servicios = servRes.data || []

  // 2. For each category, find an available physical room and calculate price
  for (const cat of categorias) {
    const posadaData = cat.posadas as any
    const edadMaxInfantes = posadaData.edad_max_infantes ?? 3
    const edadMaxNinos = posadaData.edad_max_ninos ?? 12

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

    // Retrocompatibilidad
    if (edadesNinos.length === 0 && ninos > 0) {
      ninosEfectivos = ninos
    }

    // Check strict capacity against effective pax
    // Note: The user requested that we still allow booking if total pax <= capacidad_max_pax
    // BUT our schema doesn't have capacidad_max_pax, only max_adultos and max_ninos.
    // For now, we'll enforce the strict check as it's the only metric we have, or we can relax it to sum.
    // Let's assume physical beds: total pax must be <= max_adultos + max_ninos
    // Let's assume physical beds: total pax must be <= max_adultos + max_ninos
    const paxTotal = adultosEfectivos + ninosEfectivos + infantesEfectivos
    const maxPaxTotal = cat.capacidad_max_adultos + cat.capacidad_max_ninos
    if (paxTotal > maxPaxTotal) continue // Reject if it physically doesn't fit

    // Find all physical rooms for this category
    const { data: habitaciones, error: habError } = await supabase
      .from('habitaciones')
      .select('id, nombre, numero_habitacion, descripcion, servicios, fotos')
      .eq('categoria_id', cat.id)
      .eq('estado', 'disponible')
      
    if (habError || !habitaciones || habitaciones.length === 0) continue

    // Find any room that does NOT have overlapping reservations
    const habitaciones_disponibles = []
    for (const hab of habitaciones) {
      const { data: overlap, error: overlapError } = await supabase
        .from('reservas')
        .select('id')
        .eq('habitacion_id', hab.id)
        .neq('estado', 'cancelada')
        .or(`and(check_in.lt.${check_out},check_out.gt.${check_in})`)
        .limit(1)

      if (!overlapError && (!overlap || overlap.length === 0)) {
        habitaciones_disponibles.push(hab)
      }
    }

    if (habitaciones_disponibles.length === 0) continue // No rooms available in this category

    // 3. Calculate price and commission using TS logic (to match Cotizaciones)
    let currentDate = new Date(d1);
    currentDate.setMinutes(currentDate.getMinutes() + currentDate.getTimezoneOffset()); // Fix UTC offset for looping
    let subtotal = 0;
    const comision_detalle: Record<string, number> = {};
    let missingRate = false;

    // Filter seasons for this category's posada
    const posadaTemporadas = temporadas.filter(t => t.posada_id === cat.posada_id);

    while (currentDate < d2) {
      const matchingSeason = posadaTemporadas.find(t => {
        if (!t.periodo) return false;
        const parts = t.periodo.split(',');
        if (parts.length === 2) {
          const startStr = parts[0].replace('[', '').replace('(', '').trim();
          const endStr = parts[1].replace(']', '').replace(')', '').trim();
          const start = new Date(startStr + 'T00:00:00');
          const end = new Date(endStr + 'T00:00:00');
          return currentDate >= start && currentDate < end;
        }
        return false;
      });

      const seasonId = matchingSeason ? matchingSeason.id : null;
      let tarifaConfig = tarifas.find(t => t.categoria_id === cat.id && t.temporada_id === seasonId);
      if (!tarifaConfig) {
        // default season
        const defaultSeason = posadaTemporadas.find(t => t.es_predeterminada);
        if (defaultSeason) {
          tarifaConfig = tarifas.find(t => t.categoria_id === cat.id && t.temporada_id === defaultSeason.id);
        }
      }

      if (!tarifaConfig) {
        missingRate = true;
        break;
      }

      let tarifaDiaria = 0;
      if (tarifaConfig.modalidad_tarifa === 'por_persona') {
         tarifaDiaria = (adultosEfectivos * Number(tarifaConfig.tarifa_base)) + (ninosEfectivos * Number(tarifaConfig.tarifa_nino));
      } else {
         const capacidadBase = cat.capacidad_base_pax || 2;
         const adultosEnBase = Math.min(adultosEfectivos, capacidadBase);
         const ninosEnBase = Math.min(ninosEfectivos, Math.max(0, capacidadBase - adultosEnBase));
         const adultosExtra = adultosEfectivos - adultosEnBase;
         const ninosExtra = ninosEfectivos - ninosEnBase;
         
         tarifaDiaria = Number(tarifaConfig.tarifa_base) 
                      + (adultosExtra * Number(tarifaConfig.tarifa_adulto_extra)) 
                      + (ninosExtra * Number(tarifaConfig.tarifa_nino));
      }

      subtotal += tarifaDiaria;
      
      if (tarifaConfig.comisionable) {
         const percent = Number(tarifaConfig.porcentaje_comision);
         if (percent > 0) {
           const ganancia = tarifaDiaria * (percent / 100);
           comision_detalle[percent] = (comision_detalle[percent] || 0) + ganancia;
         }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (!missingRate) {
      const posadaData = cat.posadas as any
      for (const hab of habitaciones_disponibles) {
        results.push({
          posada_id: cat.posada_id,
          posada_nombre: posadaData.nombre,
          posada_moneda: posadaData.moneda_base,
          categoria_id: cat.id,
          categoria_nombre: cat.nombre,
          habitacion_id: hab.id,
          habitacion_nombre: hab.nombre || `Hab. ${hab.numero_habitacion}`,
          descripcion: hab.descripcion || '',
          servicios: hab.servicios || [],
          fotos: hab.fotos || [],
          precio_total: subtotal,
          capacidad_base: cat.capacidad_base_pax,
          comision_detalle
        })
      }
    }
  }

  return { results, servicios }
}

export async function confirmarReservaB2B(
  habitaciones: { posada_id: string, categoria_id: string, habitacion_id: string, monto_total: number, moneda: string }[],
  check_in: string,
  check_out: string,
  adultos: number,
  ninos: number,
  cliente_info: any,
  servicios_adicionales: any[],
  numero_expediente?: string
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  if (!habitaciones || habitaciones.length === 0) throw new Error('Debes seleccionar al menos una habitación.')

  const localizador = 'B2B-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  const insertPayloads = []

  for (const hab of habitaciones) {
    // Verify overlap right before inserting, to avoid race conditions
    const { data: overlap } = await supabase
      .from('reservas')
      .select('id')
      .eq('habitacion_id', hab.habitacion_id)
      .neq('estado', 'cancelada')
      .or(`and(check_in.lt.${check_out},check_out.gt.${check_in})`)

    if (overlap && overlap.length > 0) throw new Error('Una o más habitaciones fueron tomadas por otro usuario. Intenta buscar nuevamente.')

    insertPayloads.push({
      localizador,
      posada_id: hab.posada_id,
      habitacion_id: hab.habitacion_id,
      categoria_id: hab.categoria_id,
      check_in,
      check_out,
      adultos,
      ninos,
      moneda: hab.moneda,
      monto_total: hab.monto_total,
      origen: 'erp_b2b',
      estado: 'confirmada',
      servicios_adicionales: servicios_adicionales.filter(s => s.posada_id === hab.posada_id),
      cliente_info,
      creada_por: user.id,
      numero_expediente
    })
  }

  const { error } = await supabase.from('reservas').insert(insertPayloads)

  if (error) throw new Error(error.message)

  revalidatePath('/erp/buscador')
  revalidatePath('/erp/reservas')
  // We also invalidate the PMS cache in case the posada owner is watching
  revalidatePath('/pms/calendario')
  revalidatePath('/pms/reservas')
  
  return { success: true }
}
