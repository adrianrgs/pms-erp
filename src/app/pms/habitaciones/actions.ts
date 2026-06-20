'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addHabitacion(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const numero_habitacion = formData.get('numero_habitacion') as string
  const nombre = formData.get('nombre') as string
  const categoria_id = formData.get('categoria_id') as string
  const descripcion = formData.get('descripcion') as string || ''
  
  let servicios = []
  let fotos = []
  try { if (formData.get('servicios')) servicios = JSON.parse(formData.get('servicios') as string) } catch(e){}
  try { if (formData.get('fotos')) fotos = JSON.parse(formData.get('fotos') as string) } catch(e){}

  const { data: perfil } = await supabase.from('perfiles').select('posada_id').eq('id', user.id).single()
  if (!perfil?.posada_id) throw new Error('No tienes posada configurada.')

  const { error } = await supabase.from('habitaciones').insert({
    posada_id: perfil.posada_id,
    categoria_id,
    numero_habitacion,
    nombre,
    descripcion,
    servicios,
    fotos,
    estado: 'disponible'
  })

  if (error) {
    if (error.code === '23505') throw new Error('Ya existe una habitación con este número/identificador.')
    throw new Error(error.message)
  }

  revalidatePath('/pms/habitaciones')
  return { success: true }
}

export async function deleteHabitacion(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('habitaciones').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/pms/habitaciones')
}

export async function editHabitacion(id: string, formData: FormData) {
  const supabase = await createClient()
  const numero_habitacion = formData.get('numero_habitacion') as string
  const nombre = formData.get('nombre') as string
  const categoria_id = formData.get('categoria_id') as string
  const descripcion = formData.get('descripcion') as string || ''
  
  let servicios = []
  let fotos = []
  try { if (formData.get('servicios')) servicios = JSON.parse(formData.get('servicios') as string) } catch(e){}
  try { if (formData.get('fotos')) fotos = JSON.parse(formData.get('fotos') as string) } catch(e){}

  const { error } = await supabase.from('habitaciones').update({
    numero_habitacion,
    nombre,
    categoria_id,
    descripcion,
    servicios,
    fotos
  }).eq('id', id)

  if (error) {
    if (error.code === '23505') throw new Error('Ya existe una habitación con este número.')
    throw new Error(error.message)
  }
  revalidatePath('/pms/habitaciones')
}
