import { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Edit, CheckCircle2, AlertCircle, Lock, Info, RefreshCw } from 'lucide-react';
import { useTiposActividad } from '../hooks';
import { Button, Input, Spinner, Modal, ExportButtons } from '../../../components/ui';
import { Toast, LoadingOverlay } from '../../../components/feedback';
import { Table } from '../../../components/data-display';
import { academicoApi } from '../api';

export const GestionTiposActividadPage = () => {
  const { tipos, loading, error, setTipos, refetch } = useTiposActividad();
  const [message, setMessage] = useState(null);
  const [tiposEnUso, setTiposEnUso] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: '',
    actionType: 'primary',
    onConfirm: null
  });
  const [loadingModal, setLoadingModal] = useState({ open: false, text: '' });

  const isFormInvalid = !formData.nombre.trim();
  const isFormUnchanged = !!editingTipo && 
    formData.nombre === editingTipo.nombre && 
    formData.descripcion === (editingTipo.descripcion || '');
  const isSubmitDisabled = isFormInvalid || isFormUnchanged;

  // Verificar qué tipos están en uso
  useEffect(() => {
    const verificarUso = async () => {
      if (tipos.length === 0) return;
      const uso = {};
      for (const tipo of tipos) {
        try {
          uso[tipo.id] = await academicoApi.verificarTipoActividadEnUso(tipo.id);
        } catch {
          uso[tipo.id] = false;
        }
      }
      setTiposEnUso(uso);
    };
    verificarUso();
  }, [tipos]);

  const openCreateModal = () => {
    setEditingTipo(null);
    setFormData({ nombre: '', descripcion: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (tipo) => {
    if (tiposEnUso[tipo.id]) {
      setResultModal({
        open: true,
        type: 'error',
        text: 'No se puede editar',
        details: `La categoría "${tipo.nombre}" está asociada a actividades existentes. Solo puede editarse si no tiene actividades vinculadas.`
      });
      return;
    }
    setEditingTipo(tipo);
    setFormData({ nombre: tipo.nombre, descripcion: tipo.descripcion || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoadingModal({
      open: true,
      text: editingTipo ? 'Actualizando categoría...' : 'Creando categoría...'
    });
    setMessage(null);

    try {
      if (editingTipo) {
        const actualizado = await academicoApi.actualizarTipoActividad(editingTipo.id, formData);
        setTipos(tipos.map(t => t.id === editingTipo.id ? actualizado : t));
        setLoadingModal({ open: false, text: '' });
        setResultModal({
          open: true,
          type: 'success',
          text: '¡Categoría actualizada con éxito!',
          details: `La categoría de actividad académica "${formData.nombre}" ha sido modificada correctamente.`
        });
      } else {
        const nuevo = await academicoApi.crearTipoActividad(formData);
        setTipos([nuevo, ...tipos]);
        setLoadingModal({ open: false, text: '' });
        setResultModal({
          open: true,
          type: 'success',
          text: '¡Categoría registrada con éxito!',
          details: `La nueva categoría de actividad "${formData.nombre}" ha sido guardada correctamente en el sistema.`
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setLoadingModal({ open: false, text: '' });
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error de procesamiento',
        details: err instanceof Error ? err.message : 'No se pudo guardar la categoría de actividad en Supabase.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    const tipo = tipos.find(t => t.id === id);
    if (tiposEnUso[id]) {
      setResultModal({
        open: true,
        type: 'error',
        text: 'No se puede eliminar',
        details: `La categoría "${tipo?.nombre}" está asociada a actividades existentes. Elimine o reasigne las actividades vinculadas antes de intentar eliminar esta categoría.`
      });
      return;
    }

    setConfirmModal({
      open: true,
      title: 'Confirmar Eliminación',
      message: `¿Estás seguro de eliminar la categoría de actividad "${tipo?.nombre}"? Esta acción no se puede deshacer y retirará el tipo de las categorías disponibles.`,
      confirmText: 'Sí, eliminar categoría',
      actionType: 'danger',
      onConfirm: async () => {
        setLoadingModal({ open: true, text: 'Eliminando categoría de actividad...' });
        try {
          await academicoApi.eliminarTipoActividad(id);
          setTipos(tipos.filter(t => t.id !== id));
          setLoadingModal({ open: false, text: '' });
          setResultModal({
            open: true,
            type: 'success',
            text: '¡Categoría eliminada!',
            details: `La categoría "${tipo?.nombre}" ha sido removida con éxito de la base de datos.`
          });
        } catch (err) {
          console.error(err);
          setLoadingModal({ open: false, text: '' });
          setResultModal({
            open: true,
            type: 'error',
            text: 'No se pudo eliminar',
            details: err instanceof Error ? err.message : 'No se pudo eliminar la categoría debido a dependencias con actividades existentes.'
          });
        }
      }
    });
  };

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'estado_uso', label: 'Estado' },
    { key: 'acciones', label: 'Acciones' }
  ];

  const rows = tipos.map(tipo => {
    const inUse = tiposEnUso[tipo.id];
    return {
      ...tipo,
      estado_uso: inUse ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
          <Lock className="h-3 w-3" /> En uso
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
          Disponible
        </span>
      ),
      acciones: (
        <div className="flex gap-2 items-center">
          <Button 
            size="xs"
            variant="outline"
            onClick={() => openEditModal(tipo)} 
            className="text-amber-600 border-amber-200 hover:bg-amber-50 flex items-center gap-1 h-7 font-bold" 
            title="Editar"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Editar</span>
          </Button>
          <Button 
            size="xs"
            variant="outline"
            onClick={() => handleDelete(tipo.id)} 
            disabled={inUse}
            className={inUse ? "opacity-40 cursor-not-allowed text-slate-400 h-7 font-bold" : "text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1 h-7 font-bold"}
            title={inUse ? 'No se puede eliminar porque está en uso' : 'Eliminar'}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Eliminar</span>
          </Button>
        </div>
      )
    };
  });

  const totalTipos = tipos.length;
  const enUsoCount = Object.values(tiposEnUso).filter(Boolean).length;
  const disponiblesCount = totalTipos - enUsoCount;

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Tipos de Actividades</h1>
          <p className="text-xs sm:text-sm text-slate-500">Define las categorías (Seminarios, Talleres, Eventos Sociales, etc.)</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons 
            data={tipos.map(t => ({
              Nombre: t.nombre,
              Descripción: t.descripcion || '—',
              'Fecha Creación': new Date(t.created_at).toLocaleDateString()
            }))}
            filename="tipos_actividades"
            title="Catálogo de Tipos de Actividades"
          />
          <Button onClick={openCreateModal} className="h-9 flex items-center justify-center gap-2 px-4">
            <PlusCircle className="h-4 w-4 shrink-0" />
            <span className="sm:hidden text-xs">Nuevo</span>
            <span className="hidden sm:inline text-sm">Nuevo Tipo</span>
          </Button>
        </div>
      </header>

      {/* Tarjetas de Métricas de Categorías */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <PlusCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-slate-900 truncate">
              {totalTipos}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Total Categorías</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Lock className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-amber-600 truncate">
              {enUsoCount}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Categorías en Uso</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-emerald-600 truncate">
              {disponiblesCount}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Categorías Disponibles</p>
          </div>
        </div>
      </div>

      {message && (
        <Toast
          title={message.type === 'error' ? 'Error' : 'Éxito'}
          message={message.text}
          variant={message.type === 'error' ? 'error' : 'success'}
        />
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden text-sm sm:text-base">
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Categorías de actividad
            </h2>
          </div>
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
            title="Refrescar listado"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>

        <div className="flex justify-end mb-4">
          <span className="text-sm text-slate-500">{tipos.length} registros</span>
        </div>
        <div className="-mx-4 sm:mx-0 overflow-x-auto">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-8">
                <Spinner size="sm" />
                Cargando tipos...
              </div>
            ) : error ? (
              <Toast title="Error" message={error} variant="error" />
            ) : (
              <Table
                columns={columns}
                rows={rows}
                emptyMessage="No hay tipos de actividad registrados."
              />
            )}
          </div>
        </div>
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTipo ? 'Editar tipo de actividad' : 'Nuevo tipo de actividad'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            label="Nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
            placeholder="Ej: Taller, Seminario, Evento Social"
          />
          <Input
            label="Descripción (opcional)"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            placeholder="Breve descripción de la categoría"
          />

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isSubmitDisabled}
              className={isSubmitDisabled ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={resultModal.open} 
        onClose={() => setResultModal(prev => ({ ...prev, open: false }))} 
        title={resultModal.type === 'success' ? "Operación Exitosa" : "Error en Operación"} 
        width="max-w-md"
      >
        <div className="flex flex-col items-center text-center space-y-4 py-2">
          {resultModal.type === 'success' ? (
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          ) : (
            <div className="rounded-full bg-rose-100 p-3 text-rose-600">
              <AlertCircle className="h-12 w-12" />
            </div>
          )}
          <h4 className={`text-lg font-bold ${resultModal.type === 'success' ? 'text-slate-900' : 'text-rose-900'}`}>
            {resultModal.text}
          </h4>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
            {resultModal.details}
          </p>
          <div className="pt-2 w-full">
            <Button 
              className="w-full" 
              variant={resultModal.type === 'success' ? 'primary' : 'danger'}
              onClick={() => setResultModal(prev => ({ ...prev, open: false }))}
            >
              Entendido
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal General de Confirmación */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        title={
          <div className={`flex items-center gap-2.5 ${confirmModal.actionType === 'danger' ? 'text-red-600' : 'text-blue-600'}`}>
            <Info className="h-5.5 w-5.5 stroke-[2.5]" />
            <span>{confirmModal.title}</span>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className={`flex items-start gap-3 p-3 rounded-lg text-sm border ${
            confirmModal.actionType === 'danger'
              ? 'bg-red-50 border-red-100 text-red-800'
              : 'bg-blue-50 border-blue-100 text-blue-800'
          }`}>
            <Info className={`h-5 w-5 shrink-0 mt-0.5 ${confirmModal.actionType === 'danger' ? 'text-red-600' : 'text-blue-600'}`} />
            <div>
              <span>{confirmModal.message}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setConfirmModal(prev => ({ ...prev, open: false }));
                if (confirmModal.onConfirm) confirmModal.onConfirm();
              }}
              variant={confirmModal.actionType === 'danger' ? 'danger' : 'primary'}
            >
              {confirmModal.confirmText || 'Confirmar'}
            </Button>
          </div>
        </div>
      </Modal>

      <LoadingOverlay open={loadingModal.open} text={loadingModal.text} />
    </div>
  );
};
