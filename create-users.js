const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceRole) {
  console.error('Please provide SUPABASE_SERVICE_ROLE_KEY as an env variable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function seed() {
  console.log('Creando usuarios y posada...')

  // 1. Crear Posada
  const { data: posada, error: posadaErr } = await supabase.from('posadas').insert({
    nombre: 'Posada Petronila'
  }).select().single()

  if (posadaErr) {
    console.error('Error creando posada:', posadaErr)
    return
  }

  // 2. Crear Auth Users
  const { data: authPosada, error: err1 } = await supabase.auth.admin.createUser({
    email: 'posada@ejemplo.com',
    password: 'password123',
    email_confirm: true
  })

  if (err1) {
    console.error('Error auth posada:', err1)
    return
  }

  const { data: authAdmin, error: err2 } = await supabase.auth.admin.createUser({
    email: 'admin@ejemplo.com',
    password: 'password123',
    email_confirm: true
  })

  if (err2) {
    console.error('Error auth admin:', err2)
    return
  }

  // 3. Crear Perfiles
  const { error: perf1 } = await supabase.from('perfiles').insert({
    id: authPosada.user.id,
    posada_id: posada.id,
    rol: 'pms_admin',
    nombre_completo: 'Admin Posada'
  })

  const { error: perf2 } = await supabase.from('perfiles').insert({
    id: authAdmin.user.id,
    posada_id: null,
    rol: 'erp_admin',
    nombre_completo: 'Admin ERP'
  })

  if (perf1 || perf2) {
    console.error('Error creando perfiles:', perf1, perf2)
  } else {
    console.log('✅ Usuarios creados correctamente:')
    console.log('--- PMS POSADA ---')
    console.log('Email: posada@ejemplo.com')
    console.log('Password: password123')
    console.log('--- ERP MAYORISTA ---')
    console.log('Email: admin@ejemplo.com')
    console.log('Password: password123')
  }
}

seed()
