import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Input, Modal } from '../../../components/ui';

/**
 * Modal de formulario para crear/editar miembros.
 * Extraído de GestionMiembrosPage.jsx para mejorar mantenibilidad.
 */
export const MiembroFormModal = ({
  isOpen,
  onClose,
  editingMember,
  formData,
  setFormData,
  emailError,
  checkEmailUniqueness,
  isFormUnchanged,
  isSubmitting,
  isOnline,
  onSubmit
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const passwordsMismatch = (formData.password || formData.confirmPassword) && formData.password !== formData.confirmPassword;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingMember ? 'Editar miembro' : 'Registrar nuevo miembro'}
      id="miembro-form-modal"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Sección de Datos Personales */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Datos Personales</h3>
          
          <Input 
            label="Nombres" 
            placeholder="Ej: Juan Antonio"
            value={formData.nombre} 
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
            required 
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Apellido Paterno" 
              placeholder="Ej: Pérez"
              value={formData.apellidoPaterno || ''} 
              onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })} 
            />
            <Input 
              label="Apellido Materno" 
              placeholder="Ej: Flores"
              value={formData.apellidoMaterno || ''} 
              onChange={(e) => setFormData({ ...formData, apellidoMaterno: e.target.value })} 
            />
          </div>
        </div>

        {/* Sección de Contacto */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Información de Contacto</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Correo Electrónico" 
              type="email"
              placeholder="Ej: juan.perez@correo.com"
              value={formData.email} 
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, email: val });
                checkEmailUniqueness(val);
              }} 
              error={emailError}
              required 
            />
            <Input 
              label="Teléfono" 
              placeholder="Ej: 71234567"
              value={formData.telefono} 
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
            />
          </div>
        </div>
        
        {/* Sección de Credenciales */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {editingMember ? 'Actualizar Credenciales (Dejar en blanco para mantener la actual)' : 'Credenciales de Acceso'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Input 
                label="Contraseña" 
                type={showPassword ? 'text' : 'password'}
                value={formData.password} 
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                required={!editingMember} 
                placeholder={editingMember ? 'Dejar en blanco para mantener la actual' : 'Mínimo 8 caracteres'}
                autoComplete="new-password"
                error={passwordsMismatch ? ' ' : ''}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input 
              label="Confirmar Contraseña" 
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword} 
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} 
              required={!editingMember}
              placeholder={editingMember ? 'Dejar en blanco para mantener la actual' : 'Mínimo 8 caracteres'}
              autoComplete="new-password"
              error={passwordsMismatch ? 'Las contraseñas no coinciden' : ''}
            />
          </div>
        </div>

        {/* Sección de Configuración Administrativa */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-bold text-slate-500">Configuración del Sistema</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Rol</label>
              <select
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
              >
                <option value="socio">Socio</option>
                <option value="secretario">Secretario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Estado</label>
              <select
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Monto Inscripción (Bs.)</label>
              <input
                type="number"
                min="0"
                placeholder="Ej: 150"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200"
                value={formData.monto_inscripcion}
                onChange={(e) => setFormData({ ...formData, monto_inscripcion: e.target.value })}
                disabled={!!editingMember}
              />
              {!!editingMember && (
                <p className="text-[10px] text-slate-400 mt-0.5 leading-none">No editable post-registro</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || isFormUnchanged}
            className={`${isFormUnchanged ? "opacity-50 cursor-not-allowed" : ""} ${!isOnline ? "bg-amber-500 hover:bg-amber-600 border-amber-600 text-white" : ""}`}
          >
            {isSubmitting ? 'Guardando...' : !isOnline ? '💾 Guardar localmente (Offline)' : editingMember ? 'Actualizar' : 'Guardar Miembro'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
