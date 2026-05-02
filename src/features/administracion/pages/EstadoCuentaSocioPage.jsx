import { useEffect, useState } from 'react';
import { CreditCard, FileText } from 'lucide-react';
import { finanzasApi } from '../../finanzas/api';
import { useAuthStore } from '../../../store/authStore';
import { Table } from '../../../components/data-display';
import { Spinner, ExportButtons } from '../../../components/ui';

export const EstadoCuentaSocioPage = () => {
  const { user } = useAuthStore();
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIngresos = async () => {
      if (user?.id) {
        try {
          const data = await finanzasApi.obtenerCuotas(user.id);
          setIngresos(data);
        } catch (error) {
          console.error("Error al cargar estado de cuenta:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchIngresos();
  }, [user]);

  const formatCurrency = (val) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(val);
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const columns = [
    { key: 'fecha', label: 'Fecha de Registro' },
    { key: 'concepto', label: 'Concepto' },
    { key: 'monto_display', label: 'Monto' },
    { key: 'registrador', label: 'Registrado Por' },
    { key: 'estado_display', label: 'Estado' },
  ];

  const rows = ingresos.map(ingreso => ({
    id: ingreso.id,
    fecha: formatDate(ingreso.creacion),
    concepto: ingreso.tipo_ingreso_nombre !== 'Ingreso' ? ingreso.tipo_ingreso_nombre : (ingreso.descripcion || 'Cuota/Ingreso'),
    monto_display: <span className="font-semibold text-emerald-600">{formatCurrency(ingreso.monto)}</span>,
    registrador: (
      <div className="flex flex-col">
        <span className="font-medium text-slate-800">{ingreso.registrado_por_nombre}</span>
      </div>
    ),
    estado_display: (
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
        ingreso.estado === 'pagada' ? 'bg-emerald-100 text-emerald-700' :
        ingreso.estado === 'vencida' ? 'bg-red-100 text-red-700' :
        'bg-orange-100 text-orange-700'
      }`}>
        {ingreso.estado || 'pagada'}
      </span>
    ),
  }));

  const exportData = ingresos.map(i => ({
    Fecha: formatDate(i.creacion),
    Concepto: i.tipo_ingreso_nombre !== 'Ingreso' ? i.tipo_ingreso_nombre : (i.descripcion || 'Cuota/Ingreso'),
    Monto: i.monto,
    'Registrado Por': i.registrado_por_nombre,
    Estado: i.estado || 'pagada'
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Estado de Cuenta</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">Historial completo de tus pagos y aportes registrados.</p>
        </div>
        <ExportButtons 
          data={exportData} 
          filename="estado_de_cuenta" 
          title={`Estado de Cuenta - ${user?.nombre || 'Socio'}`} 
        />
      </header>

      <section className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900">Historial de Ingresos</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Spinner />
            <span className="ml-2 text-sm">Cargando registros...</span>
          </div>
        ) : (
          <Table columns={columns} rows={rows} emptyMessage="No tienes ingresos registrados." />
        )}
      </section>
    </div>
  );
};
