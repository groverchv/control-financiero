import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, ShieldCheck, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { Button } from '../../../components/ui';

import { translateAuthError } from '../../../utils/errorHandler';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Escuchar el evento PASSWORD_RECOVERY de Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
          setCheckingSession(false);
        }
      }
    );

    // Si ya hay una sesión activa (el usuario abrió el enlace), verificar
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Si hay sesión, puede ser un recovery — lo habilitamos
        setIsRecoveryMode(true);
      }
      setCheckingSession(false);
    };

    // Dar un breve delay para que onAuthStateChange procese el token de la URL
    const timer = setTimeout(checkSession, 1500);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Validaciones
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(translateAuthError(updateError.message) || 'Error al actualizar la contraseña.');
        setLoading(false);
        return;
      }

      // Cerrar sesión para forzar re-login con la nueva contraseña
      await supabase.auth.signOut();

      navigate('/login?msg=contrasena_actualizada');
    } catch (err) {
      console.error('[ResetPassword] Error:', err);
      setError('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Estado de carga mientras verificamos la sesión
  if (checkingSession) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 sm:p-8 shadow-md border border-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 mb-4" />
          <p className="text-sm text-slate-500 font-medium">Verificando enlace de recuperación...</p>
        </div>
      </div>
    );
  }

  // Si no hay sesión de recuperación válida
  if (!isRecoveryMode) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 sm:p-8 shadow-md border border-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 mb-4">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Enlace inválido o expirado</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Este enlace de recuperación de contraseña ha expirado o no es válido.
            Por favor, solicita uno nuevo.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700"
            >
              Solicitar nuevo enlace
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Formulario de nueva contraseña
  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 sm:p-8 shadow-md border border-slate-100">
      <div className="text-center mb-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 mb-4">
          <ShieldCheck className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Nueva contraseña</h2>
        <p className="mt-2 text-sm text-slate-500">
          Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="new-password">
            Nueva contraseña
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-600">
            <LockKeyhole className="h-4 w-4 text-slate-400" />
            <input
              id="new-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full border-0 p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          {password.length > 0 && password.length < 8 && (
            <p className="mt-1 text-xs text-amber-600 font-medium">
              Faltan {8 - password.length} caracteres más
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="confirm-password">
            Confirmar contraseña
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-600">
            <LockKeyhole className="h-4 w-4 text-slate-400" />
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full border-0 p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Repite tu nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="mt-1 text-xs text-red-600 font-medium">
              Las contraseñas no coinciden
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || password.length < 8 || password !== confirmPassword}
          className="w-full"
        >
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          <ShieldCheck className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};
