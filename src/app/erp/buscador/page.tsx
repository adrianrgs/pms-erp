import BuscadorClientPage from './client-page'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Buscador B2B - ERP Mayorista',
}

export default async function BuscadorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // In a real application, we would verify the user has an 'erp_admin' or 'erp_agent' role here.
  // For the MVP, we just let any logged-in user access the ERP portal.

  const { data: posadas } = await supabase.from('posadas').select('id, nombre').order('nombre')

  return (
    <div className="max-w-6xl mx-auto">
      <BuscadorClientPage posadas={posadas || []} />
    </div>
  )
}
