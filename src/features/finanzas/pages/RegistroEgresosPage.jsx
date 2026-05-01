import { useState } from 'react';
import { ArrowDownCircle, ClipboardList } from 'lucide-react';
import { finanzasApi } from '../api';
import { useEgresos } from '../hooks';
import { Button, Input, Spinner } from '../../../components/ui';
import { Toast } from '../../../components/feedback';

export const RegistroEgresosPage = () => {
  const { egresos, loading, error } = useEgresos();
  const [form, setForm] = useState({
    concepto: '',
    monto: '',
    fecha: '',
    categoria: '',
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
      await finanzasApi.registrarEgreso({
        concepto: form.concepto,
        monto: Number(form.monto),
        fecha: form.fecha,
        categoria: form.categoria,
      });
      setMessage({ type: 'success', text: 'Egreso registrado correctamente.' });
      setForm({ concepto: '', monto: '', fecha: '', categoria: '' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo registrar el egreso.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Registro de egresos</h1>
        <p className="text-sm text-slate-500">Controla los egresos operativos de la institucion.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form className="rounded-md bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Nuevo egreso</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              id="concepto"
              name="concepto"
              label="Concepto"
              value={form.concepto}
              onChange={handleChange}
              placeholder="Mantenimiento, servicios, etc."
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
              id="categoria"
              name="categoria"
              label="Categoria"
              value={form.categoria}
              onChange={handleChange}
              placeholder="Operativo, infraestructura"
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
            Registrar egreso
          </Button>
        </form>

        <div className="rounded-md bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Egresos recientes</h2>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner size="sm" />
                Cargando egresos...
              </div>
            ) : error ? (
              <Toast title="Error" message={error} variant="error" />
            ) : egresos.length === 0 ? (
              <p className="text-sm text-slate-500">No hay egresos registrados.</p>
            ) : (
              egresos.slice(0, 4).map((egreso) => (
                <div key={egreso.id} className="rounded-md border border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{egreso.concepto}</p>
                  <p className="text-xs text-slate-500">{egreso.fecha} · {egreso.categoria}</p>
                  <p className="text-sm text-slate-600">{egreso.monto}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
