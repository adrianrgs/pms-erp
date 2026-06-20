'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCategoria(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const nombre = formData.get('nombre') as string
  const descripcion = formData.get('descripcion') as string
  const capacidad_base_pax = parseInt(formData.get('capacidad_base_pax') as string, 10)
  const capacidad_max_adultos = parseInt(formData.get('capacidad_max_adultos') as string, 10)
  const capacidad_max_ninos = parseInt(formData.get('capacidad_max_ninos') as string, 10)

  const { data: perfil } = await supabase.from('perfiles').select('posada_id').eq('id', user.id).single()
  if (!perfil?.posada_id) throw new Error('No tienes una posada configurada.')

  const { error } = await supabase.from('categorias_habitacion').insert({
    posada_id: perfil.posada_id,
    nombre,
    descripcion,
    capacidad_base_pax,
    capacidad_max_adultos,
    capacidad_max_ninos
  })

  if (error) {
    if (error.code === '23505') throw new Error('Ya existe una categoría con este nombre.')
    throw new Error(error.message)
  }

  revalidatePath('/pms/categorias')
  return { success: true }
}

export async function deleteCategoria(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('categorias_habitacion').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/pms/categorias')
}

export async function editCategoria(id: string, formData: FormData) {
  const supabase = await createClient()
  const nombre = formData.get('nombre') as string
  const descripcion = formData.get('descripcion') as string
  const capacidad_base_pax = parseInt(formData.get('capacidad_base_pax') as string, 10)
  const capacidad_max_adultos = parseInt(formData.get('capacidad_max_adultos') as string, 10)
  const capacidad_max_ninos = parseInt(formData.get('capacidad_max_ninos') as string, 10)

  const { error } = await supabase.from('categorias_habitacion').update({
    nombre,
    descripcion,
    capacidad_base_pax,
    capacidad_max_adultos,
    capacidad_max_ninos
  }).eq('id', id)

  if (error) {
    if (error.code === '23505') throw new Error('Ya existe una categoría con este nombre.')
    throw new Error(error.message)
  }
  revalidatePath('/pms/categorias')
}
