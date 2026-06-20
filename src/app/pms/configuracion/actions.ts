'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function savePosadaConfig(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const nombre = formData.get('nombre') as string
  const descripcion = formData.get('descripcion') as string
  const politicas = formData.get('politicas') as string
  const moneda_base = formData.get('moneda_base') as string
  const wifi = formData.get('wifi') === 'on'
  const desayuno = formData.get('desayuno') === 'on'
  const piscina = formData.get('piscina') === 'on'
  const parking = formData.get('parking') === 'on'

  const amenidades = { wifi, desayuno, piscina, parking }

  // Check if profile exists
  let { data: perfil } = await supabase
    .from('perfiles')
    .select('posada_id')
    .eq('id', user.id)
    .single()

  let posadaId = perfil?.posada_id

  if (!perfil) {
    // Create profile if it doesn't exist (e.g. first login)
    await supabase.from('perfiles').insert({
      id: user.id,
      rol: 'pms_admin',
      nombre_completo: user.email?.split('@')[0] || 'Admin',
    })
  }

  if (posadaId) {
    // Update existing posada
    const { error } = await supabase
      .from('posadas')
      .update({
        nombre,
        descripcion,
        politicas,
        amenidades,
        moneda_base,
        updated_at: new Date().toISOString()
      })
      .eq('id', posadaId)
    
    if (error) throw new Error(error.message)
  } else {
    // Create new posada
    const { data: newPosada, error: posadaError } = await supabase
      .from('posadas')
      .insert({
        nombre,
        descripcion,
        politicas,
        amenidades,
        moneda_base
      })
      .select('id')
      .single()
      
    if (posadaError) throw new Error(posadaError.message)
    
    posadaId = newPosada.id

    // Link it to profile
    await supabase
      .from('perfiles')
      .update({ posada_id: posadaId })
      .eq('id', user.id)
  }

  revalidatePath('/pms/configuracion')
  return { success: true }
}
