import { createClient } from '@/lib/supabase/server'
import ReservasListClientPage from './client-page'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Reservas - PMS Core',
}

export default async function ReservasPage() {
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

  let reservas: any[] = []
  let habitaciones: any[] = []

  if (perfil?.posada_id) {
    const [resRes, habsRes] = await Promise.all([
      supabase.from('reservas').select('*').eq('posada_id', perfil.posada_id),
      supabase.from('habitaciones').select('id, numero_habitacion, nombre').eq('posada_id', perfil.posada_id)
    ])

    reservas = resRes.data || []
    habitaciones = habsRes.data || []
  }

  return (
    <div className="max-w-6xl mx-auto">
      <ReservasListClientPage 
        reservas={reservas} 
        habitaciones={habitaciones} 
      />
    </div>
  )
}
