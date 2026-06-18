import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tcyxikaxkoibrqmxoozq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjeXhpa2F4a29pYnJxbXhvb3pxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU4ODgwMiwiZXhwIjoyMDkzMTY0ODAyfQ.6Dc84ZjMlzI7QiRaO_vAljc1-Zmm2PMcsTN0ogAV_Jk'
);

async function run() {
  const { data: ingresos } = await supabase.from('ingreso').select('*');
  console.log('--- INGRESOS ---');
  console.log(JSON.stringify(ingresos, null, 2));

  const { data: inscripciones } = await supabase.from('inscripcion').select('*');
  console.log('--- INSCRIPCIONES ---');
  console.log(JSON.stringify(inscripciones, null, 2));

  const { data: actividades } = await supabase.from('actividad').select('*');
  console.log('--- ACTIVIDADES ---');
  console.log(JSON.stringify(actividades, null, 2));
}

run();
