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
}

export async function buscarDisponibilidad(check_in: string, check_out: string, adultos: number, ninos: number, posadas_ids?: string[]): Promise<SearchResult[]> {
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
      posadas (nombre, moneda_base)
    `)
    .gte('capacidad_max_adultos', adultos)
    .gte('capacidad_max_ninos', ninos)

  if (posadas_ids && posadas_ids.length > 0) {
    query = query.in('posada_id', posadas_ids)
  }

  const { data: categorias, error: catError } = await query

  console.log(`Buscador -> Filtro inicial (Adultos: ${adultos}, Niños: ${ninos}, Posadas: ${posadas_ids?.join(',') || 'Todas'}) devolvió ${categorias?.length || 0} categorias. Error:`, catError?.message)

  if (catError) throw new Error(catError.message)
  if (!categorias || categorias.length === 0) return []

  const results: SearchResult[] = []

  // 2. For each category, find an available physical room and calculate price
  for (const cat of categorias) {
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

    // 3. Calculate price using the RPC
    const adultos_extra = Math.max(0, adultos - cat.capacidad_base_pax)
    
    console.log(`Buscador -> Llamando a RPC para categoria ${cat.id} (${cat.nombre}) con posada ${cat.posada_id}`)
    const { data: precio, error: rpcError } = await supabase.rpc('calcular_precio_estadia', {
      p_posada_id: cat.posada_id,
      p_categoria_id: cat.id,
      p_check_in: check_in,
      p_check_out: check_out,
      p_adultos_extra: adultos_extra,
      p_ninos: ninos
    })

    console.log(`Buscador -> RPC Resultado para ${cat.nombre}:`, { precio, error: rpcError?.message })

    // If there's an error (e.g. missing rates for the period), we simply skip this category
    // It means it's not bookable for this specific date range
    if (!rpcError && precio !== null) {
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
          precio_total: Number(precio),
          capacidad_base: cat.capacidad_base_pax
        })
      }
    }
  }

  return results
}

export async function confirmarReservaB2B(
  posada_id: string,
  categoria_id: string,
  habitacion_id: string,
  check_in: string,
  check_out: string,
  adultos: number,
  ninos: number,
  monto_total: number,
  moneda: string,
  cliente_info: any
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  // Verify overlap right before inserting, to avoid race conditions
  const { data: overlap } = await supabase
    .from('reservas')
    .select('id')
    .eq('habitacion_id', habitacion_id)
    .neq('estado', 'cancelada')
    .or(`and(check_in.lt.${check_out},check_out.gt.${check_in})`)

  if (overlap && overlap.length > 0) throw new Error('La habitación fue tomada por otro usuario. Intenta buscar nuevamente.')

  const localizador = 'B2B-' + Math.random().toString(36).substring(2, 8).toUpperCase()

  const { error } = await supabase.from('reservas').insert({
    localizador,
    posada_id,
    habitacion_id,
    categoria_id,
    check_in,
    check_out,
    adultos,
    ninos,
    moneda,
    monto_total,
    origen: 'erp_b2b',
    estado: 'confirmada',
    cliente_info,
    creada_por: user.id
  })

  if (error) throw new Error(error.message)

  revalidatePath('/erp/buscador')
  revalidatePath('/erp/reservas')
  // We also invalidate the PMS cache in case the posada owner is watching
  revalidatePath('/pms/calendario')
  revalidatePath('/pms/reservas')
  
  return { success: true }
}
