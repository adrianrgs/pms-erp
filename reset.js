const { createClient } = require('@supabase/supabase-js')

// Supabase Local defaults
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY // We will pass this as an environment variable

if (!supabaseServiceRole) {
  console.error('Please provide SUPABASE_SERVICE_ROLE_KEY as an env variable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function resetPasswords() {
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('Error fetching users:', error)
    return
  }

  const users = data.users
  console.log(`Found ${users.length} users. Resetting passwords...`)

  for (const user of users) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: 'password123'
    })
    
    if (updateError) {
      console.error(`Error updating password for ${user.email}:`, updateError)
    } else {
      console.log(`Successfully reset password for: ${user.email} -> password123`)
    }
  }
}

resetPasswords()
