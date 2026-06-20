import { createClient } from '@/lib/supabase/server'
import TarifasClientPage from './client-page'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Motor de Tarifas - PMS Core',
}

export default async function TarifasPage() {
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

  let temporadas: any[] = []
  let categorias: any[] = []
  let tarifas: any[] = []
  let moneda_base = 'USD'

  if (perfil?.posada_id) {
    const [tempRes, catsRes, posadaRes] = await Promise.all([
      supabase.from('temporadas').select('*').eq('posada_id', perfil.posada_id).order('created_at'),
      supabase.from('categorias_habitacion').select('*').eq('posada_id', perfil.posada_id),
      supabase.from('posadas').select('moneda_base').eq('id', perfil.posada_id).single()
    ])

    temporadas = tempRes.data || []
    categorias = catsRes.data || []
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
      <TarifasClientPage 
        temporadas={temporadas} 
        categorias={categorias} 
        tarifas={tarifas} 
        moneda_base={moneda_base} 
      />
    </div>
  )
}
