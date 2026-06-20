import { createClient } from '@/lib/supabase/server'

async function testRPC() {
  const supabase = await createClient()

  // Find a room to test
  const { data: habs } = await supabase.from('habitaciones').select('id, posada_id, categoria_id, categorias_habitacion(capacidad_base_pax)').limit(1)
  
  if (!habs || habs.length === 0) {
    console.log("No rooms found")
    return
  }
  
  const hab = habs[0]
  console.log("Room found:", hab)

  // Find a season to test
  const { data: temporadas } = await supabase.from('temporadas').select('*').limit(1)
  console.log("Temporadas:", temporadas)

  if (temporadas && temporadas.length > 0) {
    // Extract dates from period (e.g., [2026-06-01,2026-06-30))
    const p = temporadas[0].periodo
    console.log("Season period:", p)
    
    // We will test a small range inside the season, say 2026-06-18 to 2026-06-20
    const check_in = '2026-06-18'
    const check_out = '2026-06-20'
    const capacidad_base = (hab.categorias_habitacion as any).capacidad_base_pax || 2
    const total_adultos = 2
    const adultos_extra = Math.max(0, total_adultos - capacidad_base)
    const total_ninos = 0

    const { data: precio, error } = await supabase.rpc('calcular_precio_estadia', {
      p_posada_id: hab.posada_id,
      p_categoria_id: hab.categoria_id,
      p_check_in: check_in,
      p_check_out: check_out,
      p_adultos_extra: adultos_extra,
      p_ninos: total_ninos
    })

    console.log("RPC Result:")
    console.log("Data:", precio)
    console.log("Error:", error)
  }
}

testRPC()
