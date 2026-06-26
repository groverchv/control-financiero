import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Send, CheckCircle, Clock } from 'lucide-react';
import { authApi } from '../api/authApi';
import { Button } from '../../../components/ui';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Solicitar el enlace de restablecimiento a Supabase Auth
      // Supabase envía automáticamente un email con el enlace de recuperación
      const { error: resetError } = await authApi.resetPassword(email);

      if (resetError) {
        console.warn('[ForgotPassword] Supabase reset error:', resetError.message);
        // Mostrar error si es por límite de peticiones (Rate Limit - 429)
        if (resetError.status === 429 || resetError.message.includes('rate limit') || resetError.message.includes('too many requests')) {
          setError('Has excedido el límite de solicitudes. Por favor, espera unos minutos antes de intentar nuevamente.');
          setLoading(false);
          return;
        }
      }

      // Siempre mostrar éxito (no revelar si el correo existe)
      setSent(true);
    } catch (err) {
      console.error('[ForgotPassword] Error:', err);
      setError('Ocurrió un error al procesar tu solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 sm:p-8 shadow-md border border-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">¡Correo enviado!</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Si el correo <strong className="text-slate-700">{email}</strong> está registrado en nuestro sistema, 
            recibirás un enlace para restablecer tu contraseña en los próximos minutos.
          </p>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-6">
            <p className="text-xs text-amber-700 font-medium flex items-center justify-center gap-1.5">
              <Clock className="h-4 w-4" />
              El enlace expira en 1 hora. Revisa también tu carpeta de spam.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 sm:p-8 shadow-md border border-slate-100">
      <div className="text-center mb-6">
        <img src="/logo-ap.png" alt="Logo AP" className="mx-auto h-16 w-auto object-contain mb-4" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asociación de Profesionales Financieros</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Recuperar contraseña</h2>
        <p className="mt-2 text-sm text-slate-500">
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="reset-email">
            Correo electrónico
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-600">
            <Mail className="h-4 w-4 text-slate-400" />
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full border-0 p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="nombre@institucion.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Recordaste tu contraseña?{' '}
        <Link className="font-medium text-blue-600 hover:text-blue-700" to="/login">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
};
