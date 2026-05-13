import { useState, useMemo } from 'react';
import { FileBarChart2, Filter, Calendar, Search, Download, ChevronRight, Tags, ArrowRight } from 'lucide-react';
import { useReportesFinancieros, usePagos, useEgresos } from '../hooks';
import { Spinner, Button, Input, Select } from '../../../components/ui';
import { Toast } from '../../../components/feedback';
import { ExportButtons } from '../../../components/ui/ExportButtons';

export const ReportesFinancierosPage = () => {
  const { cuotas, loading: loadingIn } = usePagos();
  const { egresos, loading: loadingOut } = useEgresos();
  
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [filters, setFilters] = useState({
    fechaStart: '',
    fechaEnd: '',
    year: new Date().getFullYear().toString(),
    month: '',
    periodoTipo: 'mes', // mes, bimestre, trimestre, semestre, año
    tipoTransaccion: 'todos', // todos, ingresos, egresos
  });

  const toggleAttribute = (attr) => {
    setSelectedAttributes(prev => 
      prev.includes(attr) ? prev.filter(a => a !== attr) : [...prev, attr]
    );
  };

  const consolidatedData = useMemo(() => {
    const data = [
      ...cuotas.map(c => ({ ...c, tipo: 'Ingreso', montoEfectivo: c.monto, fechaDate: new Date(c.fecha) })),
      ...egresos.map(e => ({ ...e, tipo: 'Egreso', montoEfectivo: e.monto, fechaDate: new Date(e.fecha) }))
    ];

    return data.filter(item => {
      let pass = true;
      
      if (selectedAttributes.includes('fecha')) {
        if (filters.periodoTipo === 'rango' && filters.fechaStart && filters.fechaEnd) {
          const start = new Date(filters.fechaStart);
          const end = new Date(filters.fechaEnd);
          pass = pass && item.fechaDate >= start && item.fechaDate <= end;
        }
        if (filters.periodoTipo === 'año' && filters.year) {
          pass = pass && item.fechaDate.getFullYear().toString() === filters.year;
        }
        if (filters.periodoTipo === 'mes' && filters.month) {
          pass = pass && (item.fechaDate.getMonth() + 1).toString() === filters.month && item.fechaDate.getFullYear().toString() === filters.year;
        }
      }

      if (selectedAttributes.includes('tipo') && filters.tipoTransaccion !== 'todos') {
        pass = pass && item.tipo.toLowerCase() === (filters.tipoTransaccion === 'ingresos' ? 'ingreso' : 'egreso');
      }

      return pass;
    });
  }, [cuotas, egresos, selectedAttributes, filters]);

  const stats = useMemo(() => {
    const ingresos = consolidatedData.filter(d => d.tipo === 'Ingreso').reduce((sum, d) => sum + Number(d.montoEfectivo), 0);
    const egresos = consolidatedData.filter(d => d.tipo === 'Egreso').reduce((sum, d) => sum + Number(d.montoEfectivo), 0);
    return { ingresos, egresos, saldo: ingresos - egresos };
  }, [consolidatedData]);

  if (loadingIn || loadingOut) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Generador de Reportes Avanzados</h1>
          <p className="text-sm text-slate-500">Configura y exporta reportes financieros personalizados.</p>
        </div>
        <ExportButtons 
          data={consolidatedData.map(d => ({
            Fecha: new Date(d.fecha).toLocaleDateString(),
            Tipo: d.tipo,
            Concepto: d.concepto || d.descripcion || 'Sin concepto',
            Monto: d.montoEfectivo
          }))}
          filename="reporte_personalizado"
          title="Reporte Financiero Institucional"
        />
      </header>

      {/* Selector de Atributos */}
      <section className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Tags className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Atributos del Reporte</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'fecha', label: 'Fecha y Periodo', icon: Calendar },
            { id: 'tipo', label: 'Tipo de Transacción', icon: Filter },
            { id: 'monto', label: 'Rangos de Monto', icon: ArrowRight },
          ].map(attr => (
            <button
              key={attr.id}
              onClick={() => toggleAttribute(attr.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all border ${
                selectedAttributes.includes(attr.id)
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
              }`}
            >
              <attr.icon className="h-4 w-4" />
              {attr.label}
            </button>
          ))}
        </div>
      </section>

      {/* Controles de Filtrado Dinámico */}
      {selectedAttributes.length > 0 && (
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {selectedAttributes.includes('fecha') && (
            <div className="rounded-xl bg-slate-50 p-5 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-500 uppercase">Filtro de Tiempo</h3>
              </div>
              <Select 
                value={filters.periodoTipo} 
                onChange={(e) => setFilters({...filters, periodoTipo: e.target.value})}
                options={[
                  { value: 'mes', label: 'Por Mes' },
                  { value: 'año', label: 'Por Año' },
                  { value: 'rango', label: 'Rango de Fechas' },
                  { value: 'trimestre', label: 'Trimestral' },
                  { value: 'semestre', label: 'Semestral' }
                ]}
              />
              
              {filters.periodoTipo === 'mes' && (
                <div className="flex gap-2">
                  <Select 
                    value={filters.month} 
                    onChange={(e) => setFilters({...filters, month: e.target.value})}
                    options={[
                      { value: '', label: 'Cualquier Mes' },
                      { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' },
                      { value: '3', label: 'Marzo' }, { value: '4', label: 'Abril' },
                      { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
                      { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' },
                      { value: '9', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
                      { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
                    ]}
                  />
                  <Input 
                    type="number" 
                    value={filters.year} 
                    onChange={(e) => setFilters({...filters, year: e.target.value})}
                  />
                </div>
              )}

              {filters.periodoTipo === 'rango' && (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={filters.fechaStart} onChange={(e) => setFilters({...filters, fechaStart: e.target.value})} />
                  <Input type="date" value={filters.fechaEnd} onChange={(e) => setFilters({...filters, fechaEnd: e.target.value})} />
                </div>
              )}
            </div>
          )}

          {selectedAttributes.includes('tipo') && (
            <div className="rounded-xl bg-slate-50 p-5 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-500 uppercase">Tipo de Registro</h3>
              </div>
              <div className="flex gap-2">
                {['todos', 'ingresos', 'egresos'].map(t => (
                  <button
                    key={t}
                    onClick={() => setFilters({...filters, tipoTransaccion: t})}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase transition-all ${
                      filters.tipoTransaccion === t
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Resumen de Datos Filtrados */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Ingresos Filtrados</p>
          <p className="text-2xl font-bold text-emerald-600">Bs. {stats.ingresos.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Egresos Filtrados</p>
          <p className="text-2xl font-bold text-red-600">Bs. {stats.egresos.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Saldo del Reporte</p>
          <p className={`text-2xl font-bold ${stats.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            Bs. {stats.saldo.toLocaleString()}
          </p>
        </div>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900 uppercase">Vista previa del reporte</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">{consolidatedData.length} registros seleccionados</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Concepto / Descripción</th>
                <th className="px-4 py-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consolidatedData.slice(0, 15).map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-600">{new Date(item.fecha).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      item.tipo === 'Ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-900 font-medium">{item.concepto || item.descripcion || 'General'}</td>
                  <td className={`px-4 py-3 text-right font-bold ${item.tipo === 'Ingreso' ? 'text-emerald-700' : 'text-red-700'}`}>
                    Bs. {Number(item.montoEfectivo).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {consolidatedData.length > 15 && (
            <p className="text-center text-xs text-slate-400 py-4 italic">Mostrando los primeros 15 registros en vista previa. Use exportar para ver el reporte completo.</p>
          )}
          {consolidatedData.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-slate-400">No hay datos que coincidan con los filtros seleccionados.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

