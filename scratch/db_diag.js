const supabaseUrl = 'https://tcyxikaxkoibrqmxoozq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjeXhpa2F4a29pYnJxbXhvb3pxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU4ODgwMiwiZXhwIjoyMDkzMTY0ODAyfQ.6Dc84ZjMlzI7QiRaO_vAljc1-Zmm2PMcsTN0ogAV_Jk';

async function run() {
  try {
    console.log('--- Fetching Configuracion Cuotas ---');
    const resConfig = await fetch(`${supabaseUrl}/rest/v1/configuracion_cuotas?select=*&order=creacion.desc&limit=1`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });
    const configData = await resConfig.json();
    console.log(JSON.stringify(configData, null, 2));

    console.log('--- Fetching Miembros ---');
    const resMiembros = await fetch(`${supabaseUrl}/rest/v1/miembro?select=id,nombre,fecha_proxima_cuota,estado,monto_mensual&estado=eq.activo`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });
    const miembrosData = await resMiembros.json();
    console.log(JSON.stringify(miembrosData, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
