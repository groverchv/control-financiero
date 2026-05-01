import { useState } from 'react';
import { ArrowUpCircle, BadgeDollarSign } from 'lucide-react';
import { finanzasApi } from '../api';
import { useIngresosExtras } from '../hooks';
import { Button, Input, Spinner } from '../../../components/ui';
import { Toast } from '../../../components/feedback';

export const IngresoExtraPage = () => {
  const { ingresos, loading, error } = useIngresosExtras();
  const [form, setForm] = useState({
    concepto: '',
    monto: '',
    fecha: '',
    metodo: '',
  });
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      await finanzasApi.registrarIngresoExtra({
        concepto: form.concepto,
        monto: Number(form.monto),
        fecha: form.fecha,
        metodo: form.metodo,
      });
      setMessage({ type: 'success', text: 'Ingreso registrado correctamente.' });
      setForm({ concepto: '', monto: '', fecha: '', metodo: '' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo registrar el ingreso.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Ingreso extraordinario</h1>
        <p className="text-sm text-slate-500">Registra ingresos no recurrentes de la institucion.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form className="rounded-md bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Nuevo ingreso</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              id="concepto"
              name="concepto"
              label="Concepto"
              value={form.concepto}
              onChange={handleChange}
              placeholder="Donacion, aporte, patrocinio"
              required
            />
            <Input
              id="monto"
              name="monto"
              label="Monto"
              type="number"
              value={form.monto}
              onChange={handleChange}
              required
            />
            <Input
              id="fecha"
              name="fecha"
              label="Fecha"
              type="date"
              value={form.fecha}
              onChange={handleChange}
              required
            />
            <Input
              id="metodo"
              name="metodo"
              label="Metodo"
              value={form.metodo}
              onChange={handleChange}
              placeholder="Transferencia, efectivo"
              required
            />
          </div>
          {message ? (
            <Toast
              title={message.type === 'error' ? 'Error' : 'Exito'}
              message={message.text}
              variant={message.type === 'error' ? 'error' : 'success'}
            />
          ) : null}
          <Button type="submit" disabled={submitting} className="mt-5">
            Registrar ingreso
          </Button>
        </form>

        <div className="rounded-md bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <BadgeDollarSign className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Ultimos ingresos</h2>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner size="sm" />
                Cargando ingresos...
              </div>
            ) : error ? (
              <Toast title="Error" message={error} variant="error" />
            ) : ingresos.length === 0 ? (
              <p className="text-sm text-slate-500">No hay ingresos registrados.</p>
            ) : (
              ingresos.slice(0, 4).map((ingreso) => (
                <div key={ingreso.id} className="rounded-md border border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{ingreso.concepto}</p>
                  <p className="text-xs text-slate-500">{ingreso.fecha} · {ingreso.metodo}</p>
                  <p className="text-sm text-slate-600">{ingreso.monto}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
