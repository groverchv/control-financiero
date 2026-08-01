import { useState } from "react";
import { supabase } from "../../../services/supabase";
import {
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  Wallet,
  Box,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { Button, Spinner, Modal } from "../../../components/ui";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const BackupPage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [fetchProgress, setFetchProgress] = useState("");

  // Estados para restauración JSON
  const [importFile, setImportFile] = useState(null);
  const [importFileName, setImportFileName] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [confirmKeyword, setConfirmKeyword] = useState("");

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      // 1. Miembros (Excluyendo contrasena y otros datos hiper-sensibles)
      setFetchProgress("Descargando miembros...");
      const { data: miembros, error: mErr } = await supabase
        .from("miembro")
        .select(
          'id, nombre, "apellidoPaterno", "apellidoMaterno", "correoElectronico", telefono, rol, estado, creacion, profesion, fecha_pausa, tiempo_restante_cuota, fecha_proxima_cuota, monto_inscripcion',
        )
        .order("creacion", { ascending: false });
      if (mErr) throw mErr;

      // 2. Notificaciones
      setFetchProgress("Descargando notificaciones...");
      const { data: notificaciones, error: nErr } = await supabase
        .from("notificacion")
        .select("*")
        .order("creacion", { ascending: false });
      if (nErr) throw nErr;

      // 3. Tipos Actividad
      setFetchProgress("Descargando tipos de actividad...");
      const { data: tiposActividad, error: taErr } = await supabase
        .from("tipo_actividad")
        .select("*")
        .order("creacion", { ascending: false });
      if (taErr) throw taErr;

      // 4. Actividades
      setFetchProgress("Descargando actividades...");
      const { data: actividades, error: aErr } = await supabase
        .from("actividad")
        .select("*")
        .order("creacion", { ascending: false });
      if (aErr) throw aErr;

      // 5. Inscripciones
      setFetchProgress("Descargando inscripciones...");
      const { data: inscripciones, error: insErr } = await supabase
        .from("inscripcion")
        .select("*")
        .order("creacion", { ascending: false });
      if (insErr) throw insErr;

      // 6. Cuotas de Membresía
      setFetchProgress("Descargando cuotas...");
      const { data: cuotas, error: cErr } = await supabase
        .from("cuota_membresia")
        .select("*")
        .order("creacion", { ascending: false });
      if (cErr) throw cErr;

      // 7. Tipos Ingreso
      setFetchProgress("Descargando tipos de ingresos...");
      const { data: tiposIngreso, error: tiErr } = await supabase
        .from("tipo_ingreso")
        .select("*")
        .order("creacion", { ascending: false });
      if (tiErr) throw tiErr;

      // 8. Tipos Egreso
      setFetchProgress("Descargando tipos de egresos...");
      const { data: tiposEgreso, error: teErr } = await supabase
        .from("tipo_egreso")
        .select("*")
        .order("creacion", { ascending: false });
      if (teErr) throw teErr;

      // 9. Ingresos
      setFetchProgress("Descargando ingresos...");
      const { data: ingresos, error: iErr } = await supabase
        .from("ingreso")
        .select("*")
        .order("creacion", { ascending: false });
      if (iErr) throw iErr;

      // 10. Egresos
      setFetchProgress("Descargando egresos...");
      const { data: egresos, error: eErr } = await supabase
        .from("egreso")
        .select("*")
        .order("creacion", { ascending: false });
      if (eErr) throw eErr;

      // 11. Detalles Egresos
      setFetchProgress("Descargando detalles de egresos...");
      const { data: detalles, error: dErr } = await supabase
        .from("detalles")
        .select("*")
        .order("creacion", { ascending: false });
      if (dErr) throw dErr;

      // 12. Archivos
      setFetchProgress("Descargando archivos adjuntos...");
      const { data: archivos, error: arErr } = await supabase
        .from("archivo")
        .select("*")
        .order("creacion", { ascending: false });
      if (arErr) throw arErr;

      // 13. Jurados
      setFetchProgress("Descargando jurados...");
      const { data: jurados, error: jErr } = await supabase
        .from("jurado")
        .select("*")
        .order("creacion", { ascending: false });
      if (jErr) throw jErr;

      // 14. Configuraciones Cuotas
      setFetchProgress("Descargando configuraciones generales...");
      const { data: configCuotas, error: ccErr } = await supabase
        .from("configuracion_cuotas")
        .select("*")
        .order("creacion", { ascending: false });
      if (ccErr) throw ccErr;

      // 15. Tipos Activos
      setFetchProgress("Descargando tipos de activos...");
      const { data: tiposActivo, error: tacErr } = await supabase
        .from("tipo_activo")
        .select("*")
        .order("creacion", { ascending: false });
      if (tacErr) throw tacErr;

      // 16. Activos
      setFetchProgress("Descargando activos...");
      const { data: activos, error: acErr } = await supabase
        .from("activos")
        .select("*")
        .order("creacion", { ascending: false });
      if (acErr) throw acErr;

      // 17. Planes de Amortización
      setFetchProgress("Descargando planes de amortización...");
      const { data: planAmortizacion, error: paErr } = await supabase
        .from("plan_amortizacion")
        .select("*")
        .order("creacion", { ascending: false });
      if (paErr) throw paErr;

      const backupDataObj = {
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
        planAmortizacion: planAmortizacion || [],
      };
      setData(backupDataObj);
      window.tmp_backup_data = backupDataObj;
      setFetchProgress("");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron descargar los datos de la base de datos.",
      );
      setFetchProgress("");
    } finally {
      setLoading(false);
    }
  };

  const getKpiDataList = () => {
    if (!data) return [];
    const totalMiembros = data.miembros.length;
    const activosMiembros = data.miembros.filter(
      (m) => m.estado === "activo",
    ).length;
    const inactivosMiembros = data.miembros.filter(
      (m) => m.estado === "inactivo",
    ).length;
    const tasaRetencion =
      totalMiembros > 0
        ? ((activosMiembros / totalMiembros) * 100).toFixed(2) + "%"
        : "100%";

    const totalIngresos = data.ingresos.reduce(
      (sum, i) => sum + Number(i.monto || 0),
      0,
    );
    const totalEgresos = data.egresos.reduce(
      (sum, e) => sum + Number(e.monto || 0),
      0,
    );
    const saldoNeto = totalIngresos - totalEgresos;
    const margenSuperavit =
      totalIngresos > 0
        ? ((saldoNeto / totalIngresos) * 100).toFixed(2) + "%"
        : "0.00%";

    const totalCuotas = data.cuotas.length;
    const cuotasPagadas = data.cuotas.filter(
      (c) => c.estado === "pagado",
    ).length;
    const tasaCobroCuotas =
      totalCuotas > 0
        ? ((cuotasPagadas / totalCuotas) * 100).toFixed(2) + "%"
        : "100%";

    const totalActivos = data.activos.length;
    const valorPatrimonial = data.activos.reduce(
      (sum, a) => sum + Number(a.costo_total || 0),
      0,
    );

    return [
      {
        Categoría: "Membresías",
        Métrica: "Total Socios",
        Valor: totalMiembros,
        Descripción: "Cantidad de socios registrados",
      },
      {
        Categoría: "Membresías",
        Métrica: "Socios Activos",
        Valor: activosMiembros,
        Descripción: "Socios con acceso habilitado",
      },
      {
        Categoría: "Membresías",
        Métrica: "Socios Inactivos",
        Valor: inactivosMiembros,
        Descripción: "Socios dados de baja",
      },
      {
        Categoría: "Membresías",
        Métrica: "Tasa de Retención",
        Valor: tasaRetencion,
        Descripción: "Porcentaje de socios habilitados",
      },

      {
        Categoría: "Finanzas",
        Métrica: "Ingresos Totales (Bs)",
        Valor: totalIngresos,
        Descripción: "Recaudación bruta registrada",
      },
      {
        Categoría: "Finanzas",
        Métrica: "Egresos Totales (Bs)",
        Valor: totalEgresos,
        Descripción: "Gastos brutos de caja registrados",
      },
      {
        Categoría: "Finanzas",
        Métrica: "Saldo Neto Caja (Bs)",
        Valor: saldoNeto,
        Descripción: "Diferencia neta (Ingresos - Egresos)",
      },
      {
        Categoría: "Finanzas",
        Métrica: "Margen Superávit",
        Valor: margenSuperavit,
        Descripción: "Relación beneficio / ingresos",
      },

      {
        Categoría: "Cobros",
        Métrica: "Total Cuotas Generadas",
        Valor: totalCuotas,
        Descripción: "Membresías emitidas",
      },
      {
        Categoría: "Cobros",
        Métrica: "Cuotas Liquidadas",
        Valor: cuotasPagadas,
        Descripción: "Membresías pagadas",
      },
      {
        Categoría: "Cobros",
        Métrica: "Tasa de Cobro",
        Valor: tasaCobroCuotas,
        Descripción: "Porcentaje de cuotas pagadas",
      },

      {
        Categoría: "Patrimonio",
        Métrica: "Activos Fijos",
        Valor: totalActivos,
        Descripción: "Cantidad de activos en inventario",
      },
      {
        Categoría: "Patrimonio",
        Métrica: "Valor Patrimonial (Bs)",
        Valor: valorPatrimonial,
        Descripción: "Valor total de los activos en inventario",
      },
      {
        Categoría: "Académico",
        Métrica: "Total Actividades",
        Valor: data.actividades.length,
        Descripción: "Cursos y seminarios organizados",
      },
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

    XLSX.writeFile(
      wb,
      `Respaldo_Completo_Base_Datos_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handleDownloadTxt = () => {
    if (!data) return;

    let report = "";
    report +=
      "================================================================================\n";
    report +=
      "           REPORTE GENERAL DE GESTIÓN Y AUDITORÍA - CONTROL FINANCIERO          \n";
    report +=
      "================================================================================\n";
    report += `Fecha de generación: ${new Date().toLocaleString("es-ES")}\n`;
    report += "Sistema: Control Financiero y Académico Institucional\n";
    report +=
      "================================================================================\n\n";

    // 1. KPIs
    report +=
      "--------------------------------------------------------------------------------\n";
    report += "I. INDICADORES CLAVE DE GESTIÓN (KPIs)\n";
    report +=
      "--------------------------------------------------------------------------------\n";
    const kpis = getKpiDataList();
    kpis.forEach((k) => {
      report += `[${k.Categoría}] ${k.Métrica}: ${k.Valor}\n`;
      report += `  - Descripción: ${k.Descripción}\n`;
    });
    report += "\n";

    // 2. Miembros
    report +=
      "--------------------------------------------------------------------------------\n";
    report += "II. LISTADO DE MIEMBROS\n";
    report +=
      "--------------------------------------------------------------------------------\n";
    if (data.miembros && data.miembros.length > 0) {
      report +=
        "Nº   | Nombre Completo                   | Correo                         | Rol        | Estado\n";
      report +=
        "-----+-----------------------------------+--------------------------------+------------+---------\n";
      data.miembros.forEach((m, idx) => {
        const num = String(idx + 1).padEnd(4);
        const name =
          `${m.nombre} ${m.apellidoPaterno || ""} ${m.apellidoMaterno || ""}`
            .trim()
            .substring(0, 32)
            .padEnd(33);
        const mail = (m.correoElectronico || "Sin correo")
          .substring(0, 30)
          .padEnd(30);
        const rol = (m.rol || "socio").padEnd(10);
        const est = (m.estado || "activo").padEnd(8);
        report += `${num} | ${name} | ${mail} | ${rol} | ${est}\n`;
      });
    } else {
      report += "No hay miembros registrados.\n";
    }
    report += "\n";

    // 3. Finanzas - Ingresos
    report +=
      "--------------------------------------------------------------------------------\n";
    report += "III. HISTORIAL DE INGRESOS (RECAUDACIÓN)\n";
    report +=
      "--------------------------------------------------------------------------------\n";
    if (data.ingresos && data.ingresos.length > 0) {
      report += "Nº   | Fecha      | Monto (Bs)   | Descripción\n";
      report +=
        "-----+------------+--------------+----------------------------------------------\n";
      data.ingresos.forEach((ing, idx) => {
        const num = String(idx + 1).padEnd(4);
        const date = (ing.fecha || ing.creacion?.split("T")[0] || "—").padEnd(
          10,
        );
        const amt = String(Number(ing.monto || 0).toFixed(2))
          .padStart(12)
          .padEnd(12);
        const desc = (ing.descripcion || "Sin descripción").substring(0, 45);
        report += `${num} | ${date} | ${amt} | ${desc}\n`;
      });
    } else {
      report += "No hay ingresos registrados.\n";
    }
    report += "\n";

    // 4. Finanzas - Egresos
    report +=
      "--------------------------------------------------------------------------------\n";
    report += "IV. HISTORIAL DE EGRESOS (GASTOS)\n";
    report +=
      "--------------------------------------------------------------------------------\n";
    if (data.egresos && data.egresos.length > 0) {
      report += "Nº   | Fecha      | Monto (Bs)   | Concepto\n";
      report +=
        "-----+------------+--------------+----------------------------------------------\n";
      data.egresos.forEach((egr, idx) => {
        const num = String(idx + 1).padEnd(4);
        const date = (egr.creacion?.split("T")[0] || "—").padEnd(10);
        const amt = String(Number(egr.monto || 0).toFixed(2))
          .padStart(12)
          .padEnd(12);
        const concept = (
          egr.concepto ||
          egr.descripcion ||
          "Sin concepto"
        ).substring(0, 45);
        report += `${num} | ${date} | ${amt} | ${concept}\n`;
      });
    } else {
      report += "No hay egresos registrados.\n";
    }
    report += "\n";

    // 5. Activos
    report +=
      "--------------------------------------------------------------------------------\n";
    report += "V. ACTIVOS Y PATRIMONIO\n";
    report +=
      "--------------------------------------------------------------------------------\n";
    if (data.activos && data.activos.length > 0) {
      report +=
        "Nº   | Nombre del Activo                 | Costo (Bs)   | Saldo Pend.  | Estado\n";
      report +=
        "-----+-----------------------------------+--------------+--------------+---------\n";
      data.activos.forEach((act, idx) => {
        const num = String(idx + 1).padEnd(4);
        const name = act.nombre.substring(0, 32).padEnd(33);
        const cost = String(Number(act.costo_total || 0).toFixed(2))
          .padStart(12)
          .padEnd(12);
        const sal = String(Number(act.saldo_pendiente || 0).toFixed(2))
          .padStart(12)
          .padEnd(12);
        const est = (act.estado || "pagado").padEnd(8);
        report += `${num} | ${name} | ${cost} | ${sal} | ${est}\n`;
      });
    } else {
      report += "No hay activos registrados.\n";
    }
    report += "\n";

    // 6. Actividades
    report +=
      "--------------------------------------------------------------------------------\n";
    report += "VI. ACTIVIDADES ACADÉMICAS\n";
    report +=
      "--------------------------------------------------------------------------------\n";
    if (data.actividades && data.actividades.length > 0) {
      report += "Nº   | Fecha      | Costo (Bs) | Cupos | Actividad / Curso\n";
      report +=
        "-----+------------+------------+-------+----------------------------------------\n";
      data.actividades.forEach((act, idx) => {
        const num = String(idx + 1).padEnd(4);
        const date = (act.fecha || "—").padEnd(10);
        const cost = String(Number(act.costo || 0).toFixed(2))
          .padStart(10)
          .padEnd(10);
        const cupos = String(act.cupos || 0)
          .padStart(5)
          .padEnd(5);
        const title = (act.nombre || act.titulo || "Sin título").substring(
          0,
          38,
        );
        report += `${num} | ${date} | ${cost} | ${cupos} | ${title}\n`;
      });
    } else {
      report += "No hay actividades académicas registradas.\n";
    }
    report += "\n";

    report +=
      "================================================================================\n";
    report +=
      "                           FIN DEL REPORTE DE AUDITORÍA                         \n";
    report +=
      "================================================================================\n";

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Reporte_General_Auditoria_${new Date().toISOString().split("T")[0]}.txt`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJson = () => {
    if (!data) return;
    const backupObj = {
      generacion: new Date().toLocaleString("es-ES"),
      datos: data,
    };
    const jsonContent = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonContent], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Copia_Seguridad_Total_${new Date().toISOString().split("T")[0]}.json`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const datos = json.datos || json;
        // Validar usando tanto nombres BD (singular) como nombres JSON (plural/camelCase)
        if (
          !datos.miembros &&
          !datos.miembro &&
          !datos.configCuotas &&
          !datos.configuracion_cuotas
        ) {
          throw new Error(
            "El archivo no tiene el formato de respaldo correcto. Debe contener al menos la tabla de miembros o de configuraciones.",
          );
        }
        setImportFile(datos);
      } catch (err) {
        setImportError(`Error leyendo el archivo JSON: ${err.message}`);
        setImportFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleStartRestore = () => {
    if (!importFile) return;
    setConfirmKeyword("");
    setShowRestoreModal(true);
  };

  const executeRestore = async () => {
    window.isRestoring = true;
    setImportLoading(true);
    setImportError(null);
    setImportProgress("Inicializando restauración...");
    setShowRestoreModal(false);

    // Obtener el ID y el correo del usuario actual de manera extremadamente robusta
    let currentUserId = null;
    let currentUserEmail = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      currentUserId = user?.id;
      currentUserEmail = user?.email;

      if (!currentUserId) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        currentUserId = session?.user?.id;
        currentUserEmail = session?.user?.email;
      }
    } catch (e) {
      console.warn("No se pudo determinar el usuario actual:", e);
    }

    if (!currentUserId) {
      setImportLoading(false);
      setImportError(
        "Error crítico: No se pudo identificar de forma segura tu sesión de administrador para proteger tu rol. Restauración cancelada.",
      );
      return;
    }

    // Encontrar el ID antiguo del administrador en el respaldo usando su correo para mapearlo globalmente
    let dataToRestore = importFile;
    if (currentUserEmail) {
      const miembrosList = importFile.miembros || importFile.miembro || [];
      const adminBackupRow = miembrosList.find(
        (m) =>
          m.correoElectronico === currentUserEmail ||
          m.email === currentUserEmail,
      );
      const oldAdminId = adminBackupRow?.id;

      if (oldAdminId && oldAdminId !== currentUserId) {
        console.log(
          `Mapeando ID del administrador antiguo (${oldAdminId}) al actual (${currentUserId}) en todo el JSON`,
        );
        try {
          const serialized = JSON.stringify(importFile);
          // Reemplazar globalmente todas las ocurrencias del UUID antiguo por el actual para mantener la integridad referencial
          const replaced = serialized.replaceAll(oldAdminId, currentUserId);
          dataToRestore = JSON.parse(replaced);
        } catch (err) {
          console.error("Error al mapear IDs de administrador:", err);
        }
      }
    }

    try {
      setImportProgress(
        "Enviando respaldo y ejecutando transacción atómica en el servidor...",
      );

      const { error: rpcError } = await supabase.rpc(
        "restaurar_respaldo_completo",
        {
          p_backup: dataToRestore,
        },
      );

      if (rpcError) throw rpcError;

      setImportProgress("¡Restauración total completada con éxito!");
      setImportSuccess(true);
      setImportFile(null);
      setImportFileName("");
    } catch (err) {
      console.error("Error restaurando base de datos:", err);
      setImportError(
        `Error en restauración: ${err.message || "Error en Supabase RLS/trigger"}`,
      );
    } finally {
      setImportLoading(false);
      window.isRestoring = false;
    }
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
    doc.text(
      `Fecha y hora de generación: ${new Date().toLocaleString("es-ES")}`,
      14,
      27,
    );
    doc.text("Sistema de Control Financiero y Académico Institucional", 14, 32);

    // Tabla de KPIs principales
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Métricas Clave de Gestión (KPIs)", 14, 45);

    const kpiBody = getKpiDataList().map((k) => [
      k.Categoría,
      k.Métrica,
      k.Valor,
      k.Descripción,
    ]);

    autoTable(doc, {
      startY: 50,
      head: [["Categoría", "Indicador", "Valor", "Descripción"]],
      body: kpiBody,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] }, // slate-800
      styles: { fontSize: 8, font: "helvetica" },
    });

    // Nueva Página: Tabla de Miembros
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen de Miembros Activos/Inactivos", 14, 20);

    const miembrosBody = data.miembros.map((m, idx) => [
      idx + 1,
      `${m.nombre} ${m.apellidoPaterno || ""}`,
      m.correoElectronico,
      m.rol,
      m.estado,
    ]);

    autoTable(doc, {
      startY: 25,
      head: [["#", "Nombre Completo", "Correo", "Rol", "Estado"]],
      body: miembrosBody.slice(0, 15), // Primeros 15 para mantener el PDF compacto
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8, font: "helvetica" },
    });

    doc.save(
      `Respaldo_Auditoría_Total_${new Date().toISOString().split("T")[0]}.pdf`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5 border-b pb-5">
        <div className="flex items-center gap-2 text-blue-600">
          <Database className="h-6 w-6 stroke-[2.5]" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Copia de Seguridad y Respaldo Total
          </h1>
        </div>
        <p className="text-sm text-slate-500">
          Descarga una copia completa de seguridad del 100% de la base de datos
          (17 tablas operativas). Ideal para almacenamiento en frío e
          importación directa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KPI Miembros */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Info className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              Total Miembros
            </span>
            <span className="text-2xl font-black text-slate-700">
              {data ? data.miembros.length : "—"}
            </span>
          </div>
        </div>

        {/* KPI Caja */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              Registros Financieros
            </span>
            <span className="text-2xl font-black text-slate-700">
              {data
                ? data.ingresos.length +
                  data.egresos.length +
                  data.cuotas.length
                : "—"}
            </span>
          </div>
        </div>

        {/* KPI Actividades/Activos */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Box className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              Activos & Estructuras
            </span>
            <span className="text-2xl font-black text-slate-700">
              {data
                ? data.actividades.length +
                  data.activos.length +
                  data.archivos.length
                : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-800">
              Generar Respaldo Total de Base de Datos
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Haz clic en "Cargar datos de la BD" para sincronizar la totalidad
              de los esquemas relacionales.
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
            <div className="flex items-start gap-3 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs sm:text-sm leading-relaxed box-emerald">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900 dark:text-white">
                  Extracción de 17 Tablas Completa
                </p>
                <p className="text-emerald-700 dark:text-emerald-300">
                  Se ha generado la copia en memoria de la base de datos de
                  manera íntegra. Todo está listo para ser descargado a tu
                  computador.
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
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    Libro de Excel Total (.xlsx)
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Genera un único archivo de Excel con{" "}
                    <strong>17 hojas independientes</strong>, abarcando
                    miembros, finanzas, patrimonio, académicos y configuraciones
                    sin excepciones.
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
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    Reporte de Auditoría PDF (.pdf)
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Genera un reporte auditado y ordenado para presentación
                    ejecutiva o firma oficial con métricas consolidadas.
                  </p>
                </div>
                <Button
                  onClick={handleDownloadPdf}
                  className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 active:scale-95 transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar Reporte PDF
                </Button>
              </div>

              {/* Opción TXT */}
              <div className="border border-slate-100 hover:border-amber-200 bg-slate-50/50 hover:bg-amber-50/10 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md group">
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    Reporte de Texto Plano (.txt)
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Genera un informe completo en formato legible de texto con
                    métricas consolidadas y listados de auditoría.
                  </p>
                </div>
                <Button
                  onClick={handleDownloadTxt}
                  className="mt-5 w-full bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 active:scale-95 transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar Reporte TXT
                </Button>
              </div>

              {/* Opción JSON */}
              <div className="border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md group">
                <div className="space-y-3">
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-xl w-fit group-hover:scale-110 transition-transform">
                    <Database className="h-6 w-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    Volcado JSON de Datos (.json)
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Copia de seguridad en formato estructurado JSON. Ideal para
                    restauración e importación de datos en el sistema.
                  </p>
                </div>
                <Button
                  onClick={handleDownloadJson}
                  className="mt-5 w-full bg-slate-600 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar Respaldo JSON
                </Button>
              </div>
            </div>
          </div>
        )}

        {!data && !loading && (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Database className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm font-semibold mb-1">
              Sin datos cargados en memoria local
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Haz clic en el botón superior derecho para iniciar la extracción
              total (17 tablas) desde Supabase.
            </p>
          </div>
        )}
      </div>

      {/* Nuevo Card: Importar y Restaurar Base de Datos */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="border-b border-slate-50 pb-5">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Upload className="h-5 w-5 text-amber-600" />
            Restaurar Base de Datos desde Respaldo JSON
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            Sube un archivo de respaldo en formato JSON previamente exportado
            para sobrescribir los datos actuales del sistema.
          </p>
        </div>

        {importError && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 text-red-800 rounded-xl text-sm leading-relaxed">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-bold">Error en restauración</p>
              <p>{importError}</p>
            </div>
          </div>
        )}

        {importSuccess && (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-sm leading-relaxed">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-bold">Restauración Completada</p>
              <p>
                El sistema se ha restablecido exitosamente con el contenido del
                respaldo cargado.
              </p>
            </div>
          </div>
        )}

        {importLoading && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3 bg-slate-50/50 rounded-2xl border">
            <Spinner size="lg" />
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest animate-pulse">
              {importProgress}
            </p>
          </div>
        )}

        {!importLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-100/50 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-slate-400" />
                  <p className="mb-1 text-sm text-slate-500 font-semibold">
                    {importFileName
                      ? `Archivo cargado: ${importFileName}`
                      : "Haz clic para seleccionar o arrastra un archivo JSON"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    JSON de Respaldo Total de Base de Datos
                  </p>
                </div>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {importFile && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 animate-in fade-in duration-200">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Tablas encontradas en el respaldo:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700">
                  {Object.keys(importFile).map((table) => {
                    const count = Array.isArray(importFile[table])
                      ? importFile[table].length
                      : 0;
                    if (
                      count === 0 &&
                      table !== "datos" &&
                      table !== "generacion"
                    )
                      return null;
                    if (table === "datos" || table === "generacion")
                      return null;
                    return (
                      <div
                        key={table}
                        className="bg-white border p-2 rounded-lg shadow-sm flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-500 truncate mr-2">
                          {table}
                        </span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setImportFile(null);
                      setImportFileName("");
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Descartar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleStartRestore}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/10 active:scale-95 transition-all"
                  >
                    <Database className="h-4 w-4" />
                    Iniciar Restauración
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Advertencia Crítica de Restauración */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        title="⚠️ ADVERTENCIA CRÍTICA DE SEGURIDAD"
        size="md"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              ¿Estás absolutamente seguro de continuar?
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              La restauración **ELIMINARÁ** de forma permanente e irreversible
              todos los datos actuales de las tablas correspondientes en la base
              de datos de producción y los sobrescribirá con el respaldo JSON.
            </p>
            <p className="text-xs text-red-600 font-bold mt-2">
              Esta acción no se puede deshacer. Podría causar pérdidas de
              transacciones recientes.
            </p>
          </div>

          <div className="space-y-2 border-t pt-4 text-left">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Para confirmar, escribe la palabra{" "}
              <span className="text-red-600 font-extrabold">RESTAURAR</span> a
              continuación:
            </label>
            <input
              type="text"
              value={confirmKeyword}
              onChange={(e) => setConfirmKeyword(e.target.value)}
              placeholder="Escribe RESTAURAR aquí"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 uppercase font-black"
            />
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <Button
              onClick={() => setShowRestoreModal(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={executeRestore}
              disabled={confirmKeyword !== "RESTAURAR"}
              className="bg-red-600 hover:bg-red-700 text-white font-bold active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar y Sobrescribir BD
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
