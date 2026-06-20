import { createClient } from '@/lib/supabase/server'
import ConfigForm from './client-form'

export const metadata = {
  title: 'Configuración - PMS Core',
  description: 'Datos maestros de la posada',
}

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let posada = null

  if (user) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('posada_id')
      .eq('id', user.id)
      .single()

    if (perfil?.posada_id) {
      const { data } = await supabase
        .from('posadas')
        .select('*')
        .eq('id', perfil.posada_id)
        .single()
      posada = data
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <ConfigForm defaultValues={posada} />
    </div>
  )
}
