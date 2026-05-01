const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

// We need the service_role key to bypass email confirmation
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjeXhpa2F4a29pYnJxbXhvb3pxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU4ODgwMiwiZXhwIjoyMDkzMTY0ODAyfQ.6Dc84ZjMlzI7QiRaO_vAljc1-Zmm2PMcsTN0ogAV_Jk';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seed() {
  console.log('Iniciando carga de usuarios por API...');

  const usersToCreate = [
    { email: 'admin@control.com', name: 'Admin Principal', role: 'admin' },
    { email: 'secretario@control.com', name: 'Secretario Gral', role: 'secretario' },
  ];

  for (let i = 1; i <= 50; i++) {
    usersToCreate.push({
      email: `socio${i}@control.com`,
      name: `Socio ${i}`,
      role: 'socio'
    });
  }

  for (const u of usersToCreate) {
    // Attempt to create user safely
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: u.name,
        rol: u.role
      }
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`[EXISTE] ${u.email}`);
      } else {
        console.error(`[ERROR] ${u.email}:`, error.message);
      }
    } else {
      console.log(`[CREADO] ${u.email}`);
    }
  }

  console.log('¡Carga completada!');
}

seed();
