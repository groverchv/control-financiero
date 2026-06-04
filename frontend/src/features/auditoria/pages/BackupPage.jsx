import { useState } from 'react';
import { supabase } from '../../../services/supabase';
import { Database, Download, FileSpreadsheet, FileText, FileDown, CheckCircle2, AlertCircle, RefreshCw, Info, Wallet, Box } from 'lucide-react';
import { Button, Spinner } from '../../../components/ui';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const BackupPage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [fetchProgress, setFetchProgress] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      // 1. Miembros
      setFetchProgress('Descargando miembros...');
      const { data: miembros, error: mErr } = await supabase.from('miembro').select('*').order('creacion', { ascending: false });
      if (mErr) throw mErr;

      // 2. Notificaciones
      setFetchProgress('Descargando notificaciones...');
      const { data: notificaciones, error: nErr } = await supabase.from('notificacion').select('*').order('creacion', { ascending: false });
      if (nErr) throw nErr;

      // 3. Tipos Actividad
      setFetchProgress('Descargando tipos de actividad...');
      const { data: tiposActividad, error: taErr } = await supabase.from('tipo_actividad').select('*').order('creacion', { ascending: false });
      if (taErr) throw taErr;

      // 4. Actividades
      setFetchProgress('Descargando actividades...');
      const { data: actividades, error: aErr } = await supabase.from('actividad').select('*').order('creacion', { ascending: false });
      if (aErr) throw aErr;

      // 5. Inscripciones
      setFetchProgress('Descargando inscripciones...');
      const { data: inscripciones, error: insErr } = await supabase.from('inscripcion').select('*').order('creacion', { ascending: false });
      if (insErr) throw insErr;

      // 6. Cuotas de Membresía
      setFetchProgress('Descargando cuotas...');
      const { data: cuotas, error: cErr } = await supabase.from('cuota_membresia').select('*').order('creacion', { ascending: false });
      if (cErr) throw cErr;

      // 7. Tipos Ingreso
      setFetchProgress('Descargando tipos de ingresos...');
      const { data: tiposIngreso, error: tiErr } = await supabase.from('tipo_ingreso').select('*').order('creacion', { ascending: false });
      if (tiErr) throw tiErr;

      // 8. Tipos Egreso
      setFetchProgress('Descargando tipos de egresos...');
      const { data: tiposEgreso, error: teErr } = await supabase.from('tipo_egreso').select('*').order('creacion', { ascending: false });
      if (teErr) throw teErr;

      // 9. Ingresos
      setFetchProgress('Descargando ingresos...');
      const { data: ingresos, error: iErr } = await supabase.from('ingreso').select('*').order('creacion', { ascending: false });
      if (iErr) throw iErr;

      // 10. Egresos
      setFetchProgress('Descargando egresos...');
      const { data: egresos, error: eErr } = await supabase.from('egreso').select('*').order('creacion', { ascending: false });
      if (eErr) throw eErr;

      // 11. Detalles Egresos
      setFetchProgress('Descargando detalles de egresos...');
      const { data: detalles, error: dErr } = await supabase.from('detalles').select('*').order('creacion', { ascending: false });
      if (dErr) throw dErr;

      // 12. Archivos
      setFetchProgress('Descargando archivos adjuntos...');
      const { data: archivos, error: arErr } = await supabase.from('archivo').select('*').order('creacion', { ascending: false });
      if (arErr) throw arErr;

      // 13. Jurados
      setFetchProgress('Descargando jurados...');
      const { data: jurados, error: jErr } = await supabase.from('jurado').select('*').order('creacion', { ascending: false });
      if (jErr) throw jErr;

      // 14. Configuraciones Cuotas
      setFetchProgress('Descargando configuraciones generales...');
      const { data: configCuotas, error: ccErr } = await supabase.from('configuracion_cuotas').select('*').order('creacion', { ascending: false });
      if (ccErr) throw ccErr;

      // 15. Tipos Activos
      setFetchProgress('Descargando tipos de activos...');
      const { data: tiposActivo, error: tacErr } = await supabase.from('tipo_activo').select('*').order('creacion', { ascending: false });
      if (tacErr) throw tacErr;

      // 16. Activos
      setFetchProgress('Descargando activos...');
      const { data: activos, error: acErr } = await supabase.from('activos').select('*').order('creacion', { ascending: false });
      if (acErr) throw acErr;

      // 17. Planes de Amortización
      setFetchProgress('Descargando planes de amortización...');
      const { data: planAmortizacion, error: paErr } = await supabase.from('plan_amortizacion').select('*').order('creacion', { ascending: false });
      if (paErr) throw paErr;

      setFetchProgress('Procesando y consolidando base de datos...');
      setData({
        miembros: miembros || [],
        notificaciones: notificaciones || [],
        tiposActividad: tiposActividad || [],
        actividades: actividades || [],
        inscripciones: inscripciones || [],
        cuotas: cuotas || [],
        tiposIngreso: tiposIngreso || [],
        tiposEgreso: tiposEgreso || [],
        ingresos: ingresos || [],
        egresos: egresos || [],
        detalles: detalles || [],
        archivos: archivos || [],
        jurados: jurados || [],
        configCuotas: configCuotas || [],
        tiposActivo: tiposActivo || [],
        activos: activos || [],
        planAmortizacion: planAmortizacion || []
      });
      setFetchProgress('');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'No se pudieron descargar los datos de la base de datos.');
      setFetchProgress('');
    } finally {
      setLoading(false);
    }
  };

  const getKpiDataList = () => {
    if (!data) return [];
    const totalMiembros = data.miembros.length;
    const activosMiembros = data.miembros.filter(m => m.estado === 'activo').length;
    const inactivosMiembros = data.miembros.filter(m => m.estado === 'inactivo').length;
    const tasaRetencion = totalMiembros > 0 ? ((activosMiembros / totalMiembros) * 100).toFixed(2) + '%' : '100%';

    const totalIngresos = data.ingresos.reduce((sum, i) => sum + Number(i.monto || 0), 0);
    const totalEgresos = data.egresos.reduce((sum, e) => sum + Number(e.monto || 0), 0);
    const saldoNeto = totalIngresos - totalEgresos;
    const margenSuperavit = totalIngresos > 0 ? ((saldoNeto / totalIngresos) * 100).toFixed(2) + '%' : '0.00%';

    const totalCuotas = data.cuotas.length;
    const cuotasPagadas = data.cuotas.filter(c => c.estado === 'pagado').length;
    const tasaCobroCuotas = totalCuotas > 0 ? ((cuotasPagadas / totalCuotas) * 100).toFixed(2) + '%' : '100%';

    const totalActivos = data.activos.length;
    const valorPatrimonial = data.activos.reduce((sum, a) => sum + Number(a.costo_total || 0), 0);

    return [
      { 'Categoría': 'Membresías', 'Métrica': 'Total Socios', 'Valor': totalMiembros, 'Descripción': 'Cantidad de socios registrados' },
      { 'Categoría': 'Membresías', 'Métrica': 'Socios Activos', 'Valor': activosMiembros, 'Descripción': 'Socios con acceso habilitado' },
      { 'Categoría': 'Membresías', 'Métrica': 'Socios Inactivos', 'Valor': inactivosMiembros, 'Descripción': 'Socios dados de baja' },
      { 'Categoría': 'Membresías', 'Métrica': 'Tasa de Retención', 'Valor': tasaRetencion, 'Descripción': 'Porcentaje de socios habilitados' },
      
      { 'Categoría': 'Finanzas', 'Métrica': 'Ingresos Totales (Bs)', 'Valor': totalIngresos, 'Descripción': 'Recaudación bruta registrada' },
      { 'Categoría': 'Finanzas', 'Métrica': 'Egresos Totales (Bs)', 'Valor': totalEgresos, 'Descripción': 'Gastos brutos de caja registrados' },
      { 'Categoría': 'Finanzas', 'Métrica': 'Saldo Neto Caja (Bs)', 'Valor': saldoNeto, 'Descripción': 'Diferencia neta (Ingresos - Egresos)' },
      { 'Categoría': 'Finanzas', 'Métrica': 'Margen Superávit', 'Valor': margenSuperavit, 'Descripción': 'Relación beneficio / ingresos' },
      
      { 'Categoría': 'Cobros', 'Métrica': 'Total Cuotas Generadas', 'Valor': totalCuotas, 'Descripción': 'Membresías emitidas' },
      { 'Categoría': 'Cobros', 'Métrica': 'Cuotas Liquidadas', 'Valor': cuotasPagadas, 'Descripción': 'Membresías pagadas' },
      { 'Categoría': 'Cobros', 'Métrica': 'Tasa de Cobro', 'Valor': tasaCobroCuotas, 'Descripción': 'Porcentaje de cuotas pagadas' },
      
      { 'Categoría': 'Patrimonio', 'Métrica': 'Activos Fijos', 'Valor': totalActivos, 'Descripción': 'Cantidad de activos en inventario' },
      { 'Categoría': 'Patrimonio', 'Métrica': 'Valor Patrimonial (Bs)', 'Valor': valorPatrimonial, 'Descripción': 'Valor total de los activos en inventario' },
      { 'Categoría': 'Académico', 'Métrica': 'Total Actividades', 'Valor': data.actividades.length, 'Descripción': 'Cursos y seminarios organizados' },
    ];
  };

  const handleDownloadExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // Función auxiliar para agregar hojas de Excel con nombres seguros (<31 chars)
    const addSheet = (sheetData, sheetName) => {
      const ws = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    // Agregar hoja inicial con KPIs y métricas
    addSheet(getKpiDataList(), "Resumen KPIs");

    addSheet(data.miembros, "Miembros");
    addSheet(data.notificaciones, "Notificaciones");
    addSheet(data.tiposActividad, "Tipos Actividad");
    addSheet(data.actividades, "Actividades");
    addSheet(data.inscripciones, "Inscripciones");
    addSheet(data.cuotas, "Cuotas Membresía");
    addSheet(data.tiposIngreso, "Tipos Ingreso");
    addSheet(data.tiposEgreso, "Tipos Egreso");
    addSheet(data.ingresos, "Ingresos");
    addSheet(data.egresos, "Egresos");
    addSheet(data.detalles, "Detalles Egresos");
    addSheet(data.archivos, "Archivos Adjuntos");
    addSheet(data.jurados, "Jurados");
    addSheet(data.configCuotas, "Configuraciones Cuota");
    addSheet(data.tiposActivo, "Tipos Activo");
    addSheet(data.activos, "Activos");
    addSheet(data.planAmortizacion, "Planes Amortización");

    XLSX.writeFile(wb, `Respaldo_Completo_Base_Datos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadCsv = () => {
    if (!data) return;
    const todos = [
      ...data.ingresos.map(i => ({ ...i, __tipo: 'INGRESO' })),
      ...data.egresos.map(e => ({ ...e, __tipo: 'EGRESO' }))
    ].sort((a, b) => new Date(b.creacion || 0) - new Date(a.creacion || 0));

    const csvRows = [
      'sep=,',
      ['Fecha', 'Tipo de Movimiento', 'Concepto/Descripcion', 'Monto (Bs)'].join(',')
    ];

    todos.forEach(item => {
      const fecha = item.creacion ? new Date(item.creacion).toLocaleString('es-ES').replace(/,/g, '') : '—';
      const tipo = item.__tipo;
      const concepto = (item.descripcion || item.concepto || 'Sin concepto').replace(/"/g, '""').replace(/,/g, ';');
      const monto = item.monto || 0;
      csvRows.push(`"${fecha}","${tipo}","${concepto}",${monto}`);
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Libro_Mayor_Consolidado_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTxt = () => {
    if (!data) return;
    // Exportamos la estructura completa incluyendo los KPIs calculados en un archivo JSON estructurado
    const backupObj = {
      generacion: new Date().toLocaleString('es-ES'),
      kpis: getKpiDataList(),
      datos: data
    };
    const jsonContent = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Copia_Seguridad_Total_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPdf = () => {
    if (!data) return;
    const doc = new jsPDF();

    // Cabecera del reporte
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text("Respaldo y Auditoría Total de Datos", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha y hora de generación: ${new Date().toLocaleString('es-ES')}`, 14, 27);
    doc.text("Sistema de Control Financiero y Académico Institucional", 14, 32);

    // Tabla de KPIs principales
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Métricas Clave de Gestión (KPIs)", 14, 45);

    const kpiBody = getKpiDataList().map(k => [
      k.Categoría,
      k.Métrica,
      k.Valor,
      k.Descripción
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Categoría', 'Indicador', 'Valor', 'Descripción']],
      body: kpiBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }, // slate-800
      styles: { fontSize: 8, font: 'helvetica' }
    });

    // Nueva Página: Tabla de Miembros
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen de Miembros Activos/Inactivos", 14, 20);

    const miembrosBody = data.miembros.map((m, idx) => [
      idx + 1,
      `${m.nombre} ${m.apellidoPaterno || ''}`,
      m.correoElectronico,
      m.rol,
      m.estado
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['#', 'Nombre Completo', 'Correo', 'Rol', 'Estado']],
      body: miembrosBody.slice(0, 15), // Primeros 15 para mantener el PDF compacto
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8, font: 'helvetica' }
    });

    doc.save(`Respaldo_Auditoría_Total_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5 border-b pb-5">
        <div className="flex items-center gap-2 text-blue-600">
          <Database className="h-6 w-6 stroke-[2.5]" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Copia de Seguridad y Respaldo Total</h1>
        </div>
        <p className="text-sm text-slate-500">
          Descarga una copia completa de seguridad del 100% de la base de datos (17 tablas operativas). Ideal para almacenamiento en frío e importación directa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KPI Miembros */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Info className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Miembros</span>
            <span className="text-2xl font-black text-slate-700">{data ? data.miembros.length : '—'}</span>
          </div>
        </div>

        {/* KPI Caja */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Registros Financieros</span>
            <span className="text-2xl font-black text-slate-700">{data ? data.ingresos.length + data.egresos.length + data.cuotas.length : '—'}</span>
          </div>
        </div>

        {/* KPI Actividades/Activos */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Box className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Activos & Estructuras</span>
            <span className="text-2xl font-black text-slate-700">{data ? data.actividades.length + data.activos.length + data.archivos.length : '—'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-800">Generar Respaldo Total de Base de Datos</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Haz clic en "Cargar datos de la BD" para sincronizar la totalidad de los esquemas relacionales.
            </p>
          </div>
          <Button
            onClick={fetchAllData}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Cargando datos...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Cargar datos de la BD
              </>
            )}
          </Button>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Spinner size="lg" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">
              {fetchProgress}
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 text-red-800 rounded-xl text-sm leading-relaxed">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-bold">Error en la extracción</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-start gap-3 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs sm:text-sm leading-relaxed">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900">Extracción de 17 Tablas Completa</p>
                <p className="text-emerald-700">
                  Se ha generado la copia en memoria de la base de datos de manera íntegra. Todo está listo para ser descargado a tu computador.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Opción Excel */}
              <div className="border border-slate-100 hover:border-emerald-200 bg-slate-50/50 hover:bg-emerald-50/10 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md group">
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Libro de Excel Total (.xlsx)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Genera un único archivo de Excel con <strong>17 hojas independientes</strong>, abarcando miembros, finanzas, patrimonio, académicos y configuraciones sin excepciones.
                  </p>
                </div>
                <Button
                  onClick={handleDownloadExcel}
                  className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95 transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar Excel (.xlsx)
                </Button>
              </div>

              {/* Opción PDF */}
              <div className="border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/10 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md group">
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit group-hover:scale-110 transition-transform">
                    <FileDown className="h-6 w-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Reporte de Auditoría PDF (.pdf)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Genera un reporte auditado y ordenado para presentación ejecutiva o firma oficial con métricas consolidadas.
                  </p>
                </div>
                <Button
                  onClick={handleDownloadPdf}
                  className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 active:scale-95 transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar Reporte PDF
                </Button>
              </div>

              {/* Opción CSV */}
              <div className="border border-slate-100 hover:border-amber-200 bg-slate-50/50 hover:bg-amber-50/10 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md group">
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Historial de Caja (.csv)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Exporta un reporte CSV con el historial cronológico consolidado del Libro Mayor (Ingresos y Egresos combinados).
                  </p>
                </div>
                <Button
                  onClick={handleDownloadCsv}
                  className="mt-5 w-full bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 active:scale-95 transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar Libro Mayor CSV
                </Button>
              </div>

              {/* Opción JSON */}
              <div className="border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md group">
                <div className="space-y-3">
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-xl w-fit group-hover:scale-110 transition-transform">
                    <Database className="h-6 w-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Volcado JSON de Datos (.json)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Copia de seguridad en formato crudo estructurado (JSON) que preserva llaves primarias, UUIDs y timestamps exactos.
                  </p>
                </div>
                <Button
                  onClick={handleDownloadTxt}
                  className="mt-5 w-full bg-slate-600 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar Base JSON
                </Button>
              </div>
            </div>
          </div>
        )}

        {!data && !loading && (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Database className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm font-semibold mb-1">Sin datos cargados en memoria local</p>
            <p className="text-xs text-slate-400 mb-4">
              Haz clic en el botón superior derecho para iniciar la extracción total (17 tablas) desde Supabase.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
