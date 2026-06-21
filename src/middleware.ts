import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// ─── Rutas públicas del Motor de Reservas ─────────────────────────────────────
// Estas rutas son accesibles sin autenticación (clientes finales de las posadas).
const PUBLIC_BOOKING_PATHS = ['/booking']

// ─── [FUTURO] Detección de subdominio para Multi-Tenant ──────────────────────
// Para activar routing por subdominios (posada.tudominio.com),
// descomentar este bloque y configurar DNS wildcard + rewrite en next.config.ts:
//
// function getSlugFromSubdomain(request: NextRequest): string | null {
//   const hostname = request.headers.get('host') ?? ''
//   const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'tudominio.com'
//   const isSubdomain = hostname.endsWith(`.${baseDomain}`) && hostname !== baseDomain
//   if (!isSubdomain) return null
//   return hostname.replace(`.${baseDomain}`, '')
// }

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Las rutas de /booking/* son públicas: no requieren sesión de Supabase Auth.
  // Solo refrescamos la sesión para rutas del PMS y ERP (panel de administración).
  const isPublicBooking = PUBLIC_BOOKING_PATHS.some((p) => pathname.startsWith(p))

  if (isPublicBooking) {
    // Permitir acceso libre sin verificar sesión
    return NextResponse.next()
  }

  // Para todas las demás rutas (PMS, ERP, Auth), verificar y refrescar sesión
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

