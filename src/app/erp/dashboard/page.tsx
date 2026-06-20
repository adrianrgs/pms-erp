import { Building2, TrendingUp, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: 'Dashboard - ERP B2B',
}

export default async function ERPDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div>No autorizado</div>

  // Fetch current month metrics for the B2B agent
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  
  const { data: reservasMes } = await supabase
    .from('reservas')
    .select('id, monto_total, moneda, adultos, ninos, estado')
    .eq('creada_por', user.id)
    .gte('created_at', firstDayOfMonth)
    
  let reservasActivas = 0
  let volumenVentas = 0
  let huespedesMovilizados = 0
  let monedaBase = 'USD'
  
  if (reservasMes && reservasMes.length > 0) {
    reservasActivas = reservasMes.filter(r => r.estado !== 'cancelada').length
    volumenVentas = reservasMes.reduce((acc, r) => acc + Number(r.monto_total), 0)
    huespedesMovilizados = reservasMes.reduce((acc, r) => acc + r.adultos + r.ninos, 0)
    monedaBase = reservasMes[0].moneda || 'USD'
  }

  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: monedaBase })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard B2B</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Resumen de actividad y métricas de la agencia.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas Activas</CardTitle>
            <Building2 className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reservasActivas}</div>
            <p className="text-xs text-zinc-500 mt-1">En el mes actual</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volumen de Ventas</CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(volumenVentas)}</div>
            <p className="text-xs text-zinc-500 mt-1">Generado este mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Huéspedes Movilizados</CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{huespedesMovilizados}</div>
            <p className="text-xs text-zinc-500 mt-1">Total de Pax este mes</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">¡Bienvenido al Portal Mayorista!</h3>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Usa el menú lateral para acceder al Buscador Global y generar reservas directas en las posadas.
        </p>
      </div>
    </div>
  )
}
