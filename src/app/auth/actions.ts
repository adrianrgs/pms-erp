'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword(data)

    if (error) {
      console.error("Login error:", error)
      redirect('/auth/login?error=true')
    }

    // Verificar el rol
    const { data: perfil, error: perfilError } = await supabase.from('perfiles').select('rol').eq('id', authData.user?.id).single()

    if (perfilError) {
      console.error("Perfil fetch error:", perfilError)
    }

    revalidatePath('/', 'layout')
    
    if (perfil?.rol === 'erp_admin' || perfil?.rol === 'erp_agent') {
      redirect('/erp/dashboard')
    } else {
      redirect('/pms/dashboard')
    }
  } catch (err: any) {
    console.error("Caught error in login action:", err)
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    throw err
  }
}
