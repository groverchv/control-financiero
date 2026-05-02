import { useState, useEffect } from 'react';
import { Mail, Phone, UserCircle, Upload, FileText, Camera, Save, Loader2, CheckCircle2, Edit3, X, Eye } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { administracionApi } from '../api';
import { Button, Input, Spinner } from '../../../components/ui';
import { supabase } from '../../../services/supabase';

export const PerfilSocioPage = () => {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [success, setSuccess] = useState(false);
  const [archivos, setArchivos] = useState([]);
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    telefono: '',
    profesion: '',
    biografia: ''
  });

  const [initialData, setInitialData] = useState({});

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('miembro')
          .select('nombre, "apellidoPaterno", "apellidoMaterno", telefono, profesion, biografia')
          .eq('id', user.id)
          .single();
        
        if (data) {
          const profileData = {
            nombre: data.nombre || '',
            apellidoPaterno: data.apellidoPaterno || '',
            apellidoMaterno: data.apellidoMaterno || '',
            telefono: data.telefono || '',
            profesion: data.profesion || '',
            biografia: data.biografia || ''
          };
          setFormData(profileData);
          setInitialData(profileData);
        }

        const files = await administracionApi.obtenerArchivosMiembro(user.id);
        setArchivos(files);
      } catch (err) {
        console.error('Error al cargar perfil:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);
    try {
      const updated = await administracionApi.actualizarPerfil(user.id, {
        nombre: formData.nombre,
        "apellidoPaterno": formData.apellidoPaterno,
        "apellidoMaterno": formData.apellidoMaterno,
        telefono: formData.telefono,
        profesion: formData.profesion,
        biografia: formData.biografia
      });

      if (updated) {
        setUser({
          ...user,
          nombre: `${updated.nombre} ${updated.apellidoPaterno || ''} ${updated.apellidoMaterno || ''}`.trim()
        });
        setInitialData(formData);
        setSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      alert('Error al actualizar perfil: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData(initialData);
    setIsEditing(false);
  };

  const handleFileUpload = async (e, tipo) => {
    if (!isEditing) return;
    
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('El archivo es demasiado grande. El límite máximo es de 10MB.');
      return;
    }

    try {
      setLoading(true);
      await administracionApi.subirArchivo(user.id, file, tipo);
      const files = await administracionApi.obtenerArchivosMiembro(user.id);
      setArchivos(files);
    } catch (err) {
      alert('Error al subir archivo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fotoPerfil = archivos.find(a => a.tipo === 'foto')?.url || null;
  const cvFile = archivos.find(a => a.tipo === 'cv')?.url || null;

  if (loading && !isSaving) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Perfil Profesional</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            {isEditing ? 'Modificando información institucional.' : 'Consulta tu identidad digital y documentos.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {success && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 sm:px-4 py-2 rounded-full border border-emerald-100 animate-in zoom-in duration-300">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-bold">Cambios guardados</span>
            </div>
          )}
          
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="rounded-2xl shadow-lg hover:shadow-blue-500/20 transition-all flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Editar Perfil
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center relative overflow-hidden group">
            <div className="relative inline-block">
              <div className="h-32 w-32 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl ring-1 ring-slate-100 transition-transform duration-500">
                {fotoPerfil ? (
                  <div className="group relative">
                    <img 
                      src={fotoPerfil.replace('/upload/', '/upload/w_400,h_400,c_thumb,g_face/')} 
                      alt="Perfil" 
                      className={`h-full w-full object-cover transition-all duration-500 ${!isEditing ? 'group-hover:scale-110 group-hover:blur-[2px]' : ''}`} 
                    />
                    {!isEditing && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button 
                          type="button"
                          onClick={() => setShowImageModal(true)}
                          className="bg-white/90 p-3 rounded-2xl shadow-xl hover:scale-110 transition-transform text-blue-600"
                          title="Ver foto completa"
                        >
                          <Eye className="h-6 w-6" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <UserCircle className="h-16 w-16 text-slate-300" />
                )}
              </div>
              
              {isEditing && (
                <label className="absolute -right-2 -bottom-2 h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-10 animate-in zoom-in duration-300">
                  <Camera className="h-5 w-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'foto')} />
                </label>
              )}
            </div>
            <div className="mt-6">
              <h2 className="text-xl font-bold text-slate-900">{user?.nombre}</h2>
              <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mt-1">
                {formData.profesion || user?.rol}
              </p>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Documentos
            </h3>
            
            <div className="space-y-3">
              <label 
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isEditing 
                    ? 'bg-slate-50 border-slate-100 group hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer' 
                    : 'bg-slate-50/50 border-slate-50 cursor-default'
                }`}
              >
                {isEditing && (
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, 'cv')} />
                )}
                
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-white rounded-lg shadow-sm ${isEditing ? 'group-hover:scale-110 transition-transform' : ''}`}>
                    <FileText className={`h-5 w-5 ${cvFile ? 'text-blue-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Currículum Vitae</p>
                    <p className={`text-[10px] uppercase font-bold tracking-tight ${cvFile ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {cvFile ? 'Documento cargado' : (isEditing ? 'Haga clic para subir' : 'Pendiente')}
                    </p>
                  </div>
                </div>

                {cvFile ? (
                  <div className="flex flex-col gap-1.5 min-w-[90px]">
                    {!isEditing && (
                      <>
                        <button 
                          type="button"
                          onClick={() => setShowPdfModal(true)}
                          className="text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors w-full"
                        >
                          ABRIR
                        </button>
                        <a 
                          href={cvFile.replace('/upload/', '/upload/fl_attachment/')} 
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all w-full text-center"
                        >
                          DESCARGAR
                        </a>
                      </>
                    )}
                    {isEditing && (
                      <div className="flex flex-col items-center gap-1 text-blue-600 animate-pulse">
                        <Upload className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase text-center">Cambiar archivo</span>
                      </div>
                    )}
                  </div>
                ) : isEditing && (
                  <Upload className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                )}
              </label>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-full">
            <form onSubmit={handleUpdateProfile} className="space-y-6 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
                <h3 className="text-lg font-bold text-slate-900">Información Personal</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="Nombre" 
                  value={formData.nombre} 
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                  disabled={!isEditing}
                />
                <Input 
                  label="Teléfono de Contacto" 
                  value={formData.telefono} 
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  icon={<Phone className="h-4 w-4" />}
                  disabled={!isEditing}
                />
                <Input 
                  label="Apellido Paterno" 
                  value={formData.apellidoPaterno} 
                  onChange={(e) => setFormData({...formData, apellidoPaterno: e.target.value})}
                  disabled={!isEditing}
                />
                <Input 
                  label="Apellido Materno" 
                  value={formData.apellidoMaterno} 
                  onChange={(e) => setFormData({...formData, apellidoMaterno: e.target.value})}
                  disabled={!isEditing}
                />
                <div className="md:col-span-2">
                  <Input 
                    label="Profesión / Título" 
                    value={formData.profesion} 
                    onChange={(e) => setFormData({...formData, profesion: e.target.value})}
                    placeholder="Ej: Ingeniero de Sistemas"
                    disabled={!isEditing}
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-slate-700">Resumen Profesional</label>
                  <textarea
                    className="flex w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                    rows={4}
                    value={formData.biografia}
                    onChange={(e) => setFormData({...formData, biografia: e.target.value})}
                    placeholder="Describe tu experiencia y especialidades..."
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-slate-50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Correo Institucional</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{user?.email}</p>
                </div>
                <div className="sm:ml-auto">
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-lg">Solo lectura</span>
                </div>
              </div>

              {isEditing && (
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 mt-auto">
                  <Button type="button" variant="outline" onClick={handleCancelEdit} className="px-6 py-6 rounded-2xl border-slate-200 text-slate-600">
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving} className="px-8 py-6 rounded-2xl shadow-xl shadow-blue-500/20">
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </section>
        </div>
      </div>

      {/* Modal de Imagen Completa */}
      {showImageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setShowImageModal(false)}></div>
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors flex items-center gap-2 font-bold"
            >
              <X className="h-6 w-6" />
              Cerrar
            </button>
            <img 
              src={fotoPerfil} 
              alt="Perfil Completo" 
              className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain border-4 border-white/10"
            />
          </div>
        </div>
      )}

      {/* Modal de PDF */}
      {showPdfModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setShowPdfModal(false)}></div>
          <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-bold text-slate-900 text-sm">Visor de Documentos Institucionales</span>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={cvFile.replace('/upload/', '/upload/fl_attachment/')} 
                  download
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100"
                >
                  <Upload className="h-3 w-3 rotate-180" />
                  Descargar
                </a>
                <button 
                  onClick={() => setShowPdfModal(false)}
                  className="text-slate-500 hover:text-slate-800 transition-colors p-2 hover:bg-slate-100 rounded-xl"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 relative group">
              <iframe 
                src={`${cvFile.replace('/upload/', '/upload/f_auto/')}#toolbar=0`}
                className="w-full h-full border-none bg-white"
                title="Visor PDF"
              ></iframe>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a 
                  href={cvFile} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-slate-900/80 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md flex items-center gap-2 hover:bg-slate-900 transition-all"
                >
                  <Eye className="h-4 w-4" />
                  Abrir en pantalla completa si no carga
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
