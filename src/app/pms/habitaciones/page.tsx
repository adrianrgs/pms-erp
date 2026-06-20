import { createClient } from '@/lib/supabase/server'
import HabitacionesClientPage from './client-page'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Habitaciones - PMS Core',
}

export default async function HabitacionesPage() {
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
  let categorias: any[] = []

  if (perfil?.posada_id) {
    const [habsRes, catsRes] = await Promise.all([
      supabase
        .from('habitaciones')
        .select('*')
        .eq('posada_id', perfil.posada_id)
        .order('numero_habitacion', { ascending: true }),
      supabase
        .from('categorias_habitacion')
        .select('id, nombre')
        .eq('posada_id', perfil.posada_id)
    ])

    habitaciones = habsRes.data || []
    categorias = catsRes.data || []
  }

  return (
    <div className="max-w-5xl mx-auto">
      <HabitacionesClientPage habitaciones={habitaciones} categorias={categorias} />
    </div>
  )
}
