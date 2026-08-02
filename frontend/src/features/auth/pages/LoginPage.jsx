import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Mail, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui';
import { toast } from 'react-toastify';
import { translateAuthError } from '../../../utils/errorHandler';
import { supabase } from '../../../services/supabase';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // HIGH-02: Rate limiting state
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);

  useEffect(() => {
    if (!lockoutUntil) return;

    const timeLeft = lockoutUntil - Date.now();
    if (timeLeft <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLockoutUntil(null);
      setLoginAttempts(0);
      return;
    }

    const timer = setTimeout(() => {
      setLockoutUntil(null);
      setLoginAttempts(0);
    }, timeLeft);

    return () => clearTimeout(timer);
  }, [lockoutUntil]);

  useEffect(() => {
    const msg = searchParams.get('msg');
    if (msg === 'sesion_expirada') {
      toast.warning('Tu sesión ha expirado por inactividad. Por favor, inicia sesión de nuevo.', {
        toastId: 'session_expired_toast'
      });
    } else if (msg === 'cuenta_deshabilitada') {
      toast.error('Tu cuenta ha sido deshabilitada. Contacta al administrador.', {
        toastId: 'account_disabled_toast'
      });
    } else if (msg === 'contrasena_actualizada') {
      toast.success('¡Contraseña actualizada exitosamente! Inicia sesión con tu nueva contraseña.', {
        toastId: 'password_updated_toast'
      });
    }
  }, [searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Demasiados intentos. Por favor, intenta de nuevo en ${remainingSeconds} segundos.`);
      return;
    }

    setLoading(true);

    let resolvedEmail = email.trim();

    if (!resolvedEmail.includes('@')) {
      try {
        const { data: memberData, error: dbError } = await supabase
          .from('miembro')
          .select('correoElectronico')
          .eq('ci', resolvedEmail)
          .maybeSingle();

        if (dbError) throw dbError;

        if (memberData && memberData.correoElectronico) {
          resolvedEmail = memberData.correoElectronico;
        } else {
          setError('No se encontró ningún miembro con el Carnet de Identidad ingresado.');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error resolviendo CI a correo:', err);
        setError('Ocurrió un error al verificar su Carnet de Identidad.');
        setLoading(false);
        return;
      }
    }

    const { data, error: loginError } = await authApi.login(resolvedEmail, password);

    if (loginError) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      if (newAttempts >= 5) {
        setLockoutUntil(Date.now() + 60 * 1000); // 60 segundos de bloqueo
        setError('Cuenta temporalmente bloqueada por múltiples intentos fallidos. Espera 60 segundos.');
      } else {
        setError(translateAuthError(loginError.message) || 'No se pudo iniciar sesión.');
      }
      
      setLoading(false);
      return;
    }

    // Reset attempts on successful login
    setLoginAttempts(0);
    setLockoutUntil(null);

    if (data?.user) {
      const role = data.user.role_from_db || data.user.user_metadata?.rol || 'socio';
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        rol: role,
        created_at: data.user.created_at || '',
      });

      if (role === 'admin') {
        navigate('/admin/kpis');
      } else if (role === 'secretario') {
        navigate('/admin/ingresos');
      } else {
        navigate('/socio/portal');
      }
    }

    setLoading(false);
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 sm:p-8 shadow-md border border-slate-100">
      <div className="text-center mb-6">
        <img src="/logo-ap.png" alt="Logo AP" className="mx-auto h-16 w-auto object-contain mb-4" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asociación de Profesionales Financieros</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Inicia sesión</h2>
      </div>

      <div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Correo electrónico
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-600">
              <Mail className="h-4 w-4 text-slate-400" />
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
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
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="w-full border-0 p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            disabled={loading || lockoutUntil !== null}
            isLoading={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Ingresar'}
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
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
