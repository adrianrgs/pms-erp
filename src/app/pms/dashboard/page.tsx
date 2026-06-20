import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CreditCard, BedDouble, ArrowUpRight, Clock } from "lucide-react"
import { createClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div>No autorizado</div>

  const { data: perfil } = await supabase.from('perfiles').select('posada_id').eq('id', user.id).single()
  const posada_id = perfil?.posada_id

  if (!posada_id) return <div>No se encontró la posada.</div>

  // Fechas de hoy en string
  const todayStr = new Date().toISOString().split('T')[0]
  
  // 1. Ingresos Hoy
  const { data: reservasHoy } = await supabase
    .from('reservas')
    .select('monto_total, moneda')
    .eq('posada_id', posada_id)
    .gte('created_at', `${todayStr}T00:00:00Z`)
    .neq('estado', 'cancelada')
    
  let ingresosHoy = 0
  let monedaBase = 'USD'
  if (reservasHoy && reservasHoy.length > 0) {
    ingresosHoy = reservasHoy.reduce((acc, r) => acc + Number(r.monto_total), 0)
    monedaBase = reservasHoy[0].moneda
  }

  // 2. Huéspedes Actuales
  const { data: reservasActivas } = await supabase
    .from('reservas')
    .select('adultos, ninos')
    .eq('posada_id', posada_id)
    .lte('check_in', todayStr)
    .gt('check_out', todayStr)
    .in('estado', ['confirmada', 'check-in'])
    
  let huespedesActuales = 0
  if (reservasActivas) {
    huespedesActuales = reservasActivas.reduce((acc, r) => acc + r.adultos + r.ninos, 0)
  }

  // 3. Ocupación
  const { count: totalHabitaciones } = await supabase
    .from('habitaciones')
    .select('id', { count: 'exact', head: true })
    .eq('posada_id', posada_id)
    
  let ocupacion = 0
  if (totalHabitaciones && totalHabitaciones > 0) {
    const { count: ocupadasHoy } = await supabase
      .from('reservas')
      .select('id', { count: 'exact', head: true })
      .eq('posada_id', posada_id)
      .lte('check_in', todayStr)
      .gt('check_out', todayStr)
      .in('estado', ['confirmada', 'check-in'])
      
    ocupacion = Math.round(((ocupadasHoy || 0) / totalHabitaciones) * 100)
  }

  // 4. Reservas Recientes
  const { data: reservasRecientesData } = await supabase
    .from('reservas')
    .select('id, localizador, check_in, check_out, estado, monto_total, moneda, cliente_info')
    .eq('posada_id', posada_id)
    .order('created_at', { ascending: false })
    .limit(4)

  const recentBookings = (reservasRecientesData || []).map(r => {
    const clienteInfo = r.cliente_info as any
    const guest = clienteInfo?.nombre || 'Cliente B2B'
    return {
      id: r.localizador || r.id.split('-')[0],
      guest,
      status: r.estado,
      dates: `${format(parseISO(r.check_in), 'dd MMM', { locale: es })} - ${format(parseISO(r.check_out), 'dd MMM', { locale: es })}`,
      amount: `${r.monto_total} ${r.moneda}`
    }
  })

  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: monedaBase })

  const metrics = [
    {
      title: "Ventas Hoy",
      value: formatter.format(ingresosHoy),
      change: "Calculado hoy",
      trend: "up",
      icon: CreditCard,
    },
    {
      title: "Huéspedes Actuales",
      value: huespedesActuales.toString(),
      change: "En las instalaciones",
      trend: "up",
      icon: Users,
    },
    {
      title: "Ocupación de Hoy",
      value: `${ocupacion}%`,
      change: "En base a hab. totales",
      trend: "up",
      icon: BedDouble,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title} className="shadow-sm border-zinc-200/60 dark:border-zinc-800/60 transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{metric.value}</div>
              <p className="text-xs font-medium text-emerald-600 flex items-center mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {metric.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Row */}
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-sm border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader>
            <CardTitle>Ocupación por Categoría</CardTitle>
            <CardDescription>
              Resumen visual de disponibilidad para los próximos 7 días.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for chart */}
            <div className="flex h-[250px] items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <span className="text-sm text-zinc-500 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Próximamente: Gráfico Interactivo de Ocupación
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-sm border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader>
            <CardTitle>Reservas Recientes</CardTitle>
            <CardDescription>
              Últimas reservas ingresadas al sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBookings.length === 0 ? (
                <div className="text-sm text-zinc-500 text-center py-4">No hay reservas recientes.</div>
              ) : recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between border-b border-zinc-100 pb-4 last:border-0 last:pb-0 dark:border-zinc-800/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-zinc-900 dark:text-zinc-100">
                      {booking.guest}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="font-mono text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {booking.id}
                      </span>
                      <span>•</span>
                      <span>{booking.dates}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{booking.amount}</div>
                    <div className={`text-xs font-medium capitalize ${booking.status === 'confirmada' ? 'text-indigo-600 dark:text-indigo-400' : booking.status === 'check-in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {booking.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
