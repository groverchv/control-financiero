import { useState, useEffect, useCallback } from 'react';
import { Tags, PlusCircle, CheckCircle2, AlertCircle, Lock, Edit, Trash2 } from 'lucide-react';
import { finanzasApi } from '../api';
import { Button, Input, Spinner, Modal } from '../../../components/ui';
import { Toast, LoadingOverlay } from '../../../components/feedback';
import { Table } from '../../../components/data-display';

export const GestionTiposFinanzasPage = () => {
  const [tiposIngreso, setTiposIngreso] = useState([]);
  const [tiposEgreso, setTiposEgreso] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [tiposIngresoEnUso, setTiposIngresoEnUso] = useState({});
  const [tiposEgresoEnUso, setTiposEgresoEnUso] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('ingreso'); // 'ingreso' or 'egreso'
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });
  const [editingTipo, setEditingTipo] = useState(null); // { id, nombre, descripcion, type }
  const [deletingTipo, setDeletingTipo] = useState(null); // { id, nombre, type }
  const [loadingModal, setLoadingModal] = useState({ open: false, text: '' });

  const handleEditClick = (tipo, type) => {
    setEditingTipo({ ...tipo, type });
  };

  const handleDeleteClick = (tipo, type) => {
    setDeletingTipo({ ...tipo, type });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTipo) return;
    setIsSubmitting(true);
    setLoadingModal({ open: true, text: 'Actualizando categoría...' });
    try {
      if (editingTipo.type === 'ingreso') {
        await finanzasApi.actualizarTipoIngreso(editingTipo.id, editingTipo.nombre, editingTipo.descripcion);
        setTiposIngreso(prev => prev.map(t => t.id === editingTipo.id ? { ...t, nombre: editingTipo.nombre, descripcion: editingTipo.descripcion } : t));
      } else {
        await finanzasApi.actualizarTipoEgreso(editingTipo.id, editingTipo.nombre, editingTipo.descripcion);
        setTiposEgreso(prev => prev.map(t => t.id === editingTipo.id ? { ...t, nombre: editingTipo.nombre, descripcion: editingTipo.descripcion } : t));
      }
      setLoadingModal({ open: false, text: '' });
      setResultModal({
        open: true,
        type: 'success',
        text: `¡Categoría de ${editingTipo.type === 'ingreso' ? 'ingreso' : 'egreso'} actualizada!`,
        details: `La categoría ha sido modificada correctamente.`
      });
      setEditingTipo(null);
    } catch (err) {
      console.error(err);
      setLoadingModal({ open: false, text: '' });
      setResultModal({
        open: true,
        type: 'error',
        text: `Error al actualizar categoría`,
        details: err instanceof Error ? err.message : `No se pudo actualizar la categoría en Supabase.`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTipo) return;
    setIsSubmitting(true);
    setLoadingModal({ open: true, text: 'Eliminando categoría financiera...' });
    try {
      if (deletingTipo.type === 'ingreso') {
        await finanzasApi.eliminarTipoIngreso(deletingTipo.id);
        setTiposIngreso(prev => prev.filter(t => t.id !== deletingTipo.id));
      } else {
        await finanzasApi.eliminarTipoEgreso(deletingTipo.id);
        setTiposEgreso(prev => prev.filter(t => t.id !== deletingTipo.id));
      }
      setLoadingModal({ open: false, text: '' });
      setResultModal({
        open: true,
        type: 'success',
        text: `¡Categoría de ${deletingTipo.type === 'ingreso' ? 'ingreso' : 'egreso'} eliminada!`,
        details: `La categoría "${deletingTipo.nombre}" ha sido eliminada correctamente.`
      });
      setDeletingTipo(null);
    } catch (err) {
      console.error(err);
      setLoadingModal({ open: false, text: '' });
      setResultModal({
        open: true,
        type: 'error',
        text: `Error al eliminar categoría`,
        details: err instanceof Error ? err.message : `No se pudo eliminar la categoría en Supabase.`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [ingresos, egresos] = await Promise.all([
        finanzasApi.obtenerTiposIngreso(),
        finanzasApi.obtenerTiposEgreso(),
      ]);
      setTiposIngreso(ingresos);
      setTiposEgreso(egresos);

      // Verificar uso de cada tipo
      const ingresoUso = {};
      for (const tipo of ingresos) {
        try { ingresoUso[tipo.id] = await finanzasApi.verificarTipoIngresoEnUso(tipo.id); } catch { ingresoUso[tipo.id] = false; }
      }
      setTiposIngresoEnUso(ingresoUso);

      const egresoUso = {};
      for (const tipo of egresos) {
        try { egresoUso[tipo.id] = await finanzasApi.verificarTipoEgresoEnUso(tipo.id); } catch { egresoUso[tipo.id] = false; }
      }
      setTiposEgresoEnUso(egresoUso);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar categorias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDatos();
  }, [fetchDatos]);

  const openModal = (type) => {
    setModalType(type);
    setFormData({ nombre: '', descripcion: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoadingModal({ open: true, text: 'Creando categoría financiera...' });
    setMessage(null);

    try {
      if (modalType === 'ingreso') {
        const nuevo = await finanzasApi.crearTipoIngreso(formData.nombre, formData.descripcion);
        setTiposIngreso([nuevo, ...tiposIngreso]);
      } else {
        const nuevo = await finanzasApi.crearTipoEgreso(formData.nombre, formData.descripcion);
        setTiposEgreso([nuevo, ...tiposEgreso]);
      }
      setLoadingModal({ open: false, text: '' });
      setResultModal({
        open: true,
        type: 'success',
        text: `¡Categoría de ${modalType} registrada!`,
        details: `La nueva categoría "${formData.nombre}" ha sido dada de alta correctamente en la base de datos.`
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setLoadingModal({ open: false, text: '' });
      setResultModal({
        open: true,
        type: 'error',
        text: `Error al registrar categoría`,
        details: err instanceof Error ? err.message : `No se pudo registrar la categoría de ${modalType} en Supabase.`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columnasIngreso = [
    { 
      key: 'nombre', 
      label: 'Nombre',
      render: (val) => <span className="font-bold text-slate-900 block min-w-[100px]">{val}</span>
    },
    { 
      key: 'descripcion', 
      label: 'Descripción',
      render: (val) => <span className="text-slate-500 text-xs line-clamp-2 md:line-clamp-none min-w-[150px] md:min-w-0">{val}</span>
    },
    { key: 'estado_uso', label: 'Estado' },
    { key: 'acciones', label: 'Acciones' },
  ];

  const columnasEgreso = [
    { 
      key: 'nombre', 
      label: 'Nombre',
      render: (val) => <span className="font-bold text-slate-900 block min-w-[100px]">{val}</span>
    },
    { 
      key: 'descripcion', 
      label: 'Descripción',
      render: (val) => <span className="text-slate-500 text-xs line-clamp-2 md:line-clamp-none min-w-[150px] md:min-w-0">{val}</span>
    },
    { key: 'estado_uso', label: 'Estado' },
    { key: 'acciones', label: 'Acciones' },
  ];

  const rowsIngreso = tiposIngreso.map(tipo => ({
    ...tipo,
    estado_uso: tiposIngresoEnUso[tipo.id] ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
        <Lock className="h-3 w-3" /> En uso
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
        Disponible
      </span>
    ),
    acciones: tiposIngresoEnUso[tipo.id] ? (
      <div className="flex items-center gap-1.5 opacity-60">
        <Lock className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-400 text-[10px] italic whitespace-nowrap">En uso</span>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleEditClick(tipo, 'ingreso')}
          className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
          title="Editar"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleDeleteClick(tipo, 'ingreso')}
          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )
  }));

  const rowsEgreso = tiposEgreso.map(tipo => ({
    ...tipo,
    estado_uso: tiposEgresoEnUso[tipo.id] ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
        <Lock className="h-3 w-3" /> En uso
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
        Disponible
      </span>
    ),
    acciones: tiposEgresoEnUso[tipo.id] ? (
      <div className="flex items-center gap-1.5 opacity-60">
        <Lock className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-400 text-[10px] italic whitespace-nowrap">En uso</span>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleEditClick(tipo, 'egreso')}
          className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
          title="Editar"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleDeleteClick(tipo, 'egreso')}
          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Tipos de Ingreso y Egreso</h1>
        <p className="text-sm text-slate-500">Gestiona las categorías utilizadas para las finanzas. Los tipos en uso no pueden ser eliminados.</p>
      </header>

      {message && (
        <Toast
          title={message.type === 'error' ? 'Error' : 'Éxito'}
          message={message.text}
          variant={message.type === 'error' ? 'error' : 'success'}
        />
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner size="sm" />
          Cargando categorías...
        </div>
      ) : error ? (
        <Toast title="Error" message={error} variant="error" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tipos de Ingreso */}
          <section className="rounded-md bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Tags className="h-5 w-5 text-emerald-600 shrink-0" />
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">Tipos de Ingreso</h2>
              </div>
              <Button type="button" size="sm" onClick={() => openModal('ingreso')} className="shrink-0 flex items-center gap-1">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden xs:inline">Agregar</span>
                <span className="xs:hidden">Nuevo</span>
              </Button>
            </div>
            <div className="-mx-4 sm:mx-0">
              <Table
                columns={columnasIngreso}
                rows={rowsIngreso}
                emptyMessage="No hay tipos de ingreso registrados."
              />
            </div>
          </section>

          {/* Tipos de Egreso */}
          <section className="rounded-md bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Tags className="h-5 w-5 text-rose-600 shrink-0" />
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">Tipos de Egreso</h2>
              </div>
              <Button type="button" size="sm" onClick={() => openModal('egreso')} className="shrink-0 flex items-center gap-1">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden xs:inline">Agregar</span>
                <span className="xs:hidden">Nuevo</span>
              </Button>
            </div>
            <div className="-mx-4 sm:mx-0">
              <Table
                columns={columnasEgreso}
                rows={rowsEgreso}
                emptyMessage="No hay tipos de egreso registrados."
              />
            </div>
          </section>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Registrar nuevo tipo de ${modalType}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            id="nombre"
            name="nombre"
            label="Nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
            autoFocus
          />
          <Input
            id="descripcion"
            name="descripcion"
            label="Descripción (opcional)"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          />

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.nombre.trim()}
              className={!formData.nombre.trim() ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={resultModal.open} 
        onClose={() => setResultModal(prev => ({ ...prev, open: false }))} 
        title={resultModal.type === 'success' ? "Registro Exitoso" : "Error de Operación"} 
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

      <Modal
        isOpen={!!editingTipo}
        onClose={() => setEditingTipo(null)}
        title={`Editar tipo de ${editingTipo?.type === 'ingreso' ? 'Ingreso' : 'Egreso'}`}
      >
        {editingTipo && (
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            <Input
              id="edit-nombre"
              name="nombre"
              label="Nombre"
              value={editingTipo.nombre}
              onChange={(e) => setEditingTipo({ ...editingTipo, nombre: e.target.value })}
              required
              autoFocus
            />
            <Input
              id="edit-descripcion"
              name="descripcion"
              label="Descripción (opcional)"
              value={editingTipo.descripcion || ''}
              onChange={(e) => setEditingTipo({ ...editingTipo, descripcion: e.target.value })}
            />

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingTipo(null)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !editingTipo.nombre.trim()}
                className={!editingTipo.nombre.trim() ? "opacity-50 cursor-not-allowed" : ""}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!deletingTipo}
        onClose={() => setDeletingTipo(null)}
        title={`Confirmar eliminación`}
        width="max-w-md"
      >
        {deletingTipo && (
          <div className="space-y-4 mt-4">
            <p className="text-sm text-slate-600">
              ¿Está seguro de que desea eliminar la categoría de {deletingTipo.type === 'ingreso' ? 'ingreso' : 'egreso'} <strong>"{deletingTipo.nombre}"</strong>?
            </p>
            <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">
              Esta acción no se puede deshacer y removerá la categoría de forma permanente.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDeletingTipo(null)}>
                Cancelar
              </Button>
              <Button 
                type="button" 
                variant="danger"
                disabled={isSubmitting}
                onClick={handleDeleteConfirm}
              >
                {isSubmitting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <LoadingOverlay open={loadingModal.open} text={loadingModal.text} />
    </div>
  );
};
