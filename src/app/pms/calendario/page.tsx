import { createClient } from '@/lib/supabase/server'
import CalendarioClientPage from './client-page'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Front-Desk y Calendario - PMS Core',
}

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('posada_id, posadas(edad_max_infantes, edad_max_ninos)')
    .eq('id', user.id)
    .single()

  let habitaciones: any[] = []
  let reservas: any[] = []
  let categorias: any[] = []
  let servicios: any[] = []

  if (perfil?.posada_id) {
    // Fetch rooms, bookings, categories and services
    const [habsRes, resRes, catsRes, servRes] = await Promise.all([
      supabase.from('habitaciones').select('*').eq('posada_id', perfil.posada_id).order('numero_habitacion'),
      supabase.from('reservas').select('*').eq('posada_id', perfil.posada_id),
      supabase.from('categorias_habitacion').select('*').eq('posada_id', perfil.posada_id),
      supabase.from('servicios').select('*').eq('posada_id', perfil.posada_id)
    ])

    habitaciones = habsRes.data || []
    reservas = resRes.data || []
    categorias = catsRes.data || []
    servicios = servRes.data || []
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <CalendarioClientPage 
        habitaciones={habitaciones} 
        reservas={reservas} 
        categorias={categorias} 
        serviciosAdicionalesDisponibles={servicios}
        edadMaxInfantes={(perfil?.posadas as any)?.edad_max_infantes ?? 3}
        edadMaxNinos={(perfil?.posadas as any)?.edad_max_ninos ?? 12}
      />
    </div>
  )
}
