import { createClient } from '@/lib/supabase/server'
import { buscarDisponibilidad } from './src/app/erp/buscador/actions'

async function debugSearch() {
  const supabase = await createClient()

  const check_in = '2026-06-25' // Just an example date
  const check_out = '2026-06-28'
  const adultos = 2
  const ninos = 0

  console.log("1. Checking Categories...")
  const { data: categorias, error: catError } = await supabase
    .from('categorias_habitacion')
    .select(`id, nombre, capacidad_base_pax, capacidad_max_adultos, capacidad_max_ninos, posada_id`)
    .gte('capacidad_max_adultos', adultos)
    .gte('capacidad_max_ninos', ninos)

  console.log("Categorias Error:", catError)
  console.log("Categorias Found:", categorias?.length)

  if (categorias && categorias.length > 0) {
    for (const cat of categorias) {
      console.log(`\n--- Category: ${cat.nombre} (${cat.id}) ---`)
      
      const { data: habitaciones } = await supabase
        .from('habitaciones')
        .select('id, estado')
        .eq('categoria_id', cat.id)
        .eq('estado', 'disponible')
      
      console.log("Rooms found:", habitaciones?.length)

      if (habitaciones && habitaciones.length > 0) {
        let habitacion_disponible_id = null
        for (const hab of habitaciones) {
          const { data: overlap, error: overlapError } = await supabase
            .from('reservas')
            .select('id')
            .eq('habitacion_id', hab.id)
            .neq('estado', 'cancelada')
            .or(`and(check_in.lt.${check_out},check_out.gt.${check_in})`)
            .limit(1)

          if (!overlapError && (!overlap || overlap.length === 0)) {
            habitacion_disponible_id = hab.id
            break 
          }
        }
        
        console.log("Available room ID:", habitacion_disponible_id)

        if (habitacion_disponible_id) {
          const adultos_extra = Math.max(0, adultos - cat.capacidad_base_pax)
          console.log("Calling RPC with:", {
            p_posada_id: cat.posada_id,
            p_categoria_id: cat.id,
            p_check_in: check_in,
            p_check_out: check_out,
            p_adultos_extra: adultos_extra,
            p_ninos: ninos
          })
          
          const { data: precio, error: rpcError } = await supabase.rpc('calcular_precio_estadia', {
            p_posada_id: cat.posada_id,
            p_categoria_id: cat.id,
            p_check_in: check_in,
            p_check_out: check_out,
            p_adultos_extra: adultos_extra,
            p_ninos: ninos
          })

          console.log("RPC Error:", rpcError?.message)
          console.log("RPC Price:", precio)
        }
      }
    }
  }
}

debugSearch()
