import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPosadaBySlug } from './actions'
import { BookingThemeProvider } from './BookingThemeProvider'
import BookingEngine from '@/components/booking/BookingEngine'
import FullLandingPage from '@/components/booking/FullLandingPage'
import './booking.css'

// ─── Metadata dinámica por tenant ─────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const posada = await getPosadaBySlug(slug)

  if (!posada) {
    return { title: 'Posada no encontrada' }
  }

  return {
    title: posada.tiene_landing_propia
      ? `Motor de Reservas · ${posada.nombre}`
      : `${posada.nombre} · Reserva Directa`,
    description: posada.descripcion ?? `Reserva tu habitación en ${posada.nombre} al mejor precio garantizado.`,
    openGraph: {
      title: posada.nombre,
      description: posada.descripcion ?? undefined,
      images: posada.theme.heroImageUrl
        ? [{ url: posada.theme.heroImageUrl, width: 1200, height: 630, alt: posada.nombre }]
        : [],
    },
  }
}

// ─── Página Multi-Tenant ──────────────────────────────────────────────────────

/**
 * Punto de entrada del sistema Multi-Tenant.
 *
 * Lógica de enrutamiento:
 *  1. Resuelve el tenant desde el slug de la URL.
 *  2. Inyecta el tema white-label (colores + logo) vía ThemeProvider.
 *  3. Si `tiene_landing_propia: true` → solo muestra <BookingEngine/> standalone.
 *  4. Si `tiene_landing_propia: false` → muestra <FullLandingPage/> completa.
 */
export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // ── Resolución del tenant ─────────────────────────────────────────────────
  const posada = await getPosadaBySlug(slug)

  if (!posada) {
    notFound()
  }

  // ── Enrutamiento Multi-Tenant ─────────────────────────────────────────────
  return (
    <BookingThemeProvider posada={posada}>
      {posada.tiene_landing_propia ? (
        /**
         * MODO: Standalone Engine
         * La posada ya tiene su propia web. Solo mostramos el motor de reservas
         * para incrustar o usar en su subdominio dedicado.
         */
        <div className="min-h-screen bg-gray-50">
          {/* Mini header white-label */}
          <header
            className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm"
            style={{ borderColor: `rgba(var(--brand-primary-rgb), 0.15)` }}
          >
            <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {posada.theme.logoUrl ? (
                  <img
                    src={posada.theme.logoUrl}
                    alt={posada.nombre}
                    className="h-7 object-contain"
                  />
                ) : (
                  <span className="font-bold text-gray-900">{posada.nombre}</span>
                )}
              </div>
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{
                  background: `rgba(var(--brand-primary-rgb), 0.1)`,
                  color: `var(--brand-primary)`,
                }}
              >
                Reserva Directa
              </span>
            </div>
          </header>

          {/* Motor de reservas centrado */}
          <BookingEngine
            posadaId={posada.id}
            posadaNombre={posada.nombre}
            moneda={posada.moneda_base}
            edadMaxNinos={posada.edad_max_ninos}
          />
        </div>
      ) : (
        /**
         * MODO: Full Landing Page
         * La posada NO tiene web propia. Mostramos la landing completa
         * con Hero, Amenidades, Galería, CTA y Footer.
         */
        <FullLandingPage posada={posada} />
      )}
    </BookingThemeProvider>
  )
}
