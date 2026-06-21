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
  let temporadas: any[] = []
  let tarifas: any[] = []
  let moneda_base = 'USD'

  if (perfil?.posada_id) {
    const [habsRes, catsRes, tempRes, posadaRes] = await Promise.all([
      supabase
        .from('habitaciones')
        .select('*')
        .eq('posada_id', perfil.posada_id)
        .order('numero_habitacion', { ascending: true }),
      supabase
        .from('categorias_habitacion')
        .select('*')
        .eq('posada_id', perfil.posada_id),
      supabase
        .from('temporadas')
        .select('*')
        .eq('posada_id', perfil.posada_id)
        .order('created_at'),
      supabase
        .from('posadas')
        .select('moneda_base')
        .eq('id', perfil.posada_id)
        .single()
    ])

    habitaciones = habsRes.data || []
    categorias = catsRes.data || []
    temporadas = tempRes.data || []
    moneda_base = posadaRes.data?.moneda_base || 'USD'

    if (temporadas.length > 0 && categorias.length > 0) {
      const temporadaIds = temporadas.map(t => t.id)
      const { data: tarifasData } = await supabase
        .from('tarifas_por_temporada')
        .select('*')
        .in('temporada_id', temporadaIds)
      
      tarifas = tarifasData || []
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <HabitacionesClientPage 
        habitaciones={habitaciones} 
        categorias={categorias} 
        temporadas={temporadas}
        tarifas={tarifas}
        moneda_base={moneda_base}
      />
    </div>
  )
}
