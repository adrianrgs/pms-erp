import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getPosadaLandingData } from './actions'
import LandingConfigurator from './LandingConfigurator'

export const metadata: Metadata = {
  title: 'Landing Page — PMS Core',
  description: 'Personaliza la página pública de tu posada',
}

export default async function LandingPage() {
  const data = await getPosadaLandingData()

  if (!data) {
    redirect('/pms/configuracion')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <LandingConfigurator initialData={data} />
    </div>
  )
}
