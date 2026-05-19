import { useState, useEffect } from 'react';
import { Tags, PlusCircle, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { finanzasApi } from '../api';
import { Button, Input, Spinner, Modal } from '../../../components/ui';
import { Toast } from '../../../components/feedback';
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

  const fetchDatos = async () => {
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
  };

  useEffect(() => {
    fetchDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = (type) => {
    setModalType(type);
    setFormData({ nombre: '', descripcion: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (modalType === 'ingreso') {
        const nuevo = await finanzasApi.crearTipoIngreso(formData.nombre, formData.descripcion);
        setTiposIngreso([nuevo, ...tiposIngreso]);
      } else {
        const nuevo = await finanzasApi.crearTipoEgreso(formData.nombre, formData.descripcion);
        setTiposEgreso([nuevo, ...tiposEgreso]);
      }
      setResultModal({
        open: true,
        type: 'success',
        text: `¡Categoría de ${modalType} registrada!`,
        details: `La nueva categoría "${formData.nombre}" ha sido dada de alta correctamente en la base de datos.`
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
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
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'estado_uso', label: 'Estado' },
  ];

  const columnasEgreso = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'estado_uso', label: 'Estado' },
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
          <section className="rounded-md bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-slate-900">Tipos de Ingreso</h2>
              </div>
              <Button type="button" size="sm" onClick={() => openModal('ingreso')}>
                <PlusCircle className="h-4 w-4" />
                Agregar
              </Button>
            </div>
            <Table
              columns={columnasIngreso}
              rows={rowsIngreso}
              emptyMessage="No hay tipos de ingreso registrados."
            />
          </section>

          {/* Tipos de Egreso */}
          <section className="rounded-md bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-rose-600" />
                <h2 className="text-lg font-semibold text-slate-900">Tipos de Egreso</h2>
              </div>
              <Button type="button" size="sm" onClick={() => openModal('egreso')}>
                <PlusCircle className="h-4 w-4" />
                Agregar
              </Button>
            </div>
            <Table
              columns={columnasEgreso}
              rows={rowsEgreso}
              emptyMessage="No hay tipos de egreso registrados."
            />
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
    </div>
  );
};
