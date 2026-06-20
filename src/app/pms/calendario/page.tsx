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
    .select('posada_id')
    .eq('id', user.id)
    .single()

  let habitaciones: any[] = []
  let reservas: any[] = []
  let categorias: any[] = []

  if (perfil?.posada_id) {
    // Fetch rooms, bookings, and categories
    const [habsRes, resRes, catsRes] = await Promise.all([
      supabase.from('habitaciones').select('*').eq('posada_id', perfil.posada_id).order('numero_habitacion'),
      supabase.from('reservas').select('*').eq('posada_id', perfil.posada_id),
      supabase.from('categorias_habitacion').select('*').eq('posada_id', perfil.posada_id)
    ])

    habitaciones = habsRes.data || []
    reservas = resRes.data || []
    categorias = catsRes.data || []
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <CalendarioClientPage 
        habitaciones={habitaciones} 
        reservas={reservas} 
        categorias={categorias} 
      />
    </div>
  )
}
