import { useState, useEffect } from 'react';
import { Tags, PlusCircle, Trash2, Edit, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { useTiposActividad } from '../hooks';
import { Button, Input, Spinner, Modal, ExportButtons } from '../../../components/ui';
import { Toast } from '../../../components/feedback';
import { Table } from '../../../components/data-display';
import { academicoApi } from '../api';

export const GestionTiposActividadPage = () => {
  const { tipos, loading, error, setTipos } = useTiposActividad();
  const [message, setMessage] = useState(null);
  const [tiposEnUso, setTiposEnUso] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });

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
    setMessage(null);

    try {
      if (editingTipo) {
        const actualizado = await academicoApi.actualizarTipoActividad(editingTipo.id, formData);
        setTipos(tipos.map(t => t.id === editingTipo.id ? actualizado : t));
        setResultModal({
          open: true,
          type: 'success',
          text: '¡Categoría actualizada con éxito!',
          details: `La categoría de actividad académica "${formData.nombre}" ha sido modificada correctamente.`
        });
      } else {
        const nuevo = await academicoApi.crearTipoActividad(formData);
        setTipos([nuevo, ...tipos]);
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

  const handleDelete = async (id) => {
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
    if (!window.confirm('¿Estás seguro de eliminar este tipo de actividad?')) return;
    try {
      await academicoApi.eliminarTipoActividad(id);
      setTipos(tipos.filter(t => t.id !== id));
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Categoría eliminada!',
        details: 'El tipo de actividad ha sido removido con éxito de la base de datos.'
      });
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: 'error',
        text: 'No se pudo eliminar',
        details: err instanceof Error ? err.message : 'No se pudo eliminar la categoría debido a dependencias con actividades existentes.'
      });
    }
  };

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'acciones', label: 'Acciones' }
  ];

  const rows = tipos.map(tipo => ({
    ...tipo,
    acciones: (
      <div className="flex gap-2 items-center">
        {tiposEnUso[tipo.id] ? (
          <>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100" title="Esta categoría está en uso por actividades existentes">
              <Lock className="h-3 w-3" /> En uso
            </span>
          </>
        ) : (
          <>
            <button onClick={() => openEditModal(tipo)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Editar">
              <Edit className="h-4 w-4" />
            </button>
            <button onClick={() => handleDelete(tipo.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Eliminar">
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    )
  }));

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

      {message && (
        <Toast
          title={message.type === 'error' ? 'Error' : 'Éxito'}
          message={message.text}
          variant={message.type === 'error' ? 'error' : 'success'}
        />
      )}

      <section className="rounded-md bg-white p-4 sm:p-6 shadow-sm overflow-hidden text-sm sm:text-base">
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
    </div>
  );
};
