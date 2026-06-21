import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CotizacionesClientPage from './client-page'

export default async function CotizacionesPage() {
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
    .select('posada_id, posadas(nombre, edad_max_infantes, edad_max_ninos)')
    .eq('id', user.id)
    .single()

  if (!perfil?.posada_id) {
    return <div>No tienes una posada asignada.</div>
  }

  const [catsRes, servRes, tempRes, tarifasRes] = await Promise.all([
    supabase.from('categorias_habitacion').select('*').eq('posada_id', perfil.posada_id),
    supabase.from('servicios').select('*').eq('posada_id', perfil.posada_id),
    supabase.from('temporadas').select('*').eq('posada_id', perfil.posada_id),
    supabase.from('tarifas_por_temporada').select('*')
  ])

  const servicios = servRes.data || []
  const categorias = catsRes.data || []
  const temporadas = tempRes.data || []
  
  // Filtrar las tarifas que corresponden a las temporadas de esta posada
  const temporadasIds = temporadas.map(t => t.id)
  const tarifas = (tarifasRes.data || []).filter(t => temporadasIds.includes(t.temporada_id))

  const posadaNombre = (perfil.posadas as any)?.nombre || 'Posada'
  const edadMaxInfantes = (perfil.posadas as any)?.edad_max_infantes ?? 3
  const edadMaxNinos = (perfil.posadas as any)?.edad_max_ninos ?? 12

  return <CotizacionesClientPage 
    categorias={categorias} 
    servicios={servicios} 
    temporadas={temporadas}
    tarifas={tarifas}
    posadaNombre={posadaNombre}
    edadMaxInfantes={edadMaxInfantes}
    edadMaxNinos={edadMaxNinos}
  />
}
