import { Mail, Phone, UserCircle } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

export const PerfilSocioPage = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Perfil profesional</h1>
        <p className="text-sm text-slate-500">Actualiza tu informacion personal y profesional.</p>
      </header>

      <section className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <UserCircle className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">{user?.email || 'Usuario'}</p>
            <p className="text-sm text-slate-500">Rol: {user?.rol || 'socio'}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700">Contacto</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{user?.email || 'correo@institucion.edu'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>+591 70000000</span>
              </div>
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700">Perfil</p>
            <p className="mt-3 text-sm text-slate-500">
              Completa la informacion de tu cargo, area y experiencia profesional.
            </p>
            <button className="mt-4 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" type="button">
              Editar perfil
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
