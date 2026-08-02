import { useState, useMemo } from "react";
import {
  CalendarPlus,
  ClipboardList,
  Edit,
  Trash2,
  Camera,
  X,
  MapPin,
  Info,
  Users,
  Tags,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  EyeOff,
  FileType,
  FileText,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  RefreshCw,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { useActividades, useTiposActividad } from "../hooks";
import {
  Button,
  Spinner,
  Modal,
  Input,
  ExportButtons,
  Confetti,
} from "../../../components/ui";
import { MapPicker } from "../../../components/ui/MapPicker";
import { Table } from "../../../components/data-display";
import { Toast, LoadingOverlay } from "../../../components/feedback";
import { academicoApi } from "../api";
import { administracionApi } from "../../administracion/api";
import { useAuthStore } from "../../../store/authStore";
import { supabase } from "../../../services/supabase";
import { brevoService } from "../../../services/brevo";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { getDynamicEstado } from "../../../utils/formatters";

export const GestionActividadesPage = () => {
  const { actividades, loading, error, setActividades, refetch } =
    useActividades();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const { tipos } = useTiposActividad();
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAct, setEditingAct] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    fecha: "",
    hora: "19:00",
    cupos: "",
    ubicacion: "",
    latitud: "",
    longitud: "",
    modalidad: "presencial",
    costo: "",
    requisitos: "",
    incluye_certificacion: false,
    estado: "programado",
    publicado: true,
    tipo_actividad_id: "",
  });
  const [showConfetti, setShowConfetti] = useState(false);

  const clearDraft = () => {};
  const [adicionalCupos, setAdicionalCupos] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [inscritosModal, setInscritosModal] = useState({
    open: false,
    actividad: null,
    inscritos: [],
    loading: false,
  });
  const [searchInscritosQuery, setSearchInscritosQuery] = useState("");
  const [imageModal, setImageModal] = useState({ open: false, url: null });
  const [detalleModal, setDetalleModal] = useState({
    open: false,
    actividad: null,
  });
  const [resultModal, setResultModal] = useState({
    open: false,
    type: "success",
    text: "",
    details: "",
  });
  const [confirmActionModal, setConfirmActionModal] = useState({ open: false });
  const [loadingModal, setLoadingModal] = useState({ open: false, text: "" });
  const [generalConfirmModal, setGeneralConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "",
    actionType: "primary",
    onConfirm: null,
  });

  const [formErrors, setFormErrors] = useState({});

  const handleDateOrTimeChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    if (updated.fecha && updated.hora) {
      const selectedDateTime = new Date(`${updated.fecha}T${updated.hora}`);
      const currentDateTime = new Date();
      if (selectedDateTime < currentDateTime) {
        setFormErrors((prev) => ({
          ...prev,
          fecha: "La fecha y hora de la actividad no pueden ser anteriores al momento actual.",
          hora: "La fecha y hora de la actividad no pueden ser anteriores al momento actual.",
        }));
      } else {
        setFormErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.fecha;
          delete newErrors.hora;
          return newErrors;
        });
      }
    } else {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.fecha;
        delete newErrors.hora;
        return newErrors;
      });
    }
  };

  const isFormInvalid =
    !formData.nombre.trim() ||
    !formData.tipo_actividad_id ||
    !formData.fecha ||
    !formData.hora ||
    formData.costo === "" ||
    formData.cupos === "" ||
    Object.keys(formErrors).length > 0;

  const isFormUnchanged =
    !!editingAct &&
    formData.nombre === editingAct.nombre &&
    formData.descripcion === (editingAct.descripcion || "") &&
    formData.fecha === editingAct.fecha &&
    formData.hora ===
      (editingAct.hora ? editingAct.hora.substring(0, 5) : "19:00") &&
    Number(formData.cupos) === (editingAct.cupos || 0) &&
    formData.ubicacion === (editingAct.ubicacion || "") &&
    formData.latitud === (editingAct.latitud || "") &&
    formData.longitud === (editingAct.longitud || "") &&
    formData.modalidad === (editingAct.modalidad || "presencial") &&
    Number(formData.costo) === (editingAct.costo || 0) &&
    formData.requisitos === (editingAct.requisitos || "") &&
    formData.incluye_certificacion ===
      (editingAct.incluye_certificacion || false) &&
    formData.estado === (editingAct.estado || "programado") &&
    formData.publicado === (editingAct.publicado ?? true) &&
    formData.tipo_actividad_id === (editingAct.tipo_actividad_id || "") &&
    !selectedFile &&
    !adicionalCupos;

  const isSubmitDisabled = isFormUnchanged || isFormInvalid;

  // Asistencia & Manual Enrollment States
  const [todosMiembros, setTodosMiembros] = useState([]);
  const [selectedMiembroId, setSelectedMiembroId] = useState("");
  const [manualInscribiendo, setManualInscribiendo] = useState(false);
  const [asistenciaModal, setAsistenciaModal] = useState({
    open: false,
    selectedActividadId: "",
    columns: {
      nro: true,
      nombre: true,
      email: false,
      telefono: false,
      fecha: false,
      estado: false,
    },
    customCol1Enabled: true,
    customCol1Name: "Firma",
    customCol2Enabled: false,
    customCol2Name: "Observaciones",
    customCol3Enabled: false,
    customCol3Name: "Nota",
    sortColumn: "nombre",
    sortOrder: "asc",
    loading: false,
    inscritos: [],
  });

  const sortedPreviewInscritos = useMemo(() => {
    let list = [...asistenciaModal.inscritos];
    if (asistenciaModal.sortColumn) {
      list.sort((a, b) => {
        let valA = "", valB = "";
        if (asistenciaModal.sortColumn === "nombre") {
          valA = `${a.nombre} ${a.apellidoPaterno || ""} ${a.apellidoMaterno || ""}`.trim().toLowerCase();
          valB = `${b.nombre} ${b.apellidoPaterno || ""} ${b.apellidoMaterno || ""}`.trim().toLowerCase();
        } else if (asistenciaModal.sortColumn === "email") {
          valA = (a.email || "").toLowerCase();
          valB = (b.email || "").toLowerCase();
        } else if (asistenciaModal.sortColumn === "telefono") {
          valA = (a.telefono || "").toLowerCase();
          valB = (b.telefono || "").toLowerCase();
        } else if (asistenciaModal.sortColumn === "fecha") {
          valA = a.fechaInscripcion ? new Date(a.fechaInscripcion).getTime() : 0;
          valB = b.fechaInscripcion ? new Date(b.fechaInscripcion).getTime() : 0;
        } else if (asistenciaModal.sortColumn === "estado") {
          valA = (a.estado || "").toLowerCase();
          valB = (b.estado || "").toLowerCase();
        }
        
        if (valA < valB) return asistenciaModal.sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return asistenciaModal.sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [asistenciaModal.inscritos, asistenciaModal.sortColumn, asistenciaModal.sortOrder]);

  // Search and dropdown states for Member Selection (Manual Enrollment) and Activity Selection (Asistencia Report)
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);


  const columns = [
    { key: "nro", label: "Nº" },
    { key: "imagen_display", label: "Imagen" },
    { key: "nombre", label: "Actividad" },
    { key: "tipo_nombre", label: "Tipo" },
    { key: "fecha_hora", label: "Fecha/Hora" },
    { key: "cupos", label: "Cupos" },
    { key: "acciones", label: "Acciones" },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleOpenCreate = () => {
    setEditingAct(null);
    setFormData({
      nombre: "",
      descripcion: "",
      fecha: "",
      hora: "19:00",
      cupos: "",
      ubicacion: "",
      latitud: "",
      longitud: "",
      modalidad: "presencial",
      costo: "",
      requisitos: "",
      incluye_certificacion: false,
      estado: "programado",
      publicado: true,
      tipo_actividad_id: tipos[0]?.id || "",
    });
    setAdicionalCupos("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (act) => {
    setEditingAct(act);
    setFormData({
      nombre: act.nombre,
      descripcion: act.descripcion || "",
      fecha: act.fecha,
      hora: act.hora ? act.hora.substring(0, 5) : "19:00",
      cupos: act.cupos !== undefined && act.cupos !== null ? act.cupos : "",
      ubicacion: act.ubicacion || "",
      latitud: act.latitud || "",
      longitud: act.longitud || "",
      modalidad: act.modalidad || "presencial",
      costo: act.costo !== undefined && act.costo !== null ? act.costo : "",
      requisitos: act.requisitos || "",
      incluye_certificacion: act.incluye_certificacion || false,
      estado: act.estado || "programado",
      publicado: act.publicado ?? true,
      tipo_actividad_id: act.tipo_actividad_id || "",
    });
    setAdicionalCupos("");
    setSelectedFile(null);
    setPreviewUrl(act.imagen || null);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setGeneralConfirmModal({
      open: true,
      title: "Eliminar Actividad",
      message:
        "¿Estás seguro de eliminar esta actividad? Esta acción no se puede deshacer y eliminará todos los registros asociados.",
      confirmText: "Sí, eliminar",
      actionType: "danger",
      onConfirm: async () => {
        setGeneralConfirmModal((prev) => ({ ...prev, open: false }));
        setLoadingModal({ open: true, text: "Eliminando actividad académica..." });
        try {
          await academicoApi.eliminarActividad(id);
          setActividades(actividades.filter((a) => a.id !== id));
          setLoadingModal({ open: false, text: "" });
          setResultModal({
            open: true,
            type: "success",
            text: "¡Actividad eliminada!",
            details:
              "La actividad y sus registros asociados han sido removidos con éxito de la base de datos.",
          });
        } catch (err) {
          console.error(err);
          setLoadingModal({ open: false, text: "" });
          setResultModal({
            open: true,
            type: "error",
            text: "Error al eliminar",
            details:
              err instanceof Error
                ? err.message
                : "No se pudo eliminar la actividad de la base de datos.",
          });
        }
      },
    });
  };

  const handleCancelar = (act) => {
    setGeneralConfirmModal({
      open: true,
      title: "Cancelar Actividad",
      message: `¿Estás seguro de cancelar "${act.nombre}"? Se enviará una notificación a todos los inscritos y entrarán en modo de devolución de Bs. ${act.costo}.`,
      confirmText: "Sí, cancelar actividad",
      actionType: "danger",
      onConfirm: async () => {
        setGeneralConfirmModal((prev) => ({ ...prev, open: false }));
        setLoadingModal({ open: true, text: "Cancelando actividad y notificando a los alumnos inscritos..." });
        try {
          await academicoApi.cancelarActividad(act.id);
          // Actualizar estado local
          setActividades((prev) =>
            prev.map((a) =>
              a.id === act.id
                ? { ...a, estado: "cancelado", publicado: false }
                : a,
            ),
          );
          setLoadingModal({ open: false, text: "" });
          setResultModal({
            open: true,
            type: "success",
            text: "¡Actividad cancelada!",
            details:
              "Se ha notificado a los socios y la actividad ahora figura como cancelada.",
          });
        } catch (err) {
          console.error(err);
          setLoadingModal({ open: false, text: "" });
          setResultModal({
            open: true,
            type: "error",
            text: "Error al cancelar",
            details: err.message || "No se pudo cancelar la actividad.",
          });
        }
      },
    });
  };

  const handleTogglePublicado = (act) => {
    const nuevoEstado = act.publicado === false ? true : false;
    const label = nuevoEstado ? "publicar" : "ocultar";
    setGeneralConfirmModal({
      open: true,
      title: nuevoEstado ? "Publicar Actividad" : "Ocultar Actividad",
      message: `¿Deseas ${label} esta actividad para los socios?`,
      confirmText: nuevoEstado ? "Sí, publicar" : "Sí, ocultar",
      actionType: "primary",
      onConfirm: async () => {
        setGeneralConfirmModal((prev) => ({ ...prev, open: false }));
        const estadoAnterior = act.publicado;
        const estadoActAnterior = act.estado;

        // Actualización optimista local inmediata
        // Si era cancelado y se vuelve a publicar, restablecer estado a 'programado'
        const nuevosAtributos = { publicado: nuevoEstado };
        if (nuevoEstado && act.estado === "cancelado") {
          nuevosAtributos.estado = "programado";
        }
        setActividades(prev =>
          prev.map((a) => (a.id === act.id ? { ...a, ...nuevosAtributos } : a))
        );

        try {
          const updated = await academicoApi.togglePublicado(act.id, nuevoEstado);
          // Actualizar con el estado real devuelto por la API
          if (updated) {
            setActividades(prev =>
              prev.map((a) => (a.id === act.id ? { ...a, publicado: updated.publicado, estado: updated.estado || a.estado } : a))
            );
          }
        } catch (err) {
          console.error(err);
          // Revertir (Rollback) si falla la API
          setActividades(prev =>
            prev.map((a) => (a.id === act.id ? { ...a, publicado: estadoAnterior, estado: estadoActAnterior } : a))
          );
          setResultModal({
            open: true,
            type: "error",
            text: `Error al ${label}`,
            details:
              err instanceof Error
                ? err.message
                : "No se pudo cambiar la visibilidad de la actividad.",
          });
        }
      },
    });
  };


  const handleVerInscritos = async (act) => {
    setInscritosModal({
      open: true,
      actividad: act,
      inscritos: [],
      loading: true,
    });
    setSelectedMiembroId("");
    setMemberSearchQuery("");
    setSearchInscritosQuery("");
    setIsMemberDropdownOpen(false);
    try {
      const [inscritos, miembros] = await Promise.all([
        administracionApi.obtenerInscritosActividad(act.id),
        todosMiembros.length === 0
          ? administracionApi.obtenerMiembros()
          : Promise.resolve(todosMiembros),
      ]);
      setInscritosModal((prev) => ({ ...prev, inscritos, loading: false }));
      if (todosMiembros.length === 0) {
        setTodosMiembros(miembros);
      }
    } catch (err) {
      console.error("Error cargando datos de inscritos:", err);
      setInscritosModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleManualInscribir = (e) => {
    e.preventDefault();
    if (!selectedMiembroId || !inscritosModal.actividad) return;

    setGeneralConfirmModal({
      open: true,
      title: "Inscribir Socio",
      message:
        "¿Estás seguro de que deseas inscribir a este socio manualmente en la actividad?",
      confirmText: "Sí, inscribir",
      actionType: "primary",
      onConfirm: async () => {
        const miembroIdToInscribir = selectedMiembroId;
        const miembro = todosMiembros.find((m) => m.id === miembroIdToInscribir);
        setGeneralConfirmModal((prev) => ({ ...prev, open: false }));
        setManualInscribiendo(true);
        setLoadingModal({ open: true, text: "Registrando inscripción del socio..." });
        try {
          await academicoApi.inscribirSocio(
            miembroIdToInscribir,
            inscritosModal.actividad.id,
          );
          // Reload inscritos list
          const nuevosInscritos =
            await administracionApi.obtenerInscritosActividad(
              inscritosModal.actividad.id,
            );
          setInscritosModal((prev) => ({
            ...prev,
            inscritos: nuevosInscritos,
          }));
          setSelectedMiembroId("");
          setMemberSearchQuery("");
          // Decrease cupos locally and update inscritos count with exact value to instantly update the list view
          setActividades((prev) =>
            prev.map((a) =>
              a.id === inscritosModal.actividad.id
                ? {
                    ...a,
                    cupos: Math.max(0, a.cupos - 1),
                    inscritos_count: nuevosInscritos.length,
                  }
                : a,
            ),
          );
          setLoadingModal({ open: false, text: "" });
          setResultModal({
            open: true,
            type: "success",
            text: "¡Socio inscrito con éxito!",
            details:
              "El socio ha sido inscrito manualmente en la actividad de manera correcta.",
          });

          // Notificar inscripción por correo Brevo
          if (miembro) {
            try {
              // Notificación por correo Brevo
              await brevoService.notificarInscripcionActividad({
                email: miembro.correoElectronico,
                nombre: `${miembro.nombre} ${miembro.apellidoPaterno || ''}`.trim(),
                actividadTitulo: inscritosModal.actividad.nombre,
                fecha: inscritosModal.actividad.fecha,
                hora: inscritosModal.actividad.hora,
                modalidad: inscritosModal.actividad.modalidad,
                ubicacion: inscritosModal.actividad.ubicacion,
                costo: inscritosModal.actividad.costo
              });
            } catch (emailErr) {
              console.error('[Brevo] Error al enviar confirmación de inscripción:', emailErr);
            }
          }
        } catch (err) {
          console.error(err);
          setLoadingModal({ open: false, text: "" });
          setResultModal({
            open: true,
            type: "error",
            text: "Error de inscripción",
            details:
              err.message || "No se pudo completar la inscripción del socio.",
          });
        } finally {
          setManualInscribiendo(false);
        }
      },
    });
  };

  const handleProcesarReembolso = (miembro) => {
    if (!inscritosModal.actividad) return;

    if (miembro.totalPaid > 0 && miembro.ingresoId) {
      setGeneralConfirmModal({
        open: true,
        title: "Habilitar y Procesar Reembolso",
        message: `El socio "${miembro.nombre} ${miembro.apellidoPaterno || ""}" ya pagó por esta actividad (Bs. ${miembro.totalPaid.toFixed(2)}). ¿Estás seguro de procesar su reembolso completo? Esto anulará su inscripción de forma segura y liberará el cupo en la actividad.`,
        confirmText: "Sí, procesar reembolso",
        actionType: "danger",
        onConfirm: async () => {
          setGeneralConfirmModal((prev) => ({ ...prev, open: false }));
          setLoadingModal({ open: true, text: "Procesando reembolso y anulando inscripción..." });
          try {
            const { finanzasApi } = await import("../../finanzas/api");
            await finanzasApi.devolverIngreso(miembro.ingresoId, user?.id);
            await academicoApi.desinscribirSocio(miembro.id, inscritosModal.actividad.id);

            const nuevosInscritos =
              await administracionApi.obtenerInscritosActividad(
                inscritosModal.actividad.id,
              );
            setInscritosModal((prev) => ({
              ...prev,
              inscritos: nuevosInscritos,
            }));

             setActividades((prev) =>
              prev.map((a) =>
                a.id === inscritosModal.actividad.id
                  ? {
                      ...a,
                      cupos: (a.cupos || 0) + 1,
                      inscritos_count: nuevosInscritos.length,
                    }
                  : a,
              ),
            );

            setLoadingModal({ open: false, text: "" });
            setResultModal({
              open: true,
              type: "success",
              text: "¡Reembolso procesado con éxito!",
              details: "El pago del socio ha sido reembolsado y su inscripción ha sido anulada.",
            });
          } catch (err) {
            console.error(err);
            setLoadingModal({ open: false, text: "" });
            setResultModal({
              open: true,
              type: "error",
              text: "Error al procesar reembolso",
              details: err.message || "No se pudo completar el reembolso.",
            });
          }
        },
      });
    } else {
      // No ha pagado, simplemente anular
      setGeneralConfirmModal({
        open: true,
        title: "Anular Inscripción",
        message: `El socio "${miembro.nombre} ${miembro.apellidoPaterno || ""}" no registra pagos para esta actividad. ¿Estás seguro de anular su inscripción?`,
        confirmText: "Sí, anular inscripción",
        actionType: "danger",
        onConfirm: async () => {
          setGeneralConfirmModal((prev) => ({ ...prev, open: false }));
          setLoadingModal({ open: true, text: "Anulando inscripción del socio..." });
          try {
            await academicoApi.desinscribirSocio(
              miembro.id,
              inscritosModal.actividad.id,
            );

            const nuevosInscritos =
              await administracionApi.obtenerInscritosActividad(
                inscritosModal.actividad.id,
              );
            setInscritosModal((prev) => ({
              ...prev,
              inscritos: nuevosInscritos,
            }));

             setActividades((prev) =>
              prev.map((a) =>
                a.id === inscritosModal.actividad.id
                  ? {
                      ...a,
                      cupos: (a.cupos || 0) + 1,
                      inscritos_count: nuevosInscritos.length,
                    }
                  : a,
              ),
            );

            setLoadingModal({ open: false, text: "" });
            setResultModal({
              open: true,
              type: "success",
              text: "¡Inscripción anulada!",
              details: "El socio ha sido desinscrito de la actividad con éxito.",
            });
          } catch (err) {
            console.error(err);
            setLoadingModal({ open: false, text: "" });
            setResultModal({
              open: true,
              type: "error",
              text: "Error al anular inscripción",
              details: err.message || "No se pudo eliminar la inscripción.",
            });
          }
        },
      });
    }
  };



  const handleReportActividadChange = async (actId) => {
    setAsistenciaModal((prev) => ({
      ...prev,
      selectedActividadId: actId,
      loading: true,
      inscritos: [],
    }));
    if (!actId) {
      setAsistenciaModal((prev) => ({ ...prev, loading: false }));
      return;
    }
    try {
      const data = await administracionApi.obtenerInscritosActividad(actId);
      setAsistenciaModal((prev) => ({
        ...prev,
        inscritos: data,
        loading: false,
      }));
    } catch (err) {
      console.error("Error cargando inscritos para reporte:", err);
      setAsistenciaModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const executeAsistenciaExport = (format) => {
    const act = actividades.find(
      (a) => a.id === asistenciaModal.selectedActividadId,
    );
    if (!act) return;

    const { inscritos, columns } = asistenciaModal;
    if (inscritos.length === 0) {
      alert("No hay inscritos en esta actividad para generar el reporte.");
      return;
    }

    // Sort inscritos
    let sortedInscritos = [...inscritos];
    if (asistenciaModal.sortColumn) {
      sortedInscritos.sort((a, b) => {
        let valA = "", valB = "";
        if (asistenciaModal.sortColumn === "nombre") {
          valA = `${a.nombre} ${a.apellidoPaterno || ""} ${a.apellidoMaterno || ""}`.trim().toLowerCase();
          valB = `${b.nombre} ${b.apellidoPaterno || ""} ${b.apellidoMaterno || ""}`.trim().toLowerCase();
        } else if (asistenciaModal.sortColumn === "email") {
          valA = (a.email || "").toLowerCase();
          valB = (b.email || "").toLowerCase();
        } else if (asistenciaModal.sortColumn === "telefono") {
          valA = (a.telefono || "").toLowerCase();
          valB = (b.telefono || "").toLowerCase();
        } else if (asistenciaModal.sortColumn === "fecha") {
          valA = a.fechaInscripcion ? new Date(a.fechaInscripcion).getTime() : 0;
          valB = b.fechaInscripcion ? new Date(b.fechaInscripcion).getTime() : 0;
        } else if (asistenciaModal.sortColumn === "estado") {
          valA = (a.estado || "").toLowerCase();
          valB = (b.estado || "").toLowerCase();
        }
        
        if (valA < valB) return asistenciaModal.sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return asistenciaModal.sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    // Prepare data based on selected columns
    const reportData = sortedInscritos.map((ins, index) => {
      const row = {};
      if (columns.nro) row["Nº"] = index + 1;
      if (columns.nombre)
        row["Nombre Completo"] =
          `${ins.nombre} ${ins.apellidoPaterno || ""} ${ins.apellidoMaterno || ""}`.trim();
      if (columns.email) row["Correo Electrónico"] = ins.email || "Sin correo";
      if (columns.telefono) row["Teléfono"] = ins.telefono || "Sin teléfono";
      if (columns.fecha)
        row["Fecha Inscripción"] = ins.fechaInscripcion
          ? new Date(ins.fechaInscripcion).toLocaleDateString()
          : "Sin registro";
      if (columns.estado) row["Estado"] = ins.estado || "Activo";
      
      // Columnas vacías personalizadas
      if (asistenciaModal.customCol1Enabled && asistenciaModal.customCol1Name.trim()) {
        row[asistenciaModal.customCol1Name.trim()] = "___________________";
      }
      if (asistenciaModal.customCol2Enabled && asistenciaModal.customCol2Name.trim()) {
        row[asistenciaModal.customCol2Name.trim()] = "___________________";
      }
      if (asistenciaModal.customCol3Enabled && asistenciaModal.customCol3Name.trim()) {
        row[asistenciaModal.customCol3Name.trim()] = "___________________";
      }
      return row;
    });

    const activeHeaders = Object.keys(reportData[0]);

    if (format === "csv" || format === "excel") {
      const worksheet = XLSX.utils.json_to_sheet(reportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia");

      const max_width = reportData.reduce((w, r) => {
        activeHeaders.forEach((key) => {
          const v = r[key] ? r[key].toString() : "";
          w[key] = Math.max(w[key] || key.length, v.length);
        });
        return w;
      }, {});
      worksheet["!cols"] = activeHeaders.map((key) => ({
        wch: max_width[key] + 2,
      }));

      XLSX.writeFile(
        workbook,
        `asistencia_${act.nombre.toLowerCase().replace(/\s+/g, "_")}.xlsx`,
      );
    } else if (format === "txt") {
      const txtContent = [
        `PLANILLA DE ASISTENCIA - ${act.nombre.toUpperCase()}`,
        "=".repeat(act.nombre.length + 24),
        `Modalidad: ${act.modalidad.toUpperCase()}`,
        `Fecha de Actividad: ${new Date(act.fecha + "T00:00:00").toLocaleDateString()}`,
        `Fecha de Reporte: ${new Date().toLocaleString()}`,
        `Total de Alumnos: ${inscritos.length}`,
        "",
        activeHeaders.join("\t"),
        "-".repeat(activeHeaders.join("\t").length + 10),
        ...reportData.map((row) => activeHeaders.map((h) => row[h]).join("\t")),
      ].join("\n");

      const blob = new Blob([txtContent], {
        type: "text/plain;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `asistencia_${act.nombre.toLowerCase().replace(/\s+/g, "_")}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === "pdf") {
      const doc = new jsPDF({
        orientation: activeHeaders.length > 5 ? "landscape" : "portrait",
      });

      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(`Planilla de Asistencia`, 14, 20);

      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235); // blue-600
      doc.text(`Actividad: ${act.nombre}`, 14, 27);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(
        `Fecha: ${new Date(act.fecha + "T00:00:00").toLocaleDateString()}  |  Hora: ${act.hora?.substring(0, 5)}  |  Modalidad: ${act.modalidad.toUpperCase()}`,
        14,
        34,
      );
      doc.text(
        `Lugar/Enlace: ${act.ubicacion}  |  Total alumnos inscritos: ${inscritos.length}`,
        14,
        40,
      );

      const tableData = reportData.map((row) =>
        activeHeaders.map((h) => row[h]),
      );

      autoTable(doc, {
        startY: 46,
        head: [activeHeaders.map((h) => h.toUpperCase())],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], textColor: 255 }, // blue-600 header
        alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50 alternate rows
        styles: { fontSize: 8.5, cellPadding: 4, overflow: "linebreak" },
        columnStyles: {
          Nº: { width: 10 },
          "Firma / Asistencia": { width: 45 },
        },
        margin: { top: 46, left: 14, right: 14, bottom: 20 },
        didDrawPage: function () {
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184); // slate-400
          const str = "Página " + doc.internal.getNumberOfPages();
          const pageWidth =
            doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
          doc.text(
            str,
            pageWidth -
              14 -
              (doc.getStringUnitWidth(str) * doc.internal.getFontSize()) /
                doc.internal.scaleFactor,
            doc.internal.pageSize.height - 10,
          );
          doc.text(
            "Control Financiero Académico - Reporte Oficial de Asistencia",
            14,
            doc.internal.pageSize.height - 10,
          );
        },
      });

      doc.save(
        `asistencia_${act.nombre.toLowerCase().replace(/\s+/g, "_")}.pdf`,
      );
    }
    setAsistenciaModal((prev) => ({ ...prev, open: false }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.nombre.trim()) errors.nombre = "El nombre de la actividad es requerido (Ej: Taller de React).";
    const categoryExists = tipos.some(t => t.id === formData.tipo_actividad_id);
    if (!formData.tipo_actividad_id || !categoryExists) {
      errors.tipo_actividad_id = "Debe seleccionar una categoría de actividad válida.";
    }
    if (formData.costo === "") errors.costo = "El costo de la actividad es requerido (coloque 0 si es gratuita, Ej: 50).";
    if (formData.cupos === "") errors.cupos = "El número de cupos disponibles es requerido (Ej: 30).";

    if (!formData.fecha) errors.fecha = "La fecha de la actividad es requerida (Ej: 2026-06-15).";
    if (!formData.hora) errors.hora = "La hora de la actividad es requerida (Ej: 19:30).";

    if (formData.fecha && formData.hora) {
      const selectedDateTime = new Date(`${formData.fecha}T${formData.hora}`);
      const currentDateTime = new Date();
      if (selectedDateTime < currentDateTime) {
        const errorMsg = "La fecha y hora de la actividad no pueden ser anteriores al momento actual.";
        errors.fecha = errorMsg;
        errors.hora = errorMsg;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setConfirmActionModal({ open: true });
  };

  const executeSubmit = async () => {
    setConfirmActionModal({ open: false });
    setIsSubmitting(true);
    setLoadingModal({
      open: true,
      text: editingAct ? "Actualizando actividad académica..." : "Registrando nueva actividad académica...",
    });
    try {
      const finalCupos = editingAct
        ? Number(formData.cupos) + (parseInt(adicionalCupos) || 0)
        : Number(formData.cupos);

      const payload = {
        ...formData,
        cupos: finalCupos,
        miembro_id: user?.id,
      };

      if (editingAct) {
        if (editingAct.estado === "cancelado") {
          payload.estado = "programado";
        }
        const actualizado = await academicoApi.actualizarActividad(
          editingAct.id,
          payload,
          selectedFile,
        );

        // Notificar a los inscritos si el costo cambió
        const costChanged = Number(editingAct.costo) !== Number(formData.costo);
        if (costChanged) {
          try {
            const { data: inscritos } = await supabase
              .from('inscripcion')
              .select('miembro_id')
              .eq('actividad_id', editingAct.id);
            
            if (inscritos && inscritos.length > 0) {
              const isDecreased = Number(formData.costo) < Number(editingAct.costo);
              const notifications = inscritos.map(ins => ({
                miembro_id: ins.miembro_id,
                titulo: 'Modificación de Costo',
                descripcion: isDecreased
                  ? `El costo de la actividad "${formData.nombre}" ha sido modificado de Bs. ${editingAct.costo} a Bs. ${formData.costo}. Por favor pase por secretaría para la devolución del monto correspondiente a su favor.`
                  : `El costo de la actividad "${formData.nombre}" ha sido modificado de Bs. ${editingAct.costo} a Bs. ${formData.costo}. Si no está de acuerdo con las modificaciones, puede pasar por secretaría para anular la inscripción.`,
                estado: 'pendiente'
              }));
              await supabase.from('notificacion').insert(notifications);
            }
          } catch (notifErr) {
            console.error('[Notif] Error al crear notificaciones por cambio de costo:', notifErr);
          }
        }

        setActividades(
          actividades.map((a) => (a.id === editingAct.id ? actualizado : a)),
        );
        setLoadingModal({ open: false, text: "" });
        clearDraft();
        setResultModal({
          open: true,
          type: "success",
          text: "¡Actividad actualizada!",
          details:
            "Los cambios y detalles de la actividad académica han sido guardados con éxito.",
        });
      } else {
        const nuevaAct = await academicoApi.crearActividad(
          payload,
          selectedFile,
        );
        setActividades([nuevaAct, ...actividades]);
        setLoadingModal({ open: false, text: "" });
        clearDraft();
        setShowConfetti(true);
        setResultModal({
          open: true,
          type: "success",
          text: "¡Actividad creada!",
          details:
            "La nueva actividad académica ha sido registrada e integrada en el cronograma institucional.",
        });
      }
      setAdicionalCupos("");
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setLoadingModal({ open: false, text: "" });
      setResultModal({
        open: true,
        type: "error",
        text: "Error al guardar actividad",
        details:
          err instanceof Error
            ? err.message
            : "Error desconocido de conexión o base de datos. Verifique si ejecutó el script setup.sql.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPages = Math.ceil(actividades.length / ITEMS_PER_PAGE);
  const paginatedActividades = actividades.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const rows = paginatedActividades.map((act, index) => ({
    ...act,
    nro: (
      <span className="font-bold text-slate-500">
        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
      </span>
    ),
    fecha_hora: (
      <div className="flex flex-col">
        <span className="font-bold text-slate-900">
          {new Date(act.fecha + "T00:00:00").toLocaleDateString()}
        </span>
        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
          {act.hora?.substring(0, 5) || "--:--"}
        </span>
      </div>
    ),
    ubicacion_display: (
      <div className="flex flex-col">
        <span className="font-bold text-slate-900 truncate max-w-[150px]">
          {act.ubicacion || "Sin ubicación"}
        </span>
        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
          {act.modalidad === "virtual" ? (
            <Info className="h-3 w-3" />
          ) : (
            <MapPin className="h-3 w-3" />
          )}
          {act.modalidad || "presencial"}
        </span>
      </div>
    ),
    imagen_display: (
      <div
        className="h-10 w-16 rounded overflow-hidden bg-slate-100 border border-slate-200 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() =>
          act.imagen && setImageModal({ open: true, url: act.imagen })
        }
      >
        {act.imagen ? (
          <img
            src={act.imagen}
            alt={act.nombre}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
            Sin Foto
          </div>
        )}
      </div>
    ),

    acciones: (() => {
      // Una actividad cancelada NUNCA es "finalizada" — tiene su propio estado
      // y debe poder editarse / re-publicarse independientemente de su fecha.
      const esCancelado = act.estado === "cancelado";
      const esFinalizado =
        !esCancelado && getDynamicEstado(act.fecha, act.hora) === "finalizado";
      const debeMostrarOculto = act.publicado === false || esFinalizado;
      return (
        <div className="flex gap-1.5 sm:gap-2 items-center">
          <button
            onClick={() => setDetalleModal({ open: true, actividad: act })}
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Detalle</span>
          </button>
          <button
            onClick={() => handleVerInscritos(act)}
            className="relative inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
            title="Ver inscritos"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Inscritos</span>
            <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-[9px] font-bold text-white px-1">
              {act.inscritos_count || 0}
            </span>
          </button>
          <button
            onClick={() => {
              handleReportActividadChange(act.id);
              setAsistenciaModal((prev) => ({
                ...prev,
                open: true,
              }));
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
            title="Generar Reporte de Asistencia"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Asistencia</span>
          </button>
          <button
            onClick={() => {
              if (esFinalizado) return;
              handleTogglePublicado(act);
            }}
            disabled={esFinalizado}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              esFinalizado
                ? "bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
                : act.publicado === false
                  ? "bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/20 dark:text-violet-400"
                  : "bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/20 dark:text-violet-400"
            }`}
            title={
              esFinalizado
                ? "No se puede publicar/ocultar una actividad finalizada"
                : act.publicado === false
                  ? "Publicar actividad"
                  : "Ocultar actividad"
            }
          >
            {debeMostrarOculto ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>Oculto</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>Público</span>
              </>
            )}
          </button>
          <button
            onClick={() => {
              if (esFinalizado) return;
              handleOpenEdit(act);
            }}
            disabled={esFinalizado}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              esFinalizado
                ? "bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            }`}
            title={
              esFinalizado ? "No se puede editar un curso finalizado" : "Editar"
            }
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Editar</span>
          </button>
          {(!act.inscritos_count || act.inscritos_count === 0) && (
            <button
              onClick={() => {
                if (esFinalizado) return;
                handleDelete(act.id);
              }}
              disabled={esFinalizado}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${
                esFinalizado
                  ? "bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
                  : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              }`}
              title={
                esFinalizado
                  ? "No se puede eliminar un curso finalizado"
                  : "Eliminar permanentemente"
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Eliminar</span>
            </button>
          )}
          {act.estado !== "cancelado" &&
            !esFinalizado &&
            act.inscritos_count > 0 && (
              <button
                onClick={() => handleCancelar(act)}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
                title="Cancelar Actividad (Devolución)"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Cancelar</span>
              </button>
            )}
        </div>
      );
    })(),
  }));

  // KPI metrics
  const totalActividades = actividades.length;
  const programadas = actividades.filter(a => getDynamicEstado(a.fecha, a.hora) === 'programado').length;
  const enCurso = actividades.filter(a => getDynamicEstado(a.fecha, a.hora) === 'en_curso').length;
  const finalizadas = actividades.filter(a => getDynamicEstado(a.fecha, a.hora) === 'finalizado').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Gestión de Actividades
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Planifica y registra eventos, cursos y otras actividades
            institucionales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            data={actividades.map((a) => ({
              Actividad: a.nombre,
              Tipo: a.tipo_nombre,
              Fecha: a.fecha,
              Hora: a.hora,
              Ubicacion: a.ubicacion,
              Modalidad: a.modalidad,
              Cupos: a.cupos,
            }))}
            filename="lista_actividades"
            title="Cronograma de Actividades"
          />

          <Button
            type="button"
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-none h-9 flex items-center justify-center gap-2 px-3"
          >
            <CalendarPlus className="h-4 w-4 shrink-0" />
            <span className="sm:hidden text-xs">Nuevo</span>
            <span className="hidden sm:inline text-sm">Nueva actividad</span>
          </Button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <CalendarPlus className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-slate-900 truncate">{totalActividades}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Total Actividades</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-amber-600 truncate">{programadas}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Programadas</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-emerald-600 truncate">{enCurso}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">En Curso</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-slate-700 truncate">{finalizadas}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Finalizadas</p>
          </div>
        </div>
      </div>

      <section className="rounded-md bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Listado de actividades
            </h2>
          </div>
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
            title="Refrescar listado"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Refrescar</span>
          </button>
        </div>

        <div className="flex justify-end mb-4">
          <span className="text-sm text-slate-500">{actividades.length} registros</span>
        </div>

        <div className="-mx-4 sm:mx-0 overflow-x-auto">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                <Spinner size="sm" />
                Cargando actividades...
              </div>
            ) : error ? (
              <Toast title="Error" message={error} variant="error" />
            ) : (
              <Table
                columns={columns}
                rows={rows}
                emptyMessage="No hay actividades registradas."
              />
            )}
          </div>
        </div>

        {!loading && !error && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 mt-4 gap-4">
            <p className="text-[10px] sm:text-xs text-slate-500">
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, actividades.length)} de{" "}
              {actividades.length} actividades
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                className="h-8 px-2 text-[10px] sm:text-xs"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <div className="flex items-center gap-1 mx-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "primary" : "outline"}
                      className={`h-7 w-7 sm:h-8 sm:w-8 p-0 text-[10px] sm:text-xs ${currentPage === page ? "bg-blue-600 text-white" : ""}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ),
                )}
              </div>

              <Button
                variant="outline"
                className="h-8 px-2 text-[10px] sm:text-xs"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAct ? "Editar actividad" : "Crear nueva actividad"}
        width="max-w-5xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* R20: Banner informativo sobre campos opcionales */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-400 backdrop-blur-sm animate-in fade-in duration-300 box-orange">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900 dark:text-white">
                Recordatorio de Registro Completo
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                Por favor, asegúrese de completar la{" "}
                <strong>Descripción</strong> de la actividad, el{" "}
                <strong>Costo (Bs)</strong> y los <strong>Requisitos</strong>.
                Llenar estos campos opcionales es de vital importancia para
                proveer claridad a los socios inscritos y evitar consultas
                administrativas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {/* Carga de Imagen */}
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 group hover:border-blue-300 transition-colors relative overflow-hidden min-h-[140px]">
                <label className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
                  <div className="h-10 w-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Camera className="h-5 w-5 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-600">
                    Subir imagen
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {/* Previsualización de Imagen */}
              {previewUrl && (
                <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg max-w-xs relative group animate-in fade-in duration-200">
                  <p className="text-xs text-slate-400 font-medium mb-1">
                    Previsualización de Imagen:
                  </p>
                  <div className="relative rounded overflow-hidden border border-slate-100">
                    <img
                      src={previewUrl}
                      alt="Vista previa de la actividad"
                      className="max-h-45 w-auto object-cover rounded shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() =>
                        setImageModal({ open: true, url: previewUrl })
                      }
                      title="Haga clic para ampliar"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Haga clic en la imagen para ampliar
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition"
                      title="Eliminar imagen"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              <Input
                label="Nombre de la Actividad"
                placeholder="Ej: Taller de Oratoria"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                error={formErrors.nombre}
                required
              />

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Tags className="h-3 w-3" /> Tipo de Actividad
                </label>
                <select
                  value={formData.tipo_actividad_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tipo_actividad_id: e.target.value,
                    })
                  }
                  className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 ${
                    formErrors.tipo_actividad_id ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                  } bg-white`}
                  required
                >
                  <option value="" disabled>
                    Selecciona una categoría
                  </option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
                {tipos.length === 0 && (
                  <p className="text-xs font-semibold text-amber-600 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 inline text-amber-600 shrink-0" />
                    No hay categorías registradas. Por favor, crea al menos una en el menú "Tipos de Actividades".
                  </p>
                )}
                {formErrors.tipo_actividad_id && (
                  <p className="text-xs font-medium text-red-500 mt-1">{formErrors.tipo_actividad_id}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleDateOrTimeChange("fecha", e.target.value)}
                  error={formErrors.fecha}
                  required
                />
                <Input
                  label="Hora"
                  type="time"
                  value={formData.hora}
                  onChange={(e) => handleDateOrTimeChange("hora", e.target.value)}
                  error={formErrors.hora}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Modalidad
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["presencial", "virtual"].map((mod) => (
                    <button
                      key={mod}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, modalidad: mod })
                      }
                      className={`py-2 px-4 rounded-xl text-xs font-black uppercase transition-all border ${
                        formData.modalidad === mod
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200"
                          : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Lugar / Enlace"
                value={formData.ubicacion}
                onChange={(e) =>
                  setFormData({ ...formData, ubicacion: e.target.value })
                }
                placeholder={
                  formData.modalidad === "virtual"
                    ? "Enlace de Zoom/Meet"
                    : "Dirección física"
                }
                required
              />

              {formData.modalidad === "presencial" && (
                <MapPicker
                  lat={formData.latitud}
                  lng={formData.longitud}
                  onChange={(lat, lng) =>
                    setFormData({ ...formData, latitud: lat, longitud: lng })
                  }
                  color="emerald"
                />
              )}

              <Input
                label="Costo (Bs)"
                type="number"
                placeholder="Ej: 50"
                value={formData.costo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    costo: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                error={formErrors.costo}
                required
                disabled={!!editingAct}
                className={editingAct ? "bg-slate-50 cursor-not-allowed opacity-80" : ""}
              />

              {editingAct ? (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Cupos actuales"
                    type="number"
                    value={formData.cupos}
                    disabled
                    className="bg-slate-50 cursor-not-allowed opacity-80"
                  />
                  <Input
                    label="Agregar más cupos"
                    type="number"
                    placeholder="Ej: 5"
                    min="1"
                    value={adicionalCupos}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setAdicionalCupos("");
                      } else {
                        const num = parseInt(val);
                        setAdicionalCupos(isNaN(num) || num <= 0 ? "" : num);
                      }
                    }}
                  />
                </div>
              ) : (
                <Input
                  label="Cupos disponibles"
                  type="number"
                  placeholder="Ej: 30"
                  value={formData.cupos}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cupos:
                        e.target.value === "" ? "" : parseInt(e.target.value),
                    })
                  }
                  error={formErrors.cupos}
                  required
                />
              )}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Input
              label="Descripción"
              type="textarea"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              className="h-20"
            />
            <Input
              label="Requisitos"
              type="textarea"
              value={formData.requisitos}
              onChange={(e) =>
                setFormData({ ...formData, requisitos: e.target.value })
              }
              placeholder="Ej: Conocimientos previos en..."
              className="h-20"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`h-6 w-11 rounded-full p-1 transition-colors ${formData.incluye_certificacion ? "bg-emerald-600" : "bg-slate-200"}`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-transform ${formData.incluye_certificacion ? "translate-x-5" : "translate-x-0"}`}
                  />
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.incluye_certificacion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      incluye_certificacion: e.target.checked,
                    })
                  }
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-600">
                  Incluye Certificado
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`h-6 w-11 rounded-full p-1 transition-colors ${formData.publicado ? "bg-blue-600" : "bg-slate-200"}`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-transform ${formData.publicado ? "translate-x-5" : "translate-x-0"}`}
                  />
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.publicado}
                  onChange={(e) =>
                    setFormData({ ...formData, publicado: e.target.checked })
                  }
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">
                  Publicar Inmediatamente
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
            <div className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
              El estado se actualizará automáticamente según la fecha
              seleccionada.
            </span>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isSubmitDisabled}
              className={isSubmitDisabled ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isSubmitting
                ? "Guardando..."
                : editingAct
                  ? "Actualizar Actividad"
                  : "Guardar Actividad"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de inscritos a la actividad */}
      <Modal
        isOpen={inscritosModal.open}
        onClose={() => setInscritosModal((prev) => ({ ...prev, open: false }))}
        title={`Inscritos: ${inscritosModal.actividad?.nombre || ""}`}
        width="max-w-4xl"
      >
        {inscritosModal.loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-slate-500">
            <Spinner size="sm" /> Cargando inscritos...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lista de inscritos actual */}
            {inscritosModal.inscritos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                No hay inscritos en esta actividad.
              </p>
            ) : (() => {
              const query = (searchInscritosQuery || "").toLowerCase().trim();
              const filtered = inscritosModal.inscritos.filter((u) => {
                const fullName = `${u.nombre || ""} ${u.apellidoPaterno || ""} ${u.apellidoMaterno || ""}`.toLowerCase();
                const email = (u.email || "").toLowerCase();
                const phone = (u.telefono || "").toLowerCase();
                return fullName.includes(query) || email.includes(query) || phone.includes(query);
              });
              return (
                <div className="space-y-3">
                  {/* Buscador de inscritos */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar inscrito por nombre, correo o teléfono..."
                      value={searchInscritosQuery}
                      onChange={(e) => setSearchInscritosQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                      {query ? `${filtered.length} de ` : ""}{inscritosModal.inscritos.length} inscrito(s)
                    </p>
                    {filtered.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-6">
                        No se encontraron inscritos que coincidan con la búsqueda.
                      </p>
                    ) : (
                      filtered.map((u, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm border border-slate-100 animate-fadeIn"
                        >
                           <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleProcesarReembolso(u)}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors mr-2 shrink-0 text-xs font-semibold ${
                                u.totalPaid > 0 
                                  ? "bg-amber-50 text-amber-600 hover:bg-amber-100" 
                                  : "bg-rose-50 text-red-600 hover:bg-rose-100"
                              }`}
                              title={u.totalPaid > 0 ? "Procesar Reembolso (El socio ya pagó)" : "Anular Inscripción"}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>{u.totalPaid > 0 ? "Reembolsar" : "Anular"}</span>
                            </button>
                            <span className="font-mono font-black text-slate-400 bg-slate-200/50 rounded-full h-6 w-6 flex items-center justify-center text-xs shrink-0">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {u.nombre} {u.apellidoPaterno || ""}{" "}
                                {u.apellidoMaterno || ""}
                              </p>
                              <p className="text-xs text-slate-400 font-medium">
                                {u.email} {u.telefono ? `| Tel: ${u.telefono}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${u.estado === "activo" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-600"}`}
                            >
                              {u.estado}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">
                              {u.fechaInscripcion
                                ? new Date(u.fechaInscripcion).toLocaleDateString(
                                    "es-ES",
                                  )
                                : ""}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Formulario de inscripción manual */}
            {inscritosModal.actividad &&
              (() => {
                const enrolledIds = new Set(
                  inscritosModal.inscritos.map((ins) => ins.id),
                );
                const availableMiembros = todosMiembros.filter(
                  (m) => m.estado === "activo" && !enrolledIds.has(m.id),
                );

                return (
                  <form
                    onSubmit={handleManualInscribir}
                    className={`mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 space-y-3 transition-all ${isMemberDropdownOpen ? "pb-48" : ""}`}
                  >
                    <h4 className="text-xs font-black text-slate-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Users className="h-4 w-4" /> Inscribir Socio Manualmente
                    </h4>
                    <div className="flex gap-2 relative">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Buscar socio por nombre o correo..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none pr-8"
                          value={memberSearchQuery}
                          onChange={(e) => {
                            setMemberSearchQuery(e.target.value);
                            setIsMemberDropdownOpen(true);
                            if (!e.target.value) {
                              setSelectedMiembroId("");
                            }
                          }}
                          onFocus={() => setIsMemberDropdownOpen(true)}
                          required
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <Search className="h-4 w-4 text-slate-400" />
                        </div>

                        {isMemberDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setIsMemberDropdownOpen(false)}
                            />
                            <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-20">
                              {availableMiembros
                                .filter((m) => {
                                  const fullName =
                                    `${m.nombre} ${m.apellidoPaterno || ""} ${m.apellidoMaterno || ""}`.toLowerCase();
                                  const email = (
                                    m.correoElectronico || ""
                                  ).toLowerCase();
                                  const query = memberSearchQuery.toLowerCase();
                                  return (
                                    fullName.includes(query) ||
                                    email.includes(query)
                                  );
                                })
                                .slice(0, 10)
                                .map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex flex-col border-b border-slate-100/60 last:border-0"
                                    onClick={() => {
                                      setSelectedMiembroId(m.id);
                                      setMemberSearchQuery(
                                        `${m.nombre} ${m.apellidoPaterno || ""} (${m.correoElectronico})`,
                                      );
                                      setIsMemberDropdownOpen(false);
                                    }}
                                  >
                                    <span className="font-semibold text-slate-800">
                                      {m.nombre} {m.apellidoPaterno || ""}{" "}
                                      {m.apellidoMaterno || ""}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {m.correoElectronico}
                                    </span>
                                  </button>
                                ))}

                              {availableMiembros.filter((m) => {
                                const fullName =
                                  `${m.nombre} ${m.apellidoPaterno || ""} ${m.apellidoMaterno || ""}`.toLowerCase();
                                const email = (
                                  m.correoElectronico || ""
                                ).toLowerCase();
                                const query = memberSearchQuery.toLowerCase();
                                return (
                                  fullName.includes(query) ||
                                  email.includes(query)
                                );
                              }).length === 0 && (
                                <div className="px-3 py-3 text-xs text-slate-400 text-center">
                                  No se encontraron socios disponibles
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      <Button
                        type="submit"
                        disabled={manualInscribiendo || !selectedMiembroId}
                        className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase px-4 py-2"
                      >
                        {manualInscribiendo ? "Inscribiendo..." : "Inscribir"}
                      </Button>
                    </div>
                  </form>
                );
              })()}
          </div>
        )}
      </Modal>

      {/* Modal de detalle de actividad */}
      <Modal
        isOpen={detalleModal.open}
        onClose={() => setDetalleModal({ open: false, actividad: null })}
        title="Detalle de la Actividad"
        width="max-w-4xl"
      >
        {detalleModal.actividad && (
          <div className="space-y-6 text-sm">
            {/* Cabecera / Imagen y Título */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {detalleModal.actividad.imagen ? (
                <img
                  src={detalleModal.actividad.imagen}
                  alt={detalleModal.actividad.nombre}
                  className="w-full md:w-48 h-32 object-cover rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() =>
                    setImageModal({
                      open: true,
                      url: detalleModal.actividad.imagen,
                    })
                  }
                  title="Haga clic para ampliar"
                />
              ) : (
                <div className="w-full md:w-48 h-32 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-400 font-bold uppercase shrink-0">
                  Sin Imagen
                </div>
              )}
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 uppercase tracking-wide">
                    {detalleModal.actividad.tipo_nombre}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                      detalleModal.actividad.modalidad === "virtual"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {detalleModal.actividad.modalidad}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                      detalleModal.actividad.estado === "finalizado"
                        ? "bg-slate-100 text-slate-700"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {detalleModal.actividad.estado}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {detalleModal.actividad.nombre}
                </h3>
                <p className="text-slate-500">
                  {detalleModal.actividad.descripcion || "Sin descripción"}
                </p>
              </div>
            </div>

            {/* Datos Técnicos de la Actividad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                  Fecha y Hora
                </p>
                <p className="font-semibold text-slate-900">
                  {new Date(
                    detalleModal.actividad.fecha + "T00:00:00",
                  ).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  a las {detalleModal.actividad.hora?.substring(0, 5)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                  Costo / Inversión
                </p>
                <p className="font-bold text-emerald-700 text-base">
                  {detalleModal.actividad.costo > 0
                    ? `Bs. ${detalleModal.actividad.costo}`
                    : "Gratuito"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                  Ubicación / Lugar
                </p>
                <p className="font-semibold text-slate-900 flex items-center gap-1">
                  {detalleModal.actividad.modalidad === "virtual" ? (
                    <a
                      href={detalleModal.actividad.ubicacion}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800 break-all"
                    >
                      {detalleModal.actividad.ubicacion}
                    </a>
                  ) : (
                    <span className="text-slate-900 break-words">
                      {detalleModal.actividad.ubicacion}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                  Cupos Totales
                </p>
                <p className="font-semibold text-slate-900">
                  {detalleModal.actividad.cupos} cupos disponibles
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                  Certificación
                </p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                    detalleModal.actividad.incluye_certificacion
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {detalleModal.actividad.incluye_certificacion
                    ? "Sí, incluye certificación"
                    : "No incluye certificación"}
                </span>
              </div>

              {detalleModal.actividad.requisitos && (
                <div className="col-span-1 md:col-span-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                    Requisitos previos
                  </p>
                  <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                    {detalleModal.actividad.requisitos}
                  </p>
                </div>
              )}
              {detalleModal.actividad.jurados &&
                detalleModal.actividad.jurados.length > 0 && (
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Users className="h-3 w-3" /> Jurado Asignado
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {detalleModal.actividad.jurados.map((j, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700"
                        >
                          {j}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Mapa de Ubicación si es Presencial */}
            {detalleModal.actividad.modalidad === "presencial" &&
              detalleModal.actividad.latitud && (
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <p className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest p-3 border-b border-slate-200">
                    Ubicación Georreferenciada
                  </p>
                  <div className="p-1">
                    <iframe
                      title="Ubicación de Actividad"
                      width="100%"
                      height="220"
                      frameBorder="0"
                      style={{ border: 0, borderRadius: "8px" }}
                      src={`https://maps.google.com/maps?q=${detalleModal.actividad.latitud},${detalleModal.actividad.longitud}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
          </div>
        )}
      </Modal>

      {/* Modal de Configuración de Reporte de Asistencia */}
      <Modal
        isOpen={asistenciaModal.open}
        onClose={() => setAsistenciaModal((prev) => ({ ...prev, open: false }))}
        title="Configuración de Reporte de Asistencia"
        width="max-w-5xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-6">
              {/* Selección de Columnas */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                    <FileText className="h-4 w-4 text-blue-600" /> Atributos a exportar
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAsistenciaModal(prev => ({
                        ...prev,
                        columns: { ...prev.columns, email: true, telefono: true, fecha: true, estado: true }
                      }))}
                      className="text-[10px] text-blue-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      Todos
                    </button>
                    <span className="text-[10px] text-slate-350">|</span>
                    <button
                      type="button"
                      onClick={() => setAsistenciaModal(prev => ({
                        ...prev,
                        columns: { ...prev.columns, email: false, telefono: false, fecha: false, estado: false }
                      }))}
                      className="text-[10px] text-blue-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-not-allowed p-1.5 rounded opacity-75 text-slate-700 dark:text-slate-350">
                    <input
                      type="checkbox"
                      checked
                      disabled
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Nº (Secuencial)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-not-allowed p-1.5 rounded opacity-75 text-slate-700 dark:text-slate-350">
                    <input
                      type="checkbox"
                      checked
                      disabled
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Nombre completo</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={asistenciaModal.columns.email}
                      onChange={() => setAsistenciaModal(prev => ({ ...prev, columns: { ...prev.columns, email: !prev.columns.email } }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Correo Electrónico</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={asistenciaModal.columns.telefono}
                      onChange={() => setAsistenciaModal(prev => ({ ...prev, columns: { ...prev.columns, telefono: !prev.columns.telefono } }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Teléfono</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={asistenciaModal.columns.fecha}
                      onChange={() => setAsistenciaModal(prev => ({ ...prev, columns: { ...prev.columns, fecha: !prev.columns.fecha } }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Fecha Inscripción</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={asistenciaModal.columns.estado}
                      onChange={() => setAsistenciaModal(prev => ({ ...prev, columns: { ...prev.columns, estado: !prev.columns.estado } }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Estado inscripción</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Columnas vacías adicionales + Ordenamiento */}
            <div className="space-y-6">
              {/* Columnas Vacías Personalizadas */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <FileText className="h-4 w-4 text-blue-600" /> Columnas vacías adicionales (máx. 3)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
                    <input 
                      type="checkbox" 
                      checked={asistenciaModal.customCol1Enabled}
                      onChange={(e) => setAsistenciaModal(prev => ({ ...prev, customCol1Enabled: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <input 
                      type="text" 
                      placeholder="Columna 1"
                      value={asistenciaModal.customCol1Name}
                      onChange={(e) => setAsistenciaModal(prev => ({ ...prev, customCol1Name: e.target.value }))}
                      disabled={!asistenciaModal.customCol1Enabled}
                      className="w-full bg-transparent border-0 p-0 text-xs text-slate-700 dark:text-slate-200 focus:ring-0 disabled:opacity-50 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
                    <input 
                      type="checkbox" 
                      checked={asistenciaModal.customCol2Enabled}
                      onChange={(e) => setAsistenciaModal(prev => ({ ...prev, customCol2Enabled: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <input 
                      type="text" 
                      placeholder="Columna 2"
                      value={asistenciaModal.customCol2Name}
                      onChange={(e) => setAsistenciaModal(prev => ({ ...prev, customCol2Name: e.target.value }))}
                      disabled={!asistenciaModal.customCol2Enabled}
                      className="w-full bg-transparent border-0 p-0 text-xs text-slate-700 dark:text-slate-200 focus:ring-0 disabled:opacity-50 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
                    <input 
                      type="checkbox" 
                      checked={asistenciaModal.customCol3Enabled}
                      onChange={(e) => setAsistenciaModal(prev => ({ ...prev, customCol3Enabled: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <input 
                      type="text" 
                      placeholder="Columna 3"
                      value={asistenciaModal.customCol3Name}
                      onChange={(e) => setAsistenciaModal(prev => ({ ...prev, customCol3Name: e.target.value }))}
                      disabled={!asistenciaModal.customCol3Enabled}
                      className="w-full bg-transparent border-0 p-0 text-xs text-slate-700 dark:text-slate-200 focus:ring-0 disabled:opacity-50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Ordenamiento */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-orange-600" /> Ordenar datos
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Ordenar por</label>
                    <select
                      value={asistenciaModal.sortColumn}
                      onChange={(e) => setAsistenciaModal(prev => ({ ...prev, sortColumn: e.target.value }))}
                      className="w-full rounded-md border border-slate-350 dark:border-slate-850 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    >
                      <option value="">(Sin orden específico)</option>
                      <option value="nombre">Nombre completo</option>
                      <option value="email">Correo Electrónico</option>
                      <option value="telefono">Teléfono</option>
                      <option value="fecha">Fecha Inscripción</option>
                      <option value="estado">Estado inscripción</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Dirección</label>
                    <select
                      value={asistenciaModal.sortOrder}
                      onChange={(e) => setAsistenciaModal(prev => ({ ...prev, sortOrder: e.target.value }))}
                      disabled={!asistenciaModal.sortColumn}
                      className="w-full rounded-md border border-slate-350 dark:border-slate-850 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 disabled:opacity-50"
                    >
                      <option value="asc">Ascendente (A-Z, Menor-Mayor)</option>
                      <option value="desc">Descendente (Z-A, Mayor-Menor)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vista previa / Resumen de inscritos (abajo, ancho completo) */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Vista previa (primeros 3 registros)
            </h4>
            {asistenciaModal.loading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> Cargando inscripciones...
              </div>
            ) : !asistenciaModal.selectedActividadId ? (
              <div className="py-8 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 italic text-center">
                Seleccione una actividad de la lista de la izquierda para ver los inscritos y habilitar la exportación.
              </div>
            ) : sortedPreviewInscritos.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-sm text-amber-600 dark:text-amber-400 text-center gap-2">
                <Info className="h-6 w-6 text-amber-500" />
                <span>
                  No hay socios inscritos en esta actividad. Inscriba socios primero en la lista de actividades para poder generar el reporte de asistencia.
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900/80">
                    <tr>
                      {(() => {
                        const headers = ["Nº", "Nombre completo"];
                        if (asistenciaModal.columns.email) headers.push("Correo Electrónico");
                        if (asistenciaModal.columns.telefono) headers.push("Teléfono");
                        if (asistenciaModal.columns.fecha) headers.push("Fecha Inscripción");
                        if (asistenciaModal.columns.estado) headers.push("Estado inscripción");
                        if (asistenciaModal.customCol1Enabled && asistenciaModal.customCol1Name.trim()) headers.push(asistenciaModal.customCol1Name.trim());
                        if (asistenciaModal.customCol2Enabled && asistenciaModal.customCol2Name.trim()) headers.push(asistenciaModal.customCol2Name.trim());
                        if (asistenciaModal.customCol3Enabled && asistenciaModal.customCol3Name.trim()) headers.push(asistenciaModal.customCol3Name.trim());
                        return headers.map(h => (
                          <th key={h} className="px-4 py-2.5 text-left font-bold text-slate-700 dark:text-slate-350 capitalize tracking-wider border-b border-slate-200 dark:border-slate-800">{h}</th>
                        ));
                      })()}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 bg-white dark:bg-slate-950 text-slate-750 dark:text-slate-350">
                    {sortedPreviewInscritos.slice(0, 3).map((ins, idx) => {
                      const cells = [];
                      cells.push(idx + 1);
                      cells.push(`${ins.nombre} ${ins.apellidoPaterno || ""} ${ins.apellidoMaterno || ""}`);
                      if (asistenciaModal.columns.email) cells.push(ins.email || "—");
                      if (asistenciaModal.columns.telefono) cells.push(ins.telefono || "—");
                      if (asistenciaModal.columns.fecha) cells.push(ins.fechaInscripcion ? new Date(ins.fechaInscripcion).toLocaleDateString() : "—");
                      if (asistenciaModal.columns.estado) cells.push(ins.estado || "Activo");
                      if (asistenciaModal.customCol1Enabled && asistenciaModal.customCol1Name.trim()) cells.push("");
                      if (asistenciaModal.customCol2Enabled && asistenciaModal.customCol2Name.trim()) cells.push("");
                      if (asistenciaModal.customCol3Enabled && asistenciaModal.customCol3Name.trim()) cells.push("");
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          {cells.map((cell, cIdx) => (
                            <td key={cIdx} className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-900 truncate max-w-[200px]">{cell}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Banner */}
          {asistenciaModal.selectedActividadId && !asistenciaModal.loading && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 text-center">
              Se exportarán <strong>{sortedPreviewInscritos.length}</strong> registros de <strong>{asistenciaModal.inscritos.length}</strong> en total.
            </div>
          )}

        {/* Botones de acción */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() =>
                setAsistenciaModal((prev) => ({ ...prev, open: false }))
              }
            >
              Cancelar
            </Button>
            <Button
              onClick={() => executeAsistenciaExport("pdf")}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 font-bold px-4 py-2"
              disabled={
                asistenciaModal.inscritos.length === 0 ||
                asistenciaModal.loading
              }
            >
              <FileType className="h-4 w-4" /> Exportar PDF (Firma)
            </Button>
            <Button
              onClick={() => executeAsistenciaExport("excel")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 font-bold px-4 py-2"
              disabled={
                asistenciaModal.inscritos.length === 0 ||
                asistenciaModal.loading
              }
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </Button>
            <Button
              onClick={() => executeAsistenciaExport("txt")}
              className="bg-slate-700 hover:bg-slate-800 text-white flex items-center gap-2 font-bold px-4 py-2"
              disabled={
                asistenciaModal.inscritos.length === 0 ||
                asistenciaModal.loading
              }
            >
              <FileText className="h-4 w-4" /> Exportar TXT
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para ver imagen en grande */}
      <Modal
        isOpen={imageModal.open}
        onClose={() => setImageModal({ open: false, url: null })}
        title="Vista previa de imagen"
      >
        <div className="flex justify-center bg-slate-900/5 rounded-xl p-2 overflow-hidden">
          {imageModal.url && (
            <img
              src={imageModal.url}
              alt="Vista previa"
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
          )}
        </div>
      </Modal>

      <Modal
        isOpen={resultModal.open}
        onClose={() => setResultModal((prev) => ({ ...prev, open: false }))}
        title={
          resultModal.type === "success"
            ? "Operación Exitosa"
            : "Error en Operación"
        }
        width="max-w-md"
      >
        <div className="flex flex-col items-center text-center space-y-4 py-2">
          {resultModal.type === "success" ? (
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          ) : (
            <div className="rounded-full bg-rose-100 p-3 text-rose-600">
              <AlertCircle className="h-12 w-12" />
            </div>
          )}
          <h4
            className={`text-lg font-bold ${resultModal.type === "success" ? "text-slate-900" : "text-rose-900"}`}
          >
            {resultModal.text}
          </h4>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
            {resultModal.details}
          </p>
          <div className="pt-2 w-full">
            <Button
              className="w-full"
              variant={resultModal.type === "success" ? "primary" : "danger"}
              onClick={() =>
                setResultModal((prev) => ({ ...prev, open: false }))
              }
            >
              Entendido
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal General de Confirmación */}
      <Modal
        isOpen={generalConfirmModal.open}
        onClose={() =>
          setGeneralConfirmModal((prev) => ({ ...prev, open: false }))
        }
        title={
          <div
            className={`flex items-center gap-2.5 ${generalConfirmModal.actionType === "danger" ? "text-red-600" : "text-blue-600"}`}
          >
            <Info className="h-5.5 w-5.5 stroke-[2.5]" />
            <span>{generalConfirmModal.title}</span>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div
            className={`flex items-start gap-3 p-3 rounded-lg text-sm border ${
              generalConfirmModal.actionType === "danger"
                ? "bg-red-50 border-red-100 text-red-800"
                : "bg-blue-50 border-blue-100 text-blue-800"
            }`}
          >
            <Info
              className={`h-5 w-5 shrink-0 mt-0.5 ${generalConfirmModal.actionType === "danger" ? "text-red-600" : "text-blue-600"}`}
            />
            <div>
              <span>{generalConfirmModal.message}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() =>
                setGeneralConfirmModal((prev) => ({ ...prev, open: false }))
              }
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={generalConfirmModal.onConfirm}
              variant={
                generalConfirmModal.actionType === "danger"
                  ? "danger"
                  : "primary"
              }
            >
              {generalConfirmModal.confirmText}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal premium de confirmación de acción (Crear/Editar) */}
      <Modal
        isOpen={confirmActionModal.open}
        onClose={() => setConfirmActionModal({ open: false })}
        title={
          <div className="flex items-center gap-2.5 text-blue-600">
            <Info className="h-5.5 w-5.5 stroke-[2.5]" />
            <span>Confirmar Acción</span>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-sm">
            <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <span>
                ¿Estás seguro de que deseas{" "}
                <strong>{editingAct ? "actualizar" : "registrar"}</strong> esta
                actividad en el sistema? Esta acción{" "}
                {editingAct
                  ? "sobrescribirá la información anterior y actualizará el cronograma institucional para los socios."
                  : "creará un nuevo registro en la base de datos y notificará a los socios activos por correo (si aplica)."}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setConfirmActionModal({ open: false })}
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={executeSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" /> Procesando...
                </>
              ) : (
                "Sí, continuar"
              )}
            </Button>
          </div>
        </div>
      </Modal>
      <LoadingOverlay open={loadingModal.open} text={loadingModal.text} />
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
};
