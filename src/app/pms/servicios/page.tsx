import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getServicios } from './actions'
import ServiciosClientPage from './client-page'

export default async function ServiciosPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Obtener la posada del usuario
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('posada_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.posada_id) {
    return <div>No tienes una posada asignada.</div>
  }

  const servicios = await getServicios(perfil.posada_id)

  return <ServiciosClientPage initialServicios={servicios} posadaId={perfil.posada_id} />
}
