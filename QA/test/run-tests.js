const fs = require('fs');
const path = require('path');

// Resolver dependencias desde el directorio node_modules de frontend
module.paths.push(path.join(__dirname, '..', '..', 'frontend', 'node_modules'));

const { createClient } = require('@supabase/supabase-js');

// 1. Cargar variables de entorno desde frontend/.env
const envPath = path.join(__dirname, '..', '..', 'frontend', '.env');
if (!fs.existsSync(envPath)) {
  console.error(`Error: No se encontró el archivo .env en: ${envPath}`);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    envVars[match[1]] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env');
  process.exit(1);
}

console.log('Inicializando cliente de Supabase...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const runTests = async () => {
  console.log('\n==================================================');
  console.log('⚡ EJECUTANDO PRUEBAS DE QA - CONTROL FINANCIERO');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      failed++;
    }
  };

  try {
    // ----------------------------------------------------
    // GRUPO 1: PRUEBAS UNITARIAS (Validators)
    // ----------------------------------------------------
    console.log('🔄 Grupo 1: Validadores de Datos (frontend/src/utils/validators.js)...');
    
    // Importación dinámica del módulo ES6
    const validatorsPath = 'file:///' + path.join(__dirname, '..', '..', 'frontend', 'src', 'utils', 'validators.js').replace(/\\/g, '/');
    const validators = await import(validatorsPath);

    // Test: isValidEmail
    assert(validators.isValidEmail('test@example.com') === true, 'isValidEmail - correo válido');
    assert(validators.isValidEmail('test@example') === false, 'isValidEmail - correo sin TLD');
    assert(validators.isValidEmail('testexample.com') === false, 'isValidEmail - correo sin @');
    assert(validators.isValidEmail('') === false, 'isValidEmail - correo vacío');

    // Test: isValidPhone
    assert(validators.isValidPhone('77788899') === true, 'isValidPhone - teléfono válido de 8 dígitos');
    assert(validators.isValidPhone('123456') === false, 'isValidPhone - teléfono corto');
    assert(validators.isValidPhone('  777-888-99 ') === true, 'isValidPhone - teléfono con formato y espacios');

    // Test: isValidCurrency
    assert(validators.isValidCurrency(150) === true, 'isValidCurrency - monto entero positivo');
    assert(validators.isValidCurrency(99.99) === true, 'isValidCurrency - monto decimal positivo');
    assert(validators.isValidCurrency(-10) === false, 'isValidCurrency - monto negativo');

    // Test: isStrongPassword
    assert(validators.isStrongPassword('12345678') === true, 'isStrongPassword - contraseña de 8 caracteres');
    assert(validators.isStrongPassword('12345') === false, 'isStrongPassword - contraseña corta');

    // Test: isValidUUID
    assert(validators.isValidUUID('c8aa2da3-040e-4bfd-a334-9e0ad4cf91f9') === true, 'isValidUUID - UUID v4 válido');
    assert(validators.isValidUUID('invalid-uuid') === false, 'isValidUUID - UUID inválido');

    // ----------------------------------------------------
    // GRUPO 2: PRUEBAS UNITARIAS (Sanitizer)
    // ----------------------------------------------------
    console.log('\n🔄 Grupo 2: Sanitización contra XSS (frontend/src/utils/sanitize.js)...');
    
    const sanitizePath = 'file:///' + path.join(__dirname, '..', '..', 'frontend', 'src', 'utils', 'sanitize.js').replace(/\\/g, '/');
    const sanitize = await import(sanitizePath);

    // Test: sanitizeString
    const xssString = '<script>alert("XSS")</script>';
    const sanitizedStr = sanitize.sanitizeString(xssString);
    assert(!sanitizedStr.includes('<') && !sanitizedStr.includes('>'), 'sanitizeString - remueve o escapa tags HTML');
    assert(sanitizedStr === '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;', 'sanitizeString - escapa caracteres correctamente');

    // Test: sanitizeObject
    const rawPayload = {
      nombre: '<b>Juan</b>',
      correo: 'juan@test.com',
      contrasena: 'my_<secure>_password' // Las contraseñas deben estar exentas para no romper contraseñas complejas
    };
    const sanitizedPayload = sanitize.sanitizeObject(rawPayload);
    assert(sanitizedPayload.nombre === '&lt;b&gt;Juan&lt;&#x2F;b&gt;', 'sanitizeObject - sanitiza cadenas de texto en objetos');
    assert(sanitizedPayload.contrasena === 'my_<secure>_password', 'sanitizeObject - no altera las contraseñas');

    // ----------------------------------------------------
    // GRUPO 3: PRUEBAS DE INTEGRACIÓN (Supabase API Pública)
    // ----------------------------------------------------
    console.log('\n🔄 Grupo 3: Conectividad y Consistencia de API Pública (Supabase)...');

    // Test: Fetch de Actividades Públicas
    const { data: publicActivities, error: actError } = await supabase
      .from('actividad')
      .select('*')
      .eq('publicado', true)
      .limit(5);

    assert(!actError, `Conexión con Supabase y lectura de tabla 'actividad': ${actError?.message || 'OK'}`);
    if (publicActivities) {
      assert(Array.isArray(publicActivities), 'La respuesta de actividades es una lista');
      console.log(` ℹ️ Info: Se encontraron ${publicActivities.length} actividades públicas en base de datos.`);
    }

    // Test: Fetch de Tipos de Actividades
    const { data: typesAct, error: typesActErr } = await supabase
      .from('tipo_actividad')
      .select('id, nombre')
      .limit(5);
    
    assert(!typesActErr, `Lectura de catálogo 'tipo_actividad' pública: ${typesActErr?.message || 'OK'}`);
    if (typesAct) {
      assert(Array.isArray(typesAct), 'La respuesta de tipo_actividad es una lista');
    }

  } catch (err) {
    console.error('Error crítico durante la ejecución del test runner:', err);
    failed++;
  } finally {
    console.log('\n==================================================');
    console.log('📊 RESUMEN GENERAL DE QA');
    console.log('==================================================');
    console.log(`Pruebas Unitarias/Integración Exitosas: ${passed}`);
    console.log(`Pruebas Unitarias/Integración Fallidas: ${failed}`);
    console.log(`Resultado General: ${failed === 0 ? 'Exitoso (Todo Correcto) 🎉' : 'Error (Fallas Encontradas) ❌'}`);
    console.log('==================================================\n');

    process.exit(failed === 0 ? 0 : 1);
  }
};

runTests();
