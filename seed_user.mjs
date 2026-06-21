import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Creando posada...');
  const { data: posada, error: posadaError } = await supabase.from('posadas').insert({
    nombre: 'Posada de Demo',
    moneda_base: 'USD'
  }).select().single();
  
  if (posadaError) {
    console.error('Error posada:', posadaError);
    return;
  }
  
  console.log('Creando usuario...');
  const email = 'admin@admin.com';
  const password = 'password123';
  
  const { data: user, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  if (authError) {
    console.error('Error user:', authError);
    return;
  }
  
  const userId = user.user.id;
  
  console.log('Creando perfil...');
  const { error: perfilError } = await supabase.from('perfiles').insert({
    id: userId,
    posada_id: posada.id,
    rol: 'pms_admin',
    nombre_completo: 'Administrador'
  });
  
  if (perfilError) {
    console.error('Error perfil:', perfilError);
    return;
  }
  
  console.log('Seed exitoso!');
  console.log('Email:', email);
  console.log('Password:', password);
}

seed();
