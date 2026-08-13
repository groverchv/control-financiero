import { useState, useEffect, useCallback } from 'react';
import { QrCode, PlusCircle, Edit, Trash2, XCircle, RefreshCw, Upload, Eye, EyeOff, Search } from 'lucide-react';
import { finanzasApi } from '../api';
import { Button, Input, Modal, Select } from '../../../components/ui';
import { Toast, LoadingOverlay } from '../../../components/feedback';
import { cloudinaryService } from '../../../services/cloudinary';

export const GestionQrPage = () => {
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modales y Formularios
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, mode: 'create' }); // 'create', 'edit', 'toggle_status'
  const [statusToggleQr, setStatusToggleQr] = useState(null);
  
  const [editingQr, setEditingQr] = useState(null); // null para creación
  const [deletingQr, setDeletingQr] = useState(null);
  
  const [nombre, setNombre] = useState('');
  const [activo, setActivo] = useState(true);
  const [tipoIngresoId, setTipoIngresoId] = useState('');
  const [tiposIngreso, setTiposIngreso] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  
  // Estados de carga
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [toast, setToast] = useState({ open: false, type: 'success', text: '' });
  const [zoomImage, setZoomImage] = useState(null);

  const fetchQrs = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const data = await finanzasApi.obtenerQrs();
      setQrs(data);
    } catch (err) {
      console.error('Error cargando QRs:', err);
      setError(err instanceof Error ? err.message : 'Error al obtener la lista de códigos QR.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQrs();
    finanzasApi.obtenerTiposIngreso()
      .then(setTiposIngreso)
      .catch(err => console.error('Error cargando tipos de ingreso:', err));
  }, [fetchQrs]);

  const showToast = (type, text) => {
    setToast({ open: true, type, text });
  };

  const handleOpenAdd = () => {
    setEditingQr(null);
    setNombre('');
    setTipoIngresoId('');
    setActivo(true);
    setSelectedFile(null);
    setFilePreview(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (qr) => {
    setEditingQr(qr);
    setNombre(qr.nombre);
    setTipoIngresoId(qr.tipo_ingreso_id || '');
    setActivo(qr.activo);
    setSelectedFile(null);
    setFilePreview(qr.url_qr);
    setIsFormModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('error', 'El archivo seleccionado debe ser una imagen.');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Abre el modal de confirmación antes de guardar
  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      showToast('error', 'El nombre es obligatorio.');
      return;
    }
    if (!editingQr && !selectedFile) {
      showToast('error', 'Debe seleccionar una imagen para el código QR.');
      return;
    }
    setConfirmModal({ open: true, mode: editingQr ? 'edit' : 'create' });
  };

  // Ejecuta la acción real de guardado (Crear o Editar)
  const executeSubmit = async () => {
    setConfirmModal({ open: false, mode: 'create' });
    setIsSubmitting(true);
    setSubmitMessage(editingQr ? 'Actualizando código QR...' : 'Subiendo y guardando código QR...');

    try {
      let imageUrl = editingQr ? editingQr.url_qr : '';

      // Subir archivo a Cloudinary si se seleccionó uno nuevo
      if (selectedFile) {
        imageUrl = await cloudinaryService.uploadFile(selectedFile, 'qrs');
      }

      if (editingQr) {
        await finanzasApi.actualizarQr(editingQr.id, {
          nombre,
          url_qr: imageUrl,
          activo,
          tipo_ingreso_id: tipoIngresoId || null
        });
        showToast('success', '¡Código QR actualizado con éxito!');
      } else {
        await finanzasApi.crearQr(nombre, imageUrl, activo, tipoIngresoId || null);
        showToast('success', '¡Código QR registrado con éxito!');
      }

      setIsFormModalOpen(false);
      fetchQrs();
    } catch (err) {
      console.error('Error al guardar QR:', err);
      showToast('error', err instanceof Error ? err.message : 'No se pudo guardar el código QR.');
    } finally {
      setIsSubmitting(false);
      setSubmitMessage('');
    }
  };

  const handleOpenDelete = (qr) => {
    setDeletingQr(qr);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingQr) return;
    setIsSubmitting(true);
    setSubmitMessage('Eliminando código QR...');
    try {
      await finanzasApi.eliminarQr(deletingQr.id);
      showToast('success', `El código QR "${deletingQr.nombre}" ha sido eliminado.`);
      setIsDeleteModalOpen(false);
      fetchQrs();
    } catch (err) {
      console.error('Error eliminando QR:', err);
      showToast('error', 'No se pudo eliminar el código QR.');
    } finally {
      setIsSubmitting(false);
      setSubmitMessage('');
    }
  };

  const handlePreToggleStatus = (qr) => {
    setStatusToggleQr(qr);
    setConfirmModal({ open: true, mode: 'toggle_status' });
  };

  const executeToggleStatus = async () => {
    if (!statusToggleQr) return;
    setConfirmModal({ open: false, mode: 'toggle_status' });
    setIsSubmitting(true);
    setSubmitMessage(statusToggleQr.activo ? 'Ocultando código QR...' : 'Publicando código QR...');
    try {
      await finanzasApi.actualizarQr(statusToggleQr.id, {
        nombre: statusToggleQr.nombre,
        url_qr: statusToggleQr.url_qr,
        activo: !statusToggleQr.activo
      });
      showToast('success', `Código QR ${!statusToggleQr.activo ? 'publicado' : 'ocultado'} correctamente.`);
      setStatusToggleQr(null);
      fetchQrs();
    } catch (err) {
      console.error('Error al cambiar estado de QR:', err);
      showToast('error', 'No se pudo cambiar el estado del código QR.');
    } finally {
      setIsSubmitting(false);
      setSubmitMessage('');
    }
  };

  // Filtrado de registros
  const filteredQrs = qrs.filter(qr => 
    qr.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <QrCode className="h-6 w-6 text-blue-600" />
            Gestionar QR de Pago
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra los códigos QR disponibles para los pagos de los socios de la institución.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Nuevo QR de Pago
        </Button>
      </div>

      {/* Barra de Filtros y Acciones (Estilo Compartido) */}
      <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre / concepto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0">
            <Button
              variant="outline"
              onClick={fetchQrs}
              disabled={loading}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-950"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
            <span className="text-sm font-medium text-slate-500">
              {filteredQrs.length} {filteredQrs.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </div>
      </div>

      {/* Contenido */}
      {loading && qrs.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2">
          <XCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <Button onClick={fetchQrs} size="sm" variant="outline" className="ml-auto">
            Reintentar
          </Button>
        </div>
      ) : filteredQrs.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto">
          <QrCode className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-slate-800">No se encontraron códigos QR</h3>
          <p className="text-sm text-slate-500 mt-1">
            Intenta cambiar los términos de búsqueda o agrega un nuevo código QR.
          </p>
          <Button onClick={handleOpenAdd} className="mt-5" size="sm">
            Crear QR de Pago
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQrs.map((qr) => (
            <div
              key={qr.id}
              className={`bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col ${
                !qr.activo ? 'opacity-75' : ''
              }`}
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
                
                {/* Indicador de Estado en la esquina superior derecha */}
                <span
                  className={`absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm select-none ${
                    qr.activo
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {qr.activo ? '● Activo' : '○ Inactivo'}
                </span>
              </div>

              {/* Detalles */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 line-clamp-1">{qr.nombre}</h3>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 border border-blue-200 text-blue-700 select-none">
                    {qr.tipo_ingreso_nombre || 'General / Todos'}
                  </span>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Creado: {new Date(qr.creacion).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-4 border-t shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 min-w-[75px] flex items-center justify-center gap-1 px-1.5 py-1.5 text-xs font-semibold transition-all ${
                      qr.activo
                        ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    onClick={() => handlePreToggleStatus(qr)}
                  >
                    {qr.activo ? (
                      <>
                        <Eye className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                        <span>Ocultar</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>Publicar</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[70px] flex items-center justify-center gap-1 px-1.5 py-1.5 text-xs font-semibold"
                    onClick={() => handleOpenEdit(qr)}
                  >
                    <Edit className="h-3.5 w-3.5 shrink-0" /> <span>Editar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100 flex-1 min-w-[80px] flex items-center justify-center gap-1 px-1.5 py-1.5 text-xs font-semibold"
                    onClick={() => handleOpenDelete(qr)}
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" /> <span>Eliminar</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Formulario (Crear/Editar) */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => !isSubmitting && setIsFormModalOpen(false)}
        title={editingQr ? 'Editar Código QR' : 'Nuevo Código QR de Pago'}
        size="md"
      >
        <form onSubmit={handlePreSubmit} className="space-y-5 p-1">
          <Input
            label="Nombre / Concepto del QR"
            placeholder="Ej. QR Banco Unión - Cuenta Ahorros"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <Select
            label="Tipo de Ingreso Vinculado"
            id="tipo_ingreso_id"
            value={tipoIngresoId}
            onChange={(e) => setTipoIngresoId(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">General / Todos los Tipos</option>
            {tiposIngreso.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </Select>

          {/* Carga de Imagen */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-700">Imagen del QR</span>
            <div className="flex gap-4 items-center">
              <div className="w-32 h-32 bg-slate-50 border rounded-2xl flex items-center justify-center overflow-hidden shrink-0 relative">
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <QrCode className="h-10 w-10 text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 border rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Subir Imagen
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                </label>
                <p className="text-xs text-slate-400">
                  Formatos recomendados: PNG, JPG o WEBP. Dimensión cuadrada.
                </p>
              </div>
            </div>
          </div>

          {/* Toggle de Estado Activo */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <span className="block text-sm font-medium text-slate-900">Estado de Activación</span>
              <p className="text-xs text-slate-500">
                Los QRs inactivos no se muestran al registrar nuevos ingresos.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="sr-only peer"
                disabled={isSubmitting}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {editingQr ? 'Guardar Cambios' : 'Registrar QR'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal De Confirmación de Eliminación */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isSubmitting && setIsDeleteModalOpen(false)}
        title="¿Eliminar Código QR?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            ¿Estás seguro de que deseas eliminar el código QR <strong>"{deletingQr?.nombre}"</strong>? Esta acción no se puede deshacer y también eliminará la imagen asociada.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="bg-red-600 hover:bg-red-500 text-white border-red-600 hover:border-red-500"
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Eliminando...' : 'Eliminar Permanentemente'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Genérico de Confirmación (Guardar / Ocultar / Publicar) */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, mode: 'create' })}
        title={
          confirmModal.mode === 'create'
            ? '¿Registrar nuevo código QR?'
            : confirmModal.mode === 'edit'
            ? '¿Guardar cambios?'
            : statusToggleQr?.activo
            ? '¿Ocultar código QR?'
            : '¿Publicar código QR?'
        }
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {confirmModal.mode === 'create' && (
              `¿Estás seguro de que deseas registrar el código QR "${nombre}" en el sistema?`
            )}
            {confirmModal.mode === 'edit' && (
              `¿Estás seguro de que deseas aplicar las modificaciones al código QR "${nombre}"?`
            )}
            {confirmModal.mode === 'toggle_status' && (
              statusToggleQr?.activo
                ? `¿Estás seguro de que deseas ocultar el código QR "${statusToggleQr?.nombre}"? Dejará de estar disponible al registrar ingresos.`
                : `¿Estás seguro de que deseas publicar el código QR "${statusToggleQr?.nombre}"? Volverá a estar visible al registrar ingresos.`
            )}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmModal({ open: false, mode: 'create' })}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmModal.mode === 'toggle_status' ? executeToggleStatus : executeSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Procesando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Zoom de Imagen */}
      <Modal
        isOpen={!!zoomImage}
        onClose={() => setZoomImage(null)}
        title={zoomImage?.nombre || 'Ver QR'}
        size="md"
      >
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl">
          {zoomImage?.url_qr && (
            <img
              src={zoomImage.url_qr}
              alt={zoomImage.nombre}
              className="max-h-[70vh] object-contain rounded-xl"
            />
          )}
          <p className="mt-4 text-sm text-slate-500 text-center font-medium">
            {zoomImage?.nombre}
          </p>
        </div>
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
