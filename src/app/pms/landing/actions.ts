'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { LandingSettings, PosadaLandingData } from './types'

// ─── getPosadaLandingData ─────────────────────────────────────────────────────

export async function getPosadaLandingData(): Promise<PosadaLandingData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('posada_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.posada_id) return null

  const { data } = await supabase
    .from('posadas')
    .select('id, nombre, slug, color_primario, color_secundario, logo_url, hero_image_url, galeria_urls, landing_settings')
    .eq('id', perfil.posada_id)
    .single()

  if (!data) return null

  const rawSettings = data.landing_settings as Partial<LandingSettings> | null

  return {
    id: data.id,
    nombre: data.nombre,
    slug: data.slug,
    color_primario: data.color_primario ?? '#2563eb',
    color_secundario: data.color_secundario ?? '#7c3aed',
    logo_url: data.logo_url ?? null,
    hero_image_url: data.hero_image_url ?? null,
    galeria_urls: data.galeria_urls ?? [],
    landing_settings: {
      hero: {
        titulo: rawSettings?.hero?.titulo ?? '',
        subtitulo: rawSettings?.hero?.subtitulo ?? '',
      },
      secciones: {
        mostrar_amenidades: rawSettings?.secciones?.mostrar_amenidades ?? true,
        mostrar_galeria: rawSettings?.secciones?.mostrar_galeria ?? true,
        mostrar_testimonios: rawSettings?.secciones?.mostrar_testimonios ?? false,
        mostrar_mapa: rawSettings?.secciones?.mostrar_mapa ?? false,
      },
      amenidades_custom: rawSettings?.amenidades_custom ?? [],
    },
  }
}

// ─── saveLandingConfig ────────────────────────────────────────────────────────

export async function saveLandingConfig(payload: {
  color_primario: string
  color_secundario: string
  logo_url: string | null
  hero_image_url: string | null
  galeria_urls: string[]
  landing_settings: LandingSettings
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('posada_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.posada_id) return { success: false, error: 'Sin posada asociada' }

  const { error } = await supabase
    .from('posadas')
    .update({
      color_primario: payload.color_primario,
      color_secundario: payload.color_secundario,
      logo_url: payload.logo_url,
      hero_image_url: payload.hero_image_url,
      galeria_urls: payload.galeria_urls,
      landing_settings: payload.landing_settings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', perfil.posada_id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/pms/landing')
  return { success: true }
}

// ─── uploadLandingImage ───────────────────────────────────────────────────────

export async function uploadLandingImage(
  formData: FormData,
  tipo: 'logo' | 'hero' | 'galeria'
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
  const path = `${perfil.posada_id}/${tipo}_${timestamp}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('posadas-media')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { success: false, error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('posadas-media')
    .getPublicUrl(path)

  if (tipo === 'logo') {
    await supabase.from('posadas').update({ logo_url: publicUrl }).eq('id', perfil.posada_id)
  } else if (tipo === 'hero') {
    await supabase.from('posadas').update({ hero_image_url: publicUrl }).eq('id', perfil.posada_id)
  } else if (tipo === 'galeria') {
    const { data: current } = await supabase
      .from('posadas')
      .select('galeria_urls')
      .eq('id', perfil.posada_id)
      .single()

    const galeria = [...(current?.galeria_urls ?? []), publicUrl]
    await supabase.from('posadas').update({ galeria_urls: galeria }).eq('id', perfil.posada_id)
  }

  revalidatePath('/pms/landing')
  return { success: true, url: publicUrl }
}

// ─── deleteGaleriaImage ───────────────────────────────────────────────────────

export async function deleteGaleriaImage(
  url: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: perfil } = await supabase
    .from('perfiles').select('posada_id').eq('id', user.id).single()
  if (!perfil?.posada_id) return { success: false, error: 'Sin posada' }

  const { data: current } = await supabase
    .from('posadas').select('galeria_urls').eq('id', perfil.posada_id).single()

  const galeria = (current?.galeria_urls ?? []).filter((u: string) => u !== url)
  await supabase.from('posadas').update({ galeria_urls: galeria }).eq('id', perfil.posada_id)

  revalidatePath('/pms/landing')
  return { success: true }
}
