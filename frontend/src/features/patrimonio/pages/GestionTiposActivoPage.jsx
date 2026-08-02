import { useState, useEffect } from 'react';
import { Tags, Plus, CheckCircle2, AlertCircle, Lock, Edit, Trash2, RefreshCw, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { patrimonioApi } from '../api';
import { Button, Input, Spinner, Modal } from '../../../components/ui';
import { Table } from '../../../components/data-display';
import { Toast, LoadingOverlay } from '../../../components/feedback';

export const GestionTiposActivoPage = () => {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [resultModal, setResultModal] = useState({ open: false, type: 'success', text: '', details: '' });
  const [tiposEnUso, setTiposEnUso] = useState({});
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ open: false, id: null, nombre: '' });
  const [confirmSubmitModal, setConfirmSubmitModal] = useState({ open: false });
  const [loadingModal, setLoadingModal] = useState({ open: false, text: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const isSubmitDisabled = !formData.nombre.trim();

  const fetchTipos = async () => {
    try {
      setLoading(true);
      const data = await patrimonioApi.obtenerTiposActivo();
      setTipos(data);

      // Verificar uso
      const uso = {};
      for (const tipo of data) {
        try { 
          uso[tipo.id] = await patrimonioApi.verificarTipoActivoEnUso(tipo.id); 
        } catch { 
          uso[tipo.id] = false; 
        }
      }
      setTiposEnUso(uso);
      setCurrentPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar tipos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTipos();
  }, []);

  const handleOpenCreate = () => {
    setEditingTipo(null);
    setFormData({ nombre: '', descripcion: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tipo) => {
    setEditingTipo(tipo);
    setFormData({ nombre: tipo.nombre, descripcion: tipo.descripcion || '' });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (tipo) => {
    setConfirmDeleteModal({ open: true, id: tipo.id, nombre: tipo.nombre });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDeleteModal;
    setConfirmDeleteModal({ open: false, id: null, nombre: '' });
    
    // Programmatic Blockade for active category
    if (tiposEnUso[id]) {
      setResultModal({
        open: true,
        type: 'error',
        text: 'Acción Bloqueada',
        details: 'Esta categoría de activo no puede ser eliminada bajo ninguna circunstancia porque está asignada a uno o más activos.'
      });
      return;
    }

    setLoadingModal({ open: true, text: 'Eliminando categoría de activo...' });
    try {
      await patrimonioApi.eliminarTipoActivo(id);
      setLoadingModal({ open: false, text: '' });
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Categoría de activo eliminada!',
        details: 'La categoría patrimonial ha sido removida con éxito del sistema.'
      });
      await fetchTipos();
    } catch (err) {
      console.error(err);
      setLoadingModal({ open: false, text: '' });
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error al eliminar',
        details: err instanceof Error ? err.message : 'No se pudo eliminar la categoría de la base de datos.'
      });
    }
  };

  const handlePreSubmit = (e) => {
    e.preventDefault();
    setConfirmSubmitModal({ open: true });
  };

  const executeSubmit = async () => {
    setConfirmSubmitModal({ open: false });

    setIsSubmitting(true);
    setLoadingModal({
      open: true,
      text: editingTipo ? 'Actualizando categoría...' : 'Creando categoría de activo...'
    });
    try {
      if (editingTipo) {
        await patrimonioApi.actualizarTipoActivo(editingTipo.id, formData);
        setLoadingModal({ open: false, text: '' });
        setResultModal({
          open: true,
          type: 'success',
          text: '¡Categoría de activo actualizada!',
          details: `La categoría patrimonial "${formData.nombre}" ha sido modificada con éxito.`
        });
      } else {
        await patrimonioApi.crearTipoActivo(formData);
        setLoadingModal({ open: false, text: '' });
        setResultModal({
          open: true,
          type: 'success',
          text: '¡Categoría de activo registrada!',
          details: `La nueva categoría patrimonial "${formData.nombre}" ha sido dada de alta con éxito en el sistema.`
        });
      }
      await fetchTipos();
      setIsModalOpen(false);
      setFormData({ nombre: '', descripcion: '' });
      setEditingTipo(null);
    } catch (err) {
      console.error(err);
      setLoadingModal({ open: false, text: '' });
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error al guardar categoría',
        details: err instanceof Error ? err.message : 'Error desconocido de conexión o base de datos.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'estado_uso', label: 'Estado' },
    { key: 'acciones', label: 'Acciones' },
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
            onClick={() => handleOpenEdit(tipo)}
            className="text-amber-600 border-amber-200 hover:bg-amber-50 flex items-center gap-1 h-7 font-bold"
            title="Editar"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Editar</span>
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => handleDeleteClick(tipo)}
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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tipos de Activos</h1>
          <p className="text-sm text-slate-500">Administra las categorias maestras de los activos. Los tipos en uso no pueden ser modificados ni eliminados.</p>
        </div>
        <Button type="button" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" />
          Nuevo Tipo
        </Button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Tags className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-slate-900 truncate">{tipos.length}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Total Categorías</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Lock className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-amber-600 truncate">{Object.values(tiposEnUso).filter(Boolean).length}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">En Uso</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-emerald-600 truncate">{tipos.length - Object.values(tiposEnUso).filter(Boolean).length}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Disponibles</p>
          </div>
        </div>
      </div>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Listado de Tipos</h2>
          </div>
          <button
            type="button"
            onClick={fetchTipos}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
            title="Refrescar listado"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner size="sm" />
            Cargando tipos...
          </div>
        ) : error ? (
          <Toast title="Error" message={error} variant="error" />
        ) : (
          <>
            <Table 
              columns={columns} 
              rows={rows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)} 
              emptyMessage="No hay tipos de activos registrados." 
            />
            {Math.ceil(rows.length / ITEMS_PER_PAGE) > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 mt-4 gap-4">
                <p className="text-[10px] sm:text-xs text-slate-500">
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, rows.length)} de {rows.length} categorías
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    className="h-8 px-2 text-[10px] sm:text-xs"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1 mx-1">
                    {Array.from({ length: Math.ceil(rows.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'primary' : 'outline'}
                        className={`h-7 w-7 sm:h-8 sm:w-8 p-0 text-[10px] sm:text-xs ${currentPage === page ? 'bg-blue-600 text-white' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="h-8 px-2 text-[10px] sm:text-xs"
                    disabled={currentPage === Math.ceil(rows.length / ITEMS_PER_PAGE)}
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(rows.length / ITEMS_PER_PAGE), p + 1))}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingTipo(null);
        }} 
        title={editingTipo ? 'Editar Tipo de Activo' : 'Nuevo Tipo de Activo'}
      >
        <form onSubmit={handlePreSubmit} className="space-y-4">
          <Input 
            label="Nombre del Tipo" 
            value={formData.nombre} 
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
            required 
            placeholder="Ej: Vehículos, Mobiliario..."
          />
          <Input 
            label="Descripción (Opcional)" 
            value={formData.descripcion} 
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} 
            placeholder="Breve detalle del tipo de activo"
          />
          
          <div className="mt-6 flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsModalOpen(false);
                setEditingTipo(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isSubmitDisabled}
              className={isSubmitDisabled ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isSubmitting ? 'Guardando...' : editingTipo ? 'Guardar Cambios' : 'Guardar Tipo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal General de Confirmación de Eliminación */}
      <Modal
        isOpen={confirmDeleteModal.open}
        onClose={() => setConfirmDeleteModal({ open: false, id: null, nombre: '' })}
        title={
          <div className="flex items-center gap-2.5 text-red-600">
            <AlertCircle className="h-5.5 w-5.5 stroke-[2.5]" />
            <span>Eliminar Categoría de Activo</span>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg text-red-800 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <span>
                ¿Estás seguro de que deseas eliminar la categoría <strong>"{confirmDeleteModal.nombre}"</strong>?
                Esta acción no se puede deshacer y removerá la categoría de la base de datos de manera definitiva.
              </span>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteModal({ open: false, id: null, nombre: '' })}
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="danger"
            >
              Sí, eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmación de Creación/Edición */}
      <Modal
        isOpen={confirmSubmitModal.open}
        onClose={() => setConfirmSubmitModal({ open: false })}
        title={
          <div className="flex items-center gap-2.5 text-emerald-600">
            <Info className="h-5.5 w-5.5 stroke-[2.5]" />
            <span>Confirmar Acción</span>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-sm">
            <Info className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <span>
                ¿Estás seguro de que deseas <strong>{editingTipo ? 'actualizar' : 'registrar'}</strong> esta categoría de activo en el sistema?
              </span>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setConfirmSubmitModal({ open: false })}
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={executeSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
            >
              Sí, continuar
            </Button>
          </div>
        </div>
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

      <LoadingOverlay open={loadingModal.open} text={loadingModal.text} />
    </div>
  );
};
