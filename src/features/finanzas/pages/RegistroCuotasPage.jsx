import { useState } from 'react';
import { CreditCard, Plus, Search } from 'lucide-react';
import { finanzasApi } from '../api';
import { usePagos } from '../hooks';
import { Button, Input, Select, Spinner } from '../../../components/ui';
import { Toast } from '../../../components/feedback';

export const RegistroCuotasPage = () => {
  const { cuotas, loading, error } = usePagos();
  const [form, setForm] = useState({
    miembroId: '',
    monto: '',
    moneda: 'BS',
    fecha: '',
    estado: 'pagada',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      await finanzasApi.registrarPago({
        miembroId: form.miembroId,
        monto: Number(form.monto),
        moneda: form.moneda,
        fecha: form.fecha,
        estado: form.estado,
      });
      setMessage({ type: 'success', text: 'Cuota registrada correctamente.' });
      setForm({ miembroId: '', monto: '', moneda: 'BS', fecha: '', estado: 'pagada' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo registrar la cuota.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registro de cuotas y donaciones</h1>
          <p className="text-sm text-slate-500">Controla los ingresos recurrentes de la institucion.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <CreditCard className="h-4 w-4" />
          {cuotas.length} cuotas registradas
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form className="rounded-md bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Nueva cuota</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              id="miembroId"
              name="miembroId"
              label="ID del miembro"
              value={form.miembroId}
              onChange={handleChange}
              placeholder="M-1020"
              required
            />
            <Input
              id="monto"
              name="monto"
              label="Monto"
              type="number"
              value={form.monto}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
            <Select
              id="moneda"
              name="moneda"
              label="Moneda"
              value={form.moneda}
              onChange={handleChange}
            >
              <option value="BS">BS</option>
              <option value="USD">USD</option>
            </Select>
            <Input
              id="fecha"
              name="fecha"
              label="Fecha"
              type="date"
              value={form.fecha}
              onChange={handleChange}
              required
            />
            <Select
              id="estado"
              name="estado"
              label="Estado"
              value={form.estado}
              onChange={handleChange}
            >
              <option value="pagada">Pagada</option>
              <option value="pendiente">Pendiente</option>
              <option value="vencida">Vencida</option>
            </Select>
          </div>
          {message ? (
            <Toast
              title={message.type === 'error' ? 'Error' : 'Exito'}
              message={message.text}
              variant={message.type === 'error' ? 'error' : 'success'}
            />
          ) : null}
          <Button type="submit" disabled={submitting} className="mt-5">
            Guardar cuota
          </Button>
        </form>

        <div className="rounded-md bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">Ultimos registros</h2>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500">
              <Search className="h-4 w-4" />
              Buscar
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner size="sm" />
                Cargando cuotas...
              </div>
            ) : error ? (
              <Toast title="Error" message={error} variant="error" />
            ) : cuotas.length === 0 ? (
              <p className="text-sm text-slate-500">Sin registros disponibles.</p>
            ) : (
              cuotas.slice(0, 4).map((cuota) => (
                <div key={cuota.id} className="rounded-md border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{cuota.miembroId}</p>
                    <span className="text-sm text-slate-600">{cuota.moneda} {cuota.monto}</span>
                  </div>
                  <p className="text-xs text-slate-500">{cuota.fecha} · {cuota.estado}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
