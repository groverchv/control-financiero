import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: loginError } = await authApi.login(email, password);

    if (loginError) {
      setError(loginError.message || 'No se pudo iniciar sesion');
      setLoading(false);
      return;
    }

    if (data?.user) {
      const role = data.user.role_from_db || data.user.user_metadata?.rol || 'socio';
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        rol: role,
        created_at: data.user.created_at || '',
      });

      if (role === 'admin') {
        navigate('/admin/miembros');
      } else if (role === 'secretario') {
        navigate('/admin/ingresos');
      } else {
        navigate('/inicio');
      }
    }

    setLoading(false);
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 sm:p-8 shadow-md border border-slate-100">
      <div className="text-center mb-6">
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Acceso institucional</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Inicia sesión</h2>
      </div>

      <div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Correo
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-600">
              <Mail className="h-4 w-4 text-slate-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full border-0 p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="nombre@institucion.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Contrasena
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-600">
              <LockKeyhole className="h-4 w-4 text-slate-400" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full border-0 p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Ingresando...' : 'Ingresar'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          No tienes acceso?{' '}
          <Link className="font-medium text-blue-600 hover:text-blue-700" to="/">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
};
