const fs = require('fs');
const path = require('path');

const generateSql = () => {
  const jsonPath = path.join(__dirname, 'dataset.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('No se encontró el archivo dataset.json.');
    return;
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const dataset = JSON.parse(raw);
  const data = dataset.datos;

  let sql = `-- =====================================================================\n`;
  sql += `-- SCRIPT DE CARGA DE DATASET MASIVO (INTEGRIDAD DE DATOS)\n`;
  sql += `-- =====================================================================\n\n`;
  sql += `BEGIN;\n\n`;

  // 1. Limpieza de tablas (Orden de dependencias inverso)
  const tablesToDelete = [
    'archivo', 'detalles', 'plan_amortizacion', 'inscripcion', 'jurado', 
    'cuota_membresia', 'ingreso', 'egreso', 'activos', 'actividad', 
    'miembro', 'notificacion', 'configuracion_cuotas', 'tipo_actividad', 
    'tipo_ingreso', 'tipo_egreso', 'tipo_activo', 'qr_pago'
  ];

  sql += `-- Deshabilitar triggers temporalmente para carga masiva rápida\n`;
  sql += `SET session_replication_role = 'replica';\n\n`;

  sql += `-- 1. LIMPIEZA DE TABLAS\n`;
  for (const table of tablesToDelete) {
    sql += `TRUNCATE TABLE public.${table} CASCADE;\n`;
  }
  sql += `\n`;

  // Orden de inserción
  const insertOrder = [
    { key: 'tiposActivo', table: 'tipo_activo' },
    { key: 'tiposEgreso', table: 'tipo_egreso' },
    { key: 'tiposIngreso', table: 'tipo_ingreso' },
    { key: 'tiposActividad', table: 'tipo_actividad' },
    { key: 'configCuotas', table: 'configuracion_cuotas' },
    { key: 'qrs', table: 'qr_pago' },
    { key: 'miembros', table: 'miembro' },
    { key: 'actividades', table: 'actividad' },
    { key: 'activos', table: 'activos' },
    { key: 'egresos', table: 'egreso' },
    { key: 'inscripciones', table: 'inscripcion' },
    { key: 'ingresos', table: 'ingreso' },
    { key: 'cuotas', table: 'cuota_membresia' },
    { key: 'jurados', table: 'jurado' },
    { key: 'planesAmortizacion', table: 'plan_amortizacion' },
    { key: 'detalles', table: 'detalles' },
    { key: 'archivos', table: 'archivo' },
    { key: 'notificaciones', table: 'notificacion' }
  ];

  sql += `-- 2. INSERCIÓN DE REGISTROS\n`;

  // Formateador de valores para SQL
  const formatValue = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val;
    // Si es string o fecha o uuid
    const escaped = String(val).replace(/'/g, "''");
    return `'${escaped}'`;
  };

  for (const item of insertOrder) {
    const rows = data[item.key];
    if (rows && rows.length > 0) {
      sql += `-- Tabla: ${item.table} (${rows.length} registros)\n`;
      // Obtener columnas de las llaves del primer registro
      const columns = Object.keys(rows[0]);
      const colString = columns.map(c => `"${c}"`).join(', ');

      for (const row of rows) {
        const values = columns.map(col => formatValue(row[col])).join(', ');
        sql += `INSERT INTO public.${item.table} (${colString}) VALUES (${values});\n`;
      }
      sql += `\n`;
    }
  }

  sql += `-- Restablecer triggers de sesión\n`;
  sql += `SET session_replication_role = 'origin';\n\n`;
  sql += `COMMIT;\n`;

  const outputPath = path.join(__dirname, 'dataset.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`¡Archivo SQL generado con éxito en: ${outputPath}!`);
};

generateSql();
