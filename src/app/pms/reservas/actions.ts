'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Existing imports and functions...

export async function calcularTarifa(habitacion_id: string, check_in: string, check_out: string, total_adultos: number, total_ninos: number) {
  const supabase = await createClient()
  
  if (!habitacion_id || !check_in || !check_out) return 0
  
  const d1 = new Date(check_in)
  const d2 = new Date(check_out)
  if (d1 >= d2) return 0

  // Get room category details
  const { data: hab } = await supabase.from('habitaciones')
    .select('posada_id, categoria_id, categorias_habitacion(capacidad_base_pax)')
    .eq('id', habitacion_id)
    .single()
    
  if (!hab) return 0

  const capacidad_base = (hab.categorias_habitacion as any).capacidad_base_pax || 2
  const adultos_extra = Math.max(0, total_adultos - capacidad_base)

  // Call RPC
  const { data: precio, error } = await supabase.rpc('calcular_precio_estadia', {
    p_posada_id: hab.posada_id,
    p_categoria_id: hab.categoria_id,
    p_check_in: check_in,
    p_check_out: check_out,
    p_adultos_extra: adultos_extra,
    p_ninos: total_ninos
  })

  if (error) {
    console.error("Error al calcular tarifa:", error)
    return { error: error.message }
  }

  return { precio }
}

export async function addReserva(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const { data: perfil } = await supabase.from('perfiles').select('posada_id').eq('id', user.id).single()
  if (!perfil?.posada_id) throw new Error('No tienes posada configurada.')

  const habitacion_ids = formData.getAll('habitacion_ids') as string[]
  const check_in = formData.get('check_in') as string
  const check_out = formData.get('check_out') as string
  const cliente_nombre = formData.get('cliente_nombre') as string
  const cliente_email = formData.get('cliente_email') as string
  const cliente_telefono = formData.get('cliente_telefono') as string
  const monto_total = parseFloat(formData.get('total') as string) || 0
  
  const adultos = parseInt(formData.get('adultos') as string) || 2
  const ninos = parseInt(formData.get('ninos') as string) || 0
  const moneda = 'USD'
  
  const detalles_por_habitacion_raw = formData.get('detalles_por_habitacion') as string
  let detalles_por_habitacion: Record<string, { nombre: string, adultos: string, ninos: string }> = {}
  try {
    if (detalles_por_habitacion_raw) detalles_por_habitacion = JSON.parse(detalles_por_habitacion_raw)
  } catch (e) {}

  const tarifas_por_habitacion_raw = formData.get('tarifas_por_habitacion') as string
  let tarifas_por_habitacion: Record<string, number> = {}
  try {
    if (tarifas_por_habitacion_raw) tarifas_por_habitacion = JSON.parse(tarifas_por_habitacion_raw)
  } catch (e) {}

  if (!habitacion_ids || habitacion_ids.length === 0) throw new Error('Debes seleccionar al menos una habitación.')
  if (new Date(check_in) >= new Date(check_out)) throw new Error('El Check-out debe ser posterior al Check-in.')

  const localizador = 'PMS-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  
  // Fallback division if no specific prices were provided
  const fallback_monto_por_hab = monto_total / habitacion_ids.length

  const insertPayloads = []

  for (const hab_id of habitacion_ids) {
    const { data: hab } = await supabase.from('habitaciones').select('categoria_id, numero_habitacion').eq('id', hab_id).single()
    if (!hab) throw new Error(`Habitación no encontrada.`)

    const { data: overlap, error: overlapError } = await supabase
      .from('reservas')
      .select('id')
      .eq('habitacion_id', hab_id)
      .neq('estado', 'cancelada')
      .or(`and(check_in.lt.${check_out},check_out.gt.${check_in})`)

    if (overlapError) throw new Error(overlapError.message)
    if (overlap && overlap.length > 0) throw new Error(`La habitación ${hab.numero_habitacion} ya está ocupada en esas fechas.`)

    // Determine the main guest name and capacities for this specific room
    const detail = detalles_por_habitacion[hab_id] || {}
    const customName = detail.nombre?.trim() || cliente_nombre
    const customDocument = detail.documento?.trim() || formData.get('cliente_documento') as string || ''
    const roomAdultos = detail.adultos ? parseInt(detail.adultos) : adultos
    const roomNinos = detail.ninos ? parseInt(detail.ninos) : ninos
    
    // Determine the companions for this specific room
    const acompanantes_globales_raw = formData.get('acompanantes_globales') as string
    let acompanantes_globales: { id: string, nombre: string, documento: string }[] = []
    try {
      if (acompanantes_globales_raw) acompanantes_globales = JSON.parse(acompanantes_globales_raw)
    } catch (e) {}
    
    // If multiple rooms, use the specific companions for the room. Otherwise, use global companions.
    let roomAcompanantes = []
    if (habitacion_ids.length > 1) {
      roomAcompanantes = detail.acompanantes || []
    } else {
      roomAcompanantes = acompanantes_globales
    }
    
    // Map to DB structure (remove frontend id)
    const dbAcompanantes = roomAcompanantes
      .filter((ac: any) => ac.nombre?.trim() !== '')
      .map((ac: any) => ({
        nombre: ac.nombre,
        documento: ac.documento || '',
        nacionalidad: '',
        tipo: 'adulto' // default
      }))
    
    const monto_por_hab = tarifas_por_habitacion[hab_id] !== undefined ? tarifas_por_habitacion[hab_id] : fallback_monto_por_hab

    insertPayloads.push({
      localizador,
      posada_id: perfil.posada_id,
      habitacion_id: hab_id,
      categoria_id: hab.categoria_id,
      check_in,
      check_out,
      adultos: roomAdultos,
      ninos: roomNinos,
      moneda,
      monto_total: monto_por_hab,
      origen: 'directa',
      estado: 'confirmada',
      cliente_info: {
        titular: {
          nombre: customName,
          email: cliente_email,
          telefono: cliente_telefono,
          documento: customDocument,
          nacionalidad: '',
          tipo: 'adulto'
        },
        acompanantes: dbAcompanantes
      }
    })
  }

  const { error } = await supabase.from('reservas').insert(insertPayloads)

  if (error) throw new Error(error.message)

  revalidatePath('/pms/calendario')
  revalidatePath('/pms/reservas')
  return { success: true }
}

export async function deleteReservaGroup(localizador: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('reservas').delete().eq('localizador', localizador)
  if (error) throw new Error(error.message)
  revalidatePath('/pms/calendario')
  revalidatePath('/pms/reservas')
}

export async function deleteReserva(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('reservas').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/pms/calendario')
  revalidatePath('/pms/reservas')
}

export async function editReserva(id: string, formData: FormData) {
  const supabase = await createClient()
  const check_in = formData.get('check_in') as string
  const check_out = formData.get('check_out') as string
  const habitacion_id = formData.get('habitacion_id') as string
  const monto_total = parseFloat(formData.get('total') as string) || 0
  const adultos = parseInt(formData.get('adultos') as string) || 2
  const ninos = parseInt(formData.get('ninos') as string) || 0

  if (new Date(check_in) >= new Date(check_out)) throw new Error('El Check-out debe ser posterior al Check-in.')

  const { data: overlap } = await supabase
    .from('reservas')
    .select('id')
    .eq('habitacion_id', habitacion_id)
    .neq('id', id)
    .neq('estado', 'cancelada')
    .or(`and(check_in.lt.${check_out},check_out.gt.${check_in})`)

  if (overlap && overlap.length > 0) throw new Error('La habitación está ocupada en esas fechas.')

  const { error } = await supabase.from('reservas').update({
    habitacion_id,
    check_in,
    check_out,
    monto_total,
    adultos,
    ninos
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/pms/calendario')
  revalidatePath('/pms/reservas')
}

export async function updateClienteInfo(ids: string[], cliente_info: any, adultos: number, ninos: number) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('reservas').update({
    cliente_info,
    adultos,
    ninos
  }).in('id', ids)

  if (error) throw new Error(error.message)
  revalidatePath('/pms/reservas')
  revalidatePath('/pms/calendario')
}

export async function toggleVerificarReserva(localizador: string, currentStatus: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('reservas').update({
    pago_verificado: !currentStatus
  }).eq('localizador', localizador)

  if (error) throw new Error(error.message)
  revalidatePath('/pms/reservas')
}
