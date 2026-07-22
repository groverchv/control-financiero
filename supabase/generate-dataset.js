const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Helper para fechas
const getDateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const uuidv4 = () => crypto.randomUUID();

const generateDataset = () => {
  console.log('Generando dataset con cientos de registros...');

  // Catálogos e IDs básicos
  const adminId = 'c8aa2da3-040e-4bfd-a334-9e0ad4cf91f9'; // ID del admin actual para no perder acceso
  const miembroIds = [adminId];
  for (let i = 0; i < 80; i++) {
    miembroIds.push(uuidv4());
  }

  // 1. Miembros (81 miembros)
  const nombres = ['Juan', 'María', 'Pedro', 'Ana', 'Luis', 'Carla', 'Carlos', 'Sofía', 'Jorge', 'Elena', 'Miguel', 'Lucía', 'David', 'Laura', 'Roberto', 'Patricia'];
  const apellidos = ['Gómez', 'Rodríguez', 'Pérez', 'Fernández', 'López', 'Martínez', 'Sánchez', 'González', 'Álvarez', 'Díaz', 'Vasquez', 'Torres', 'Ramírez', 'Flores'];
  const profesiones = ['Ingeniero Financiero', 'Economista', 'Contador Público', 'Administrador de Empresas', 'Analista de Riesgos', 'Consultor Fiscal'];

  const miembros = [
    {
      id: adminId,
      nombre: 'Grover',
      apellidoPaterno: 'Choquevillca',
      apellidoMaterno: '80',
      correoElectronico: 'groverchoquevillca80@gmail.com',
      telefono: '77788899',
      profesion: 'Administrador de Sistemas',
      biografia: 'Administrador principal del sistema de control financiero.',
      rol: 'admin',
      estado: 'activo',
      fecha_pausa: null,
      dias_pausados: 0,
      fecha_proxima_cuota: getDateOffset(30),
      tiempo_restante_cuota: '30 days',
      monto_inscripcion: 150,
      creacion: getDateOffset(-60),
      actualizacion: getDateOffset(-60)
    }
  ];

  for (let i = 1; i < miembroIds.length; i++) {
    const rol = i < 3 ? 'secretario' : (i < 5 ? 'tesorero' : 'socio');
    const estado = i % 10 === 0 ? 'inactivo' : 'activo';
    miembros.push({
      id: miembroIds[i],
      nombre: nombres[i % nombres.length],
      apellidoPaterno: apellidos[i % apellidos.length],
      apellidoMaterno: apellidos[(i + 2) % apellidos.length],
      correoElectronico: `socio${i}_${nombres[i % nombres.length].toLowerCase()}@example.com`,
      telefono: `700010${String(i).padStart(2, '0')}`,
      profesion: profesiones[i % profesiones.length],
      biografia: `Miembro registrado en el sistema. Interesado en finanzas aplicadas.`,
      rol: rol,
      estado: estado,
      fecha_pausa: null,
      dias_pausados: 0,
      fecha_proxima_cuota: getDateOffset(Math.floor(Math.random() * 60) - 15),
      tiempo_restante_cuota: '30 days',
      monto_inscripcion: 150,
      creacion: getDateOffset(-90 - i),
      actualizacion: getDateOffset(-90 - i)
    });
  }

  // 2. Tipos de Activos (5 tipos)
  const tipoActivoIds = Array.from({ length: 5 }, () => uuidv4());
  const tipoActivoNombres = ['Mobiliario', 'Equipos de Computación', 'Bienes Raíces', 'Vehículos', 'Licencias de Software'];
  const tiposActivo = tipoActivoIds.map((id, idx) => ({
    id,
    nombre: tipoActivoNombres[idx],
    descripcion: `Categoría de activos tipo ${tipoActivoNombres[idx]} para uso institucional.`,
    creacion: getDateOffset(-120),
    actualizacion: getDateOffset(-120)
  }));

  // 3. Tipos de Actividades (5 tipos)
  const tipoActividadIds = Array.from({ length: 5 }, () => uuidv4());
  const tipoActividadNombres = ['Taller Teórico', 'Seminario Internacional', 'Congreso de Finanzas', 'Curso de Especialización', 'Foro de Debate'];
  const tiposActividad = tipoActividadIds.map((id, idx) => ({
    id,
    nombre: tipoActividadNombres[idx],
    descripcion: `Actividades del área de ${tipoActividadNombres[idx]}.`,
    creacion: getDateOffset(-120),
    actualizacion: getDateOffset(-120)
  }));

  // 4. Tipos de Ingresos (4 tipos)
  const tipoIngresoIds = Array.from({ length: 4 }, () => uuidv4());
  const tipoIngresoNombres = ['Pago de Cuota Mensual', 'Pago de Actividad', 'Donaciones', 'Inscripciones Nuevas'];
  const tiposIngreso = tipoIngresoIds.map((id, idx) => ({
    id,
    nombre: tipoIngresoNombres[idx],
    descripcion: `Ingresos clasificados como ${tipoIngresoNombres[idx]}.`,
    creacion: getDateOffset(-120),
    actualizacion: getDateOffset(-120)
  }));

  // 5. Tipos de Egresos (4 tipos)
  const tipoEgresoIds = Array.from({ length: 4 }, () => uuidv4());
  const tipoEgresoNombres = ['Pago de Activos', 'Servicios Básicos', 'Alquileres', 'Honorarios Profesionales'];
  const tiposEgreso = tipoEgresoIds.map((id, idx) => ({
    id,
    nombre: tipoEgresoNombres[idx],
    descripcion: `Egresos clasificados como ${tipoEgresoNombres[idx]}.`,
    creacion: getDateOffset(-120),
    actualizacion: getDateOffset(-120)
  }));

  // 6. Actividades (15 actividades)
  const actividades = [];
  const actividadIds = Array.from({ length: 15 }, () => uuidv4());
  for (let i = 0; i < 15; i++) {
    const estado = i < 5 ? 'finalizado' : (i < 12 ? 'programado' : 'cancelado');
    actividades.push({
      id: actividadIds[i],
      miembro_id: adminId,
      tipo_actividad_id: tipoActividadIds[i % tipoActividadIds.length],
      titulo: `Actividad Académica Especial ${i + 1}`,
      descripcion: `Descripción detallada de la actividad académica especial número ${i + 1} para profesionales.`,
      fecha: getDateOffset(i * 5 - 20).split('T')[0],
      hora: '19:00:00',
      cupos: 30 + i * 5,
      ubicacion: `Salón B-10${i % 3}`,
      latitud: -16.50000000 + (i * 0.001),
      longitud: -68.15000000 - (i * 0.001),
      modalidad: i % 3 === 0 ? 'virtual' : 'presencial',
      costo: 100 + i * 10,
      requisitos: 'Ninguno',
      incluye_certificacion: i % 2 === 0,
      estado: estado,
      publicado: true,
      creacion: getDateOffset(-60),
      actualizacion: getDateOffset(-60)
    });
  }

  // 7. Inscripciones (100 inscripciones)
  const inscripciones = [];
  const inscripcionIds = Array.from({ length: 100 }, () => uuidv4());
  for (let i = 0; i < 100; i++) {
    inscripciones.push({
      id: inscripcionIds[i],
      miembro_id: miembroIds[i % miembroIds.length],
      actividad_id: actividadIds[i % actividadIds.length],
      fecha_inscripcion: getDateOffset(-15),
      estado: i % 10 === 0 ? 'cancelado' : (i % 3 === 0 ? 'pagado' : 'confirmado'),
      creacion: getDateOffset(-15)
    });
  }

  // 8. Activos (5 activos)
  const activos = [];
  const activosIds = Array.from({ length: 5 }, () => uuidv4());
  for (let i = 0; i < 5; i++) {
    activos.push({
      id: activosIds[i],
      miembro_id: adminId,
      tipo_activo_id: tipoActivoIds[i % tipoActivoIds.length],
      nombre: `Activo Institucional ${i + 1}`,
      descripcion: `Descripción del activo ${i + 1} adquirido para oficinas de la asociación.`,
      costo_total: 5000 + i * 2000,
      saldo_pendiente: 2000 + i * 500,
      estado: i % 2 === 0 ? 'en_proceso' : 'deuda',
      fechaAdquisicion: getDateOffset(-100).split('T')[0],
      creacion: getDateOffset(-100),
      actualizacion: getDateOffset(-100)
    });
  }

  // 9. Ingresos (120 ingresos)
  const ingresos = [];
  const ingresosIds = Array.from({ length: 120 }, () => uuidv4());
  for (let i = 0; i < 120; i++) {
    const isActividad = i % 3 === 0;
    ingresos.push({
      id: ingresosIds[i],
      miembro_id: miembroIds[i % miembroIds.length],
      registrado_por: adminId,
      devuelto_por: null,
      tipo_ingreso_id: isActividad ? tipoIngresoIds[1] : tipoIngresoIds[0],
      inscripcion_id: isActividad ? inscripcionIds[i % inscripcionIds.length] : null,
      monto: isActividad ? 150.00 : 50.00,
      fecha: getDateOffset(i * -1 - 2).split('T')[0],
      descripcion: isActividad ? `Pago de inscripción de actividad.` : `Pago de cuota mensual ordinaria.`,
      estado: i % 25 === 0 ? 'devolucion' : 'pagada',
      creacion: getDateOffset(i * -1 - 2)
    });
  }

  // 10. Egresos (80 egresos)
  const egresos = [];
  const egresosIds = Array.from({ length: 80 }, () => uuidv4());
  for (let i = 0; i < 80; i++) {
    egresos.push({
      id: egresosIds[i],
      miembro_id: adminId,
      tipo_egreso_id: tipoEgresoIds[i % tipoEgresoIds.length],
      activo_id: i % 5 === 0 ? activosIds[i % activosIds.length] : null,
      concepto: `Compra de insumos o servicios varios ${i + 1}`,
      monto: 200 + i * 50,
      fecha: getDateOffset(i * -1 - 3).split('T')[0],
      descripcion: `Factura de compra factura_00${i + 1}.pdf`,
      creacion: getDateOffset(i * -1 - 3)
    });
  }

  // 11. Detalles (150 detalles de egresos)
  const detalles = [];
  for (let i = 0; i < 150; i++) {
    detalles.push({
      id: uuidv4(),
      egreso_id: egresosIds[i % egresosIds.length],
      nombre: `Detalle específico ${i + 1}`,
      fecha: getDateOffset(-30).split('T')[0],
      descripcion: `Detalle del egreso número ${i + 1}`,
      creacion: getDateOffset(-30)
    });
  }

  // 12. Cuotas de Membresía (200 cuotas)
  const cuotas = [];
  for (let i = 0; i < 200; i++) {
    const estado = i % 3 === 0 ? 'pagado' : 'pendiente';
    const month = String((i % 12) + 1).padStart(2, '0');
    const year = 2025 + Math.floor(i / 12);
    cuotas.push({
      id: uuidv4(),
      miembro_id: miembroIds[i % miembroIds.length],
      configuracion_id: null,
      periodo: `${year}-${month}`,
      monto_esperado: 50.00,
      estado: estado,
      ingreso_id: estado === 'pagado' ? ingresosIds[i % ingresosIds.length] : null,
      creacion: getDateOffset(-60 + Math.floor(i / 3))
    });
  }

  // 13. Notificaciones (150 notificaciones)
  const notificaciones = [];
  for (let i = 0; i < 150; i++) {
    notificaciones.push({
      id: uuidv4(),
      miembro_id: miembroIds[i % miembroIds.length],
      titulo: `Recordatorio de Deuda de Cuota ${i + 1}`,
      descripcion: `Estimado miembro, se le comunica que tiene cuotas pendientes de pago. Por favor cancele a la brevedad.`,
      estado: i % 4 === 0 ? 'leido' : 'pendiente',
      creacion: getDateOffset(i * -1)
    });
  }

  // 14. Jurados (15 jurados)
  const jurados = [];
  for (let i = 0; i < 15; i++) {
    jurados.push({
      id: uuidv4(),
      miembro_id: miembroIds[i % miembroIds.length],
      actividad_id: actividadIds[i % actividadIds.length],
      actividad_externa: null,
      descripcion: `Jurado asignado para calificar la presentación académica ${i + 1}`,
      fecha_asignacion: getDateOffset(-40),
      creacion: getDateOffset(-40),
      actualizacion: getDateOffset(-40)
    });
  }

  // 15. Planes de Amortización (60 cuotas de amortización)
  const planesAmortizacion = [];
  for (let i = 0; i < 60; i++) {
    const estado = i % 4 === 0 ? 'pagado' : 'pendiente';
    planesAmortizacion.push({
      id: uuidv4(),
      activo_id: activosIds[i % activosIds.length],
      numero: (i % 12) + 1,
      fecha_vencimiento: getDateOffset(i * 10 - 20).split('T')[0],
      monto: 250.00,
      estado: estado,
      creacion: getDateOffset(-80),
      actualizacion: getDateOffset(-80)
    });
  }

  // 16. Archivos (30 archivos)
  const archivos = [];
  for (let i = 0; i < 30; i++) {
    archivos.push({
      id: uuidv4(),
      miembro_id: miembroIds[i % miembroIds.length],
      ingreso_id: i % 3 === 0 ? ingresosIds[i % ingresosIds.length] : null,
      egreso_id: i % 3 === 1 ? egresosIds[i % egresosIds.length] : null,
      activo_id: i % 3 === 2 ? activosIds[i % activosIds.length] : null,
      actividad_id: null,
      url: `https://tcyxikaxkoibrqmxoozq.supabase.co/storage/v1/object/public/comprobantes/archivo_${i + 1}.pdf`,
      tipo: 'application/pdf',
      estado: 'activo',
      creacion: getDateOffset(-20),
      actualizacion: getDateOffset(-20)
    });
  }

  // 17. Configuracion de Cuotas (1 configuración)
  const configCuotas = [
    {
      singleton_guard: true,
      pausado: false,
      fecha_pausa: null,
      dias_pausados: 0,
      frecuencia: 'mes',
      monto_cuota: 50,
      dias_recordatorio_activos: 10,
      creacion: getDateOffset(-120),
      actualizacion: getDateOffset(-120)
    }
  ];

  // Consolidación en el objeto final
  const dataset = {
    generacion: new Date().toLocaleString('es-ES'),
    datos: {
      miembros,
      tiposActivo,
      tiposActividad,
      tiposIngreso,
      tiposEgreso,
      actividades,
      inscripciones,
      activos,
      ingresos,
      egresos,
      detalles,
      cuotas,
      notificaciones,
      jurados,
      planesAmortizacion,
      archivos,
      configCuotas
    }
  };

  const outputPath = path.join(__dirname, 'dataset.json');
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2), 'utf-8');
  console.log(`¡Dataset generado exitosamente con cientos de registros relacionales en: ${outputPath}!`);
};

generateDataset();
