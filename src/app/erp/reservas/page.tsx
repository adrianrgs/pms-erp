import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ERPReservasListClient from './client-page'

export const metadata = {
  title: 'Mis Reservas - ERP B2B',
}

export default async function ERPReservasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch only reservations created by this B2B user
  const { data: reservas } = await supabase
    .from('reservas')
    .select(`
      *,
      posadas ( nombre ),
      habitaciones ( numero_habitacion )
    `)
    .eq('creada_por', user.id)
    .order('check_in', { ascending: false })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Mis Reservas B2B</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Historial de reservaciones generadas por la agencia.</p>
      </div>

      <ERPReservasListClient reservas={reservas || []} />
    </div>
  )
}
