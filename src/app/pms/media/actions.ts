'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface MediaFile {
  name: string
  url: string
  created_at: string
  size: number
}

// ─── getPosadaMedia ──────────────────────────────────────────────────────────

export async function getPosadaMedia(): Promise<MediaFile[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('posada_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.posada_id) return []

  const { data, error } = await supabase.storage
    .from('posadas-media')
    .list(perfil.posada_id, {
      sortBy: { column: 'created_at', order: 'desc' },
      limit: 100, // Ajustar según necesidad, luego podríamos añadir paginación
    })

  if (error || !data) return []

  // Filtrar carpetas vacías (Supabase a veces crea archivos falsos '.emptyFolderPlaceholder')
  const files = data.filter((f) => f.name !== '.emptyFolderPlaceholder' && f.id)

  return files.map((f) => {
    const { data: publicUrlData } = supabase.storage
      .from('posadas-media')
      .getPublicUrl(`${perfil.posada_id}/${f.name}`)

    return {
      name: f.name,
      url: publicUrlData.publicUrl,
      created_at: f.created_at || new Date().toISOString(),
      size: f.metadata?.size || 0
    }
  })
}

// ─── uploadPosadaMedia ───────────────────────────────────────────────────────

export async function uploadPosadaMedia(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('posada_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.posada_id) return { success: false, error: 'Sin posada asociada' }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { success: false, error: 'Archivo vacío' }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Solo se aceptan imágenes JPG, PNG, WEBP o GIF' }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'La imagen no puede superar 5MB' }
  }

  const ext = file.name.split('.').pop()
  const timestamp = Date.now()
  // Usamos el prefijo img_ genérico
  const path = `${perfil.posada_id}/img_${timestamp}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('posadas-media')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { success: false, error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('posadas-media')
    .getPublicUrl(path)

  revalidatePath('/pms') // revalida rutas de pms
  return { success: true, url: publicUrl }
}

// ─── deletePosadaMedia ───────────────────────────────────────────────────────

export async function deletePosadaMedia(
  url: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  // Extraer el path completo del public URL
  // Formato típico: https://<project>.supabase.co/storage/v1/object/public/posadas-media/<posada_id>/<file>
  const urlParts = url.split('posadas-media/')
  if (urlParts.length !== 2) {
    return { success: false, error: 'URL de imagen no válida' }
  }
  const filePath = urlParts[1] // contiene posada_id/archivo.jpg

  const { error } = await supabase.storage.from('posadas-media').remove([filePath])
  
  if (error) return { success: false, error: error.message }

  revalidatePath('/pms')
  return { success: true }
}
