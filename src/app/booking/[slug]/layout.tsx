import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Motor de Reservas',
  description: 'Reserva tu habitación de forma rápida y segura.',
}

/**
 * Layout público para el motor de reservas.
 * Completamente aislado del sidebar/nav del PMS.
 * Hereda <html> y <body> del RootLayout pero sin ningún componente del PMS.
 */
export default function BookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
