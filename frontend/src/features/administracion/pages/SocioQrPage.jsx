import { useState, useEffect, useMemo, useCallback } from 'react';
import { QrCode, RefreshCw, AlertTriangle, Upload } from 'lucide-react';
import { finanzasApi } from '../../finanzas/api';
import { Button, Modal } from '../../../components/ui';
import { Toast, LoadingOverlay } from '../../../components/feedback';
import { cloudinaryService } from '../../../services/cloudinary';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../services/supabase';

export const SocioQrPage = () => {
  const { user } = useAuthStore();
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);

  // States for report modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [conceptType, setConceptType] = useState('cuota'); // 'cuota' | 'actividad'
  const [selectedConcept, setSelectedConcept] = useState(''); // mes (cuota) o inscripcionId (actividad)
  const [reportAmount, setReportAmount] = useState('');
  const [selectedQrId, setSelectedQrId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [reportNotes, setReportNotes] = useState('');

  // Data list states
  const [cuotasData, setCuotasData] = useState(null);
  const [inscripciones, setInscripciones] = useState([]);

  // Feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [toast, setToast] = useState({ open: false, type: 'success', text: '' });

  const fetchQrs = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const data = await finanzasApi.obtenerQrs();
      setQrs(data.filter(q => q.activo));
    } catch (err) {
      console.error('Error cargando QRs:', err);
      setError('No se pudieron obtener los códigos QR de pago. Por favor, reintente.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSocioData = useCallback(async () => {
    if (!user?.id) return;
    await Promise.resolve();
    try {
      const [historial, { data: insData, error: insErr }] = await Promise.all([
        finanzasApi.obtenerHistorialCuotasMiembro(true),
        supabase
          .from('inscripcion')
          .select(`
            id,
            estado,
            fecha_inscripcion,
            actividad:actividad_id(
              id, titulo, costo, fecha, hora, modalidad,
              tipo_actividad:tipo_actividad_id(nombre)
            ),
            ingreso(monto, estado)
          `)
          .eq('miembro_id', user.id)
          .order('fecha_inscripcion', { ascending: false })
      ]);

      const miRegistro = historial.find(h => h.miembro?.id === user.id);
      if (miRegistro) setCuotasData(miRegistro);
      if (!insErr && insData) setInscripciones(insData);
    } catch (err) {
      console.error("Error cargando datos del socio:", err);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQrs();
    if (user?.id) {
      fetchSocioData();
    }
  }, [user, fetchQrs, fetchSocioData]);

  // Cronograma filtrado de cuotas
  const cronograma = useMemo(() => {
    const raw = cuotasData?.cronograma || [];
    return [...raw].sort((a, b) => new Date(b.creacion) - new Date(a.creacion));
  }, [cuotasData?.cronograma]);

  const pendingCuotasOptions = useMemo(() => {
    return cronograma.filter(c => !c.pagado);
  }, [cronograma]);

  const pendingActsOptions = useMemo(() => {
    return inscripciones.filter(ins => {
      const costo = ins.actividad?.costo || 0;
      const validIngresos = ins.ingreso ? ins.ingreso.filter(ing => ing.estado !== 'devolucion') : [];
      const totalPaid = validIngresos.reduce((sum, ing) => sum + Number(ing.monto || 0), 0);
      return totalPaid < costo && costo > 0;
    });
  }, [inscripciones]);



  // Handlers del modal de reporte
  const handleConceptTypeChange = (e) => {
    const type = e.target.value;
    setConceptType(type);
    setSelectedConcept('');
    setReportAmount('');
  };

  const handleConceptChange = (e) => {
    const conceptId = e.target.value;
    setSelectedConcept(conceptId);

    if (conceptType === 'cuota') {
      const selected = pendingCuotasOptions.find(c => c.mes === conceptId);
      if (selected) {
        setReportAmount(String(selected.monto_esperado));
      } else {
        setReportAmount('');
      }
    } else {
      const selected = pendingActsOptions.find(ins => ins.id === conceptId);
      if (selected) {
        const costo = selected.actividad?.costo || 0;
        const validIngresos = selected.ingreso ? selected.ingreso.filter(ing => ing.estado !== 'devolucion') : [];
        const totalPaid = validIngresos.reduce((sum, ing) => sum + Number(ing.monto || 0), 0);
        setReportAmount(String(costo - totalPaid));
      } else {
        setReportAmount('');
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setToast({ open: true, type: 'error', text: 'El comprobante debe ser una imagen o PDF.' });
        return;
      }
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedConcept) {
      setToast({ open: true, type: 'error', text: 'Debe seleccionar el periodo o actividad a pagar.' });
      return;
    }
    if (!reportAmount || Number(reportAmount) <= 0) {
      setToast({ open: true, type: 'error', text: 'El monto debe ser mayor a 0.' });
      return;
    }
    if (!selectedFile) {
      setToast({ open: true, type: 'error', text: 'El comprobante de pago es obligatorio.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('Registrando reporte de pago y subiendo comprobante...');

    try {
      const comprobanteUrl = await cloudinaryService.uploadFile(selectedFile, 'ingresos');
      
      const selectedQr = qrs.find(q => q.id === selectedQrId);
      let tipoIngresoId = selectedQr?.tipo_ingreso_id || null;

      if (!tipoIngresoId) {
        const tipos = await finanzasApi.obtenerTiposIngreso();
        if (conceptType === 'cuota') {
          const cuotaTipo = tipos.find(t => 
            t.nombre === 'Membresía Ordinaria' || 
            t.nombre === 'Cuota Mensual' || 
            t.nombre.toLowerCase().includes('cuota')
          );
          tipoIngresoId = cuotaTipo?.id || tipos[0]?.id;
        } else {
          const actTipo = tipos.find(t => t.nombre.toLowerCase().includes('actividad') || t.nombre.toLowerCase().includes('curso'));
          tipoIngresoId = actTipo?.id || tipos[0]?.id;
        }
      }

      let descFinal = reportNotes.trim();
      const prependedDesc = conceptType === 'cuota'
        ? `Reporte de cuota: ${selectedConcept}.`
        : `Reporte de actividad pendiente.`;
      
      descFinal = descFinal ? `${prependedDesc} Nota: ${descFinal}` : prependedDesc;

      await finanzasApi.registrarPago({
        miembroId: user.id,
        registradoPor: null,
        tipo_ingreso_id: tipoIngresoId,
        monto: Number(reportAmount),
        descripcion: descFinal,
        fecha: new Date().toISOString().split('T')[0],
        estado: 'pendiente',
        comprobanteUrl,
        inscripcionId: conceptType === 'actividad' ? selectedConcept : null,
        qr_id: selectedQrId || null
      });

      setToast({ open: true, type: 'success', text: '¡Reporte de pago enviado correctamente! Queda pendiente de aprobación.' });
      setIsReportModalOpen(false);
      fetchSocioData();
    } catch (err) {
      console.error("Error al reportar pago:", err);
      setToast({ open: true, type: 'error', text: err.message || 'No se pudo registrar el reporte de pago.' });
    } finally {
      setIsSubmitting(false);
      setSubmitMessage('');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <QrCode className="h-6 w-6 text-emerald-600" />
            Códigos QR de Pago
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Escanea cualquiera de los siguientes códigos QR oficiales para realizar tus transferencias de membresía o actividades.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={fetchQrs}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refrescar
        </Button>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <span className="text-sm font-medium">{error}</span>
          <Button onClick={fetchQrs} size="sm" variant="outline" className="ml-auto bg-white">
            Reintentar
          </Button>
        </div>
      ) : qrs.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto mt-6">
          <QrCode className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-slate-800">No hay códigos QR disponibles</h3>
          <p className="text-sm text-slate-500 mt-1">
            Actualmente no hay códigos QR de pago habilitados por el administrador.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {qrs.map((qr) => (
            <div
              key={qr.id}
              className="bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
            >
              {/* Imagen QR Clicable */}
              <div 
                onClick={() => qr.url_qr && setZoomImage(qr)}
                className={`bg-slate-50 aspect-square flex items-center justify-center p-8 relative border-b transition-colors hover:bg-slate-100/50 ${
                  qr.url_qr ? 'cursor-zoom-in' : ''
                }`}
              >
                {qr.url_qr ? (
                  <img
                    src={qr.url_qr}
                    alt={qr.nombre}
                    className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <QrCode className="h-20 w-20 text-slate-300" />
                )}
              </div>

              {/* Título y Botón */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-center text-sm">{qr.nombre}</h3>
                  <div className="text-center mt-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 border border-blue-100 text-blue-700 select-none">
                      {qr.tipo_ingreso_nombre || 'General / Todos'}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-center text-xs text-slate-400">
                  Escanea el código QR de arriba para transferir.
                </div>

                <Button 
                  onClick={() => {
                    setSelectedQrId(qr.id);
                    setIsReportModalOpen(true);
                  }}
                  className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md shadow-emerald-500/10"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Reportar Pago
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Zoom QR */}
      <Modal
        isOpen={!!zoomImage}
        onClose={() => setZoomImage(null)}
        title={zoomImage?.nombre || 'Escanear Código QR'}
        size="md"
      >
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl">
          {zoomImage?.url_qr && (
            <img
              src={zoomImage.url_qr}
              alt={zoomImage.nombre}
              className="max-h-[65vh] object-contain rounded-xl shadow-inner cursor-zoom-out"
              onClick={() => setZoomImage(null)}
            />
          )}
          <p className="mt-4 text-sm font-semibold text-slate-700 text-center">
            {zoomImage?.nombre}
          </p>
          <p className="text-xs text-slate-400 mt-1 text-center">
            Asegúrate de registrar tu comprobante una vez realizada la transferencia.
          </p>
        </div>
      </Modal>

      {/* Modal de Reporte de Pago */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => !isSubmitting && setIsReportModalOpen(false)}
        title="Reportar Pago de Membresía / Actividad"
        size="md"
      >
        <form onSubmit={handleReportSubmit} className="space-y-4 py-2">
          {/* Tipo de Concepto */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Concepto a Pagar</label>
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="conceptType"
                  value="cuota"
                  checked={conceptType === 'cuota'}
                  onChange={handleConceptTypeChange}
                  disabled={isSubmitting}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-700">Cuotas Mensuales</span>
              </label>
              <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="conceptType"
                  value="actividad"
                  checked={conceptType === 'actividad'}
                  onChange={handleConceptTypeChange}
                  disabled={isSubmitting}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-700">Actividades / Cursos</span>
              </label>
            </div>
          </div>

          {/* Selector de Concepto Específico */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              {conceptType === 'cuota' ? 'Seleccionar Mes Pendiente' : 'Seleccionar Actividad Inscrita'}
            </label>
            <select
              value={selectedConcept}
              onChange={handleConceptChange}
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              disabled={isSubmitting}
              required
            >
              <option value="">-- Seleccionar --</option>
              {conceptType === 'cuota' ? (
                pendingCuotasOptions.map(c => (
                  <option key={c.mes} value={c.mes}>{c.mes} (Espera: Bs. {Number(c.monto_esperado).toFixed(2)})</option>
                ))
              ) : (
                pendingActsOptions.map(ins => {
                  const costo = ins.actividad?.costo || 0;
                  const validIngresos = ins.ingreso ? ins.ingreso.filter(ing => ing.estado !== 'devolucion') : [];
                  const totalPaid = validIngresos.reduce((sum, ing) => sum + Number(ing.monto || 0), 0);
                  const remaining = costo - totalPaid;
                  return (
                    <option key={ins.id} value={ins.id}>
                      {ins.actividad?.titulo} (Resta: Bs. {Number(remaining).toFixed(2)})
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Monto de pago */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Monto a Reportar (Bs)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={reportAmount}
              onChange={(e) => setReportAmount(e.target.value)}
              placeholder="0.00"
              className="flex h-10 w-full rounded-md border border-slate-300 bg-slate-50 cursor-not-allowed px-3 py-2 text-sm focus:outline-none text-slate-500 font-medium"
              disabled={isSubmitting}
              readOnly
              required
            />
          </div>


          {/* Carga del comprobante */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-700">Comprobante de Pago (Imagen / PDF) <span className="text-red-500">*</span></span>
            <div className="flex gap-4 items-center">
              <div className="w-20 h-20 bg-slate-50 border rounded-xl flex items-center justify-center overflow-hidden shrink-0 relative">
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <Upload className="h-6 w-6 text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg shadow-sm text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  Subir Comprobante
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                </label>
                <p className="text-[10px] text-slate-400">Solo imágenes o archivos PDF.</p>
              </div>
            </div>
          </div>

          {/* Notas adicionales */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Notas Adicionales (Opcional)</label>
            <textarea
              value={reportNotes}
              onChange={(e) => setReportNotes(e.target.value)}
              placeholder="Ej. Número de transacción, observaciones particulares..."
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 min-h-[60px]"
              disabled={isSubmitting}
            />
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReportModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Reporte'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Overlay de carga */}
      {isSubmitting && <LoadingOverlay text={submitMessage} />}

      {/* Toast notifications */}
      {toast.open && (
        <Toast
          type={toast.type}
          text={toast.text}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
        />
      )}
    </div>
  );
};
