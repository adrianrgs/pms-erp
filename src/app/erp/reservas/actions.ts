'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function cancelReservaB2B(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  // Fetch the reservation
  const { data: reserva } = await supabase
    .from('reservas')
    .select('id, posada_id, localizador, pago_verificado, created_at, estado')
    .eq('id', id)
    .single()

  if (!reserva) throw new Error('Reserva no encontrada')

  if (reserva.estado === 'cancelada') throw new Error('La reserva ya está cancelada')
  
  if (reserva.pago_verificado) {
    throw new Error('La reserva ya ha sido verificada por la posada. No puedes anularla directamente, por favor contacta a la posada.')
  }

  // Check 48 hour grace period
  const createdDate = new Date(reserva.created_at)
  const now = new Date()
  const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60)
  
  if (diffHours > 48) {
    throw new Error('El periodo de gracia de 48 horas ha expirado. Por favor contacta a la posada para anular.')
  }

  // Cancel reservation
  const { error } = await supabase
    .from('reservas')
    .update({ estado: 'cancelada' })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Insert alert for posada
  await supabase.from('alertas').insert({
    posada_id: reserva.posada_id,
    titulo: 'Reserva Anulada',
    mensaje: `La reserva ${reserva.localizador} fue anulada por la agencia B2B dentro del periodo de gracia.`
  })

  revalidatePath('/erp/reservas')
}

export async function editReservaB2B(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const { data: reserva } = await supabase
    .from('reservas')
    .select('*, posadas(nombre), habitaciones(categoria_id)')
    .eq('id', id)
    .single()

  if (!reserva) throw new Error('Reserva no encontrada')
  if (reserva.estado === 'cancelada') throw new Error('No puedes editar una reserva cancelada')

  const nuevosAdultos = parseInt(formData.get('adultos') as string) || 1
  const nuevosNinos = parseInt(formData.get('ninos') as string) || 0
  
  let clienteInfoStr = formData.get('cliente_info') as string
  let nuevoClienteInfo = reserva.cliente_info
  if (clienteInfoStr) {
    try {
      nuevoClienteInfo = JSON.parse(clienteInfoStr)
    } catch (e) {}
  }

  let nuevoMonto = reserva.monto_total

  // Recalculate price if pax changed
  if (nuevosAdultos !== reserva.adultos || nuevosNinos !== reserva.ninos) {
    const { data: hab } = await supabase.from('habitaciones')
      .select('categoria_id, categorias_habitacion(capacidad_base_pax)')
      .eq('id', reserva.habitacion_id)
      .single()

    if (hab) {
      const capacidad_base = (hab.categorias_habitacion as any)?.capacidad_base_pax || 2
      const adultos_extra = Math.max(0, nuevosAdultos - capacidad_base)

      const { data: precio, error: rpcError } = await supabase.rpc('calcular_precio_estadia', {
        p_posada_id: reserva.posada_id,
        p_categoria_id: hab.categoria_id,
        p_check_in: reserva.check_in,
        p_check_out: reserva.check_out,
        p_adultos_extra: adultos_extra,
        p_ninos: nuevosNinos
      })

      if (!rpcError && precio !== null) {
        nuevoMonto = precio
      }
    }
  }

  const nuevoExpediente = formData.get('numero_expediente') as string || null

  const { error } = await supabase
    .from('reservas')
    .update({
      adultos: nuevosAdultos,
      ninos: nuevosNinos,
      monto_total: nuevoMonto,
      cliente_info: nuevoClienteInfo,
      numero_expediente: nuevoExpediente
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Notify if pax or price changed
  if (nuevosAdultos !== reserva.adultos || nuevosNinos !== reserva.ninos || nuevoMonto !== reserva.monto_total) {
    await supabase.from('alertas').insert({
      posada_id: reserva.posada_id,
      titulo: 'Reserva Modificada',
      mensaje: `La agencia B2B modificó la reserva ${reserva.localizador}. Pax: ${nuevosAdultos} Ad / ${nuevosNinos} Ni. Nuevo total: $${nuevoMonto}.`
    })
  }

  revalidatePath('/erp/reservas')
}

export async function uploadComprobante(reservaId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const file = formData.get('file') as File
  if (!file) throw new Error('No se envió ningún archivo')

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${reservaId}-${Date.now()}.${fileExt}`
  const filePath = `comprobantes/${fileName}`

  // Upload to posadas-media bucket
  const { error: uploadError } = await supabase.storage
    .from('posadas-media')
    .upload(filePath, file)

  if (uploadError) throw new Error(`Error al subir archivo: ${uploadError.message}`)

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('posadas-media')
    .getPublicUrl(filePath)

  // Update reservation
  const { error: updateError } = await supabase
    .from('reservas')
    .update({ comprobante_url: publicUrl })
    .eq('id', reservaId)

  if (updateError) throw new Error(`Error al actualizar reserva: ${updateError.message}`)

  revalidatePath('/erp/reservas')
}

export async function deleteComprobante(reservaId: string, url: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  // Extract path from public URL (everything after posadas-media/)
  const urlParts = url.split('posadas-media/')
  if (urlParts.length > 1) {
    const filePath = urlParts[1]
    await supabase.storage.from('posadas-media').remove([filePath])
  }

  // Remove from reservation
  const { error } = await supabase
    .from('reservas')
    .update({ comprobante_url: null })
    .eq('id', reservaId)

  if (error) throw new Error(error.message)

  revalidatePath('/erp/reservas')
}
