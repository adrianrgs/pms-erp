import { createClient } from '@/lib/supabase/server'
import CategoriasClientPage from './client-page'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Categorías - PMS Core',
}

export default async function CategoriasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Find user's posada
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('posada_id')
    .eq('id', user.id)
    .single()

  let categorias: any[] = []

  if (perfil?.posada_id) {
    const { data } = await supabase
      .from('categorias_habitacion')
      .select('*')
      .eq('posada_id', perfil.posada_id)
      .order('created_at', { ascending: false })
      
    categorias = data || []
  }

  return (
    <div className="max-w-5xl mx-auto">
      <CategoriasClientPage categorias={categorias} />
    </div>
  )
}
