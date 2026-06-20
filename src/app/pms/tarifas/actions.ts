'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTemporada(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const nombre = formData.get('nombre') as string
  const from = formData.get('from') as string
  const to = formData.get('to') as string

  if (!from || !to) throw new Error('Debes seleccionar un rango de fechas.')

  const { data: perfil } = await supabase.from('perfiles').select('posada_id').eq('id', user.id).single()
  if (!perfil?.posada_id) throw new Error('No tienes posada configurada.')

  // Postgres daterange format: '[from, to)' or '[from, to]'
  // We use inclusive brackets: '[from, to]'
  const periodo = `[${from}, ${to}]`

  const { error } = await supabase.from('temporadas').insert({
    posada_id: perfil.posada_id,
    nombre,
    periodo
  })

  if (error) {
    if (error.code === '23P01') {
      throw new Error('Esta temporada se solapa (choca) con las fechas de otra temporada existente.')
    }
    throw new Error(error.message)
  }

  revalidatePath('/pms/tarifas')
  return { success: true }
}

export async function deleteTemporada(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('temporadas').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/pms/tarifas')
}

export async function saveTarifa(temporada_id: string, categoria_id: string, formData: FormData) {
  const supabase = await createClient()
  
  const tarifa_base = parseFloat(formData.get('tarifa_base') as string) || 0
  const tarifa_adulto_extra = parseFloat(formData.get('tarifa_adulto_extra') as string) || 0
  const tarifa_nino = parseFloat(formData.get('tarifa_nino') as string) || 0

  // Upsert using the unique constraint (temporada_id, categoria_id)
  const { error } = await supabase.from('tarifas_por_temporada').upsert({
    temporada_id,
    categoria_id,
    tarifa_base,
    tarifa_adulto_extra,
    tarifa_nino
  }, { onConflict: 'temporada_id, categoria_id' })

  if (error) throw new Error(error.message)
  
  revalidatePath('/pms/tarifas')
  return { success: true }
}
