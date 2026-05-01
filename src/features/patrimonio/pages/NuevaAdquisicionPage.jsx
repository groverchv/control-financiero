import { useState } from 'react';
import { FilePlus2, PackageCheck } from 'lucide-react';
import { patrimonioApi } from '../api';
import { useAdquisiciones } from '../hooks';
import { Button, Input, Select, Spinner } from '../../../components/ui';
import { Toast } from '../../../components/feedback';

export const NuevaAdquisicionPage = () => {
  const { adquisiciones, loading, error } = useAdquisiciones();
  const [form, setForm] = useState({
    activoId: '',
    proveedor: '',
    fecha: '',
    costo: '',
    estado: 'registrado',
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
      await patrimonioApi.registrarAdquisicion({
        activoId: form.activoId,
        proveedor: form.proveedor,
        fecha: form.fecha,
        costo: Number(form.costo),
        estado: form.estado,
      });
      setMessage({ type: 'success', text: 'Adquisicion registrada correctamente.' });
      setForm({ activoId: '', proveedor: '', fecha: '', costo: '', estado: 'registrado' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo registrar la adquisicion.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Registro de adquisicion</h1>
        <p className="text-sm text-slate-500">Alta de activos y adquisiciones institucionales.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form className="rounded-md bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2">
            <FilePlus2 className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Nueva adquisicion</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              id="activoId"
              name="activoId"
              label="ID del activo"
              value={form.activoId}
              onChange={handleChange}
              required
            />
            <Input
              id="proveedor"
              name="proveedor"
              label="Proveedor"
              value={form.proveedor}
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
              id="costo"
              name="costo"
              label="Costo"
              type="number"
              value={form.costo}
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
              <option value="registrado">Registrado</option>
              <option value="aprobado">Aprobado</option>
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
            Guardar adquisicion
          </Button>
        </form>

        <div className="rounded-md bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Ultimas adquisiciones</h2>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner size="sm" />
                Cargando adquisiciones...
              </div>
            ) : error ? (
              <Toast title="Error" message={error} variant="error" />
            ) : adquisiciones.length === 0 ? (
              <p className="text-sm text-slate-500">No hay adquisiciones registradas.</p>
            ) : (
              adquisiciones.slice(0, 4).map((adquisicion) => (
                <div key={adquisicion.id} className="rounded-md border border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{adquisicion.activoId}</p>
                  <p className="text-xs text-slate-500">{adquisicion.fecha} · {adquisicion.proveedor}</p>
                  <p className="text-sm text-slate-600">{adquisicion.costo}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
