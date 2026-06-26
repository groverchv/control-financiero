import { Search, FileText, Mail, User, ExternalLink, Briefcase, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTalentos } from '../hooks';
import { Button, Spinner, Modal } from '../../../components/ui';
import { Toast } from '../../../components/feedback';
import { administracionApi } from '../../administracion/api';

export const BuscadorTalentoPage = () => {
  const [criterio, setCriterio] = useState('');
  const { talentos, loading, error } = useTalentos(criterio);
  const [selectedTalento, setSelectedTalento] = useState(null);
  const [cvUrl, setCvUrl] = useState(null);
  const [loadingCv, setLoadingCv] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleVerDetalles = async (talento) => {
    setSelectedTalento(talento);
    setLoadingCv(true);
    try {
      const url = await administracionApi.obtenerDocumentoMiembro(talento.id);
      setCvUrl(url);
    } catch (err) {
      console.error('Error al obtener CV:', err);
    } finally {
      setLoadingCv(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Directorio de Talento Profesional</h1>
        <p className="text-slate-500 max-w-2xl">
          Encuentre expertos y profesionales dentro de nuestra institución. Busque por nombre, profesión o palabras clave en su resumen profesional.
        </p>
      </header>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Ej: Ingeniero, Auditor, Experto en leyes..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
              value={criterio}
              onChange={(e) => setCriterio(e.target.value)}
            />
          </div>
          <Button className="px-10 py-4 rounded-2xl shadow-xl shadow-blue-500/20">
            Buscar Expertos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 text-blue-600">
            <Spinner size="lg" />
            <p className="font-bold animate-pulse uppercase tracking-widest text-xs">Escaneando perfiles...</p>
          </div>
        ) : error ? (
          <div className="col-span-full">
            <Toast title="Error de sistema" message={error} variant="error" />
          </div>
        ) : talentos.length === 0 ? (
          criterio && (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
              <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">No se encontraron profesionales con ese criterio.</p>
            </div>
          )
        ) : (
          talentos.map((talento) => (
            <div 
              key={talento.id} 
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 overflow-hidden group-hover:scale-110 transition-transform">
                  {talento.foto ? (
                    <img src={talento.foto} alt={talento.nombre} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-7 w-7" />
                  )}
                </div>
                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-full">
                  Activo
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">{talento.nombre}</h3>
              <p className="text-blue-600 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Briefcase className="h-3 w-3" />
                {talento.especialidad}
              </p>

              {talento.resumen && (
                <p className="text-slate-600 text-sm line-clamp-3 mb-6 flex-1 italic">
                  "{talento.resumen}"
                </p>
              )}

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                  <Mail className="h-4 w-4" />
                  {talento.email}
                </div>
                <Button 
                  onClick={() => handleVerDetalles(talento)}
                  variant="outline" 
                  className="w-full rounded-xl py-2 flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all"
                >
                  <FileText className="h-4 w-4" />
                  Ver Perfil y CV
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Detalles de Talento */}
      <Modal 
        isOpen={!!selectedTalento} 
        onClose={() => setSelectedTalento(null)}
        title="Perfil Profesional Detallado"
      >
        {selectedTalento && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50 rounded-2xl">
              <div className="h-24 w-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white overflow-hidden shadow-xl shadow-blue-500/20">
                {selectedTalento.foto ? (
                  <img src={selectedTalento.foto} alt={selectedTalento.nombre} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12" />
                )}
              </div>
              <div className="text-center md:text-left flex-1">
                <h2 className="text-2xl font-bold text-slate-900">{selectedTalento.nombre}</h2>
                <p className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-2">{selectedTalento.especialidad}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Mail className="h-4 w-4 text-blue-400" />
                    {selectedTalento.email}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                Resumen de Trayectoria
              </h3>
              <div className="p-6 bg-white border border-slate-100 rounded-2xl italic text-slate-600 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20"></div>
                 {selectedTalento.resumen || "No ha proporcionado un resumen profesional aún."}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Currículum Vitae
              </h3>
              
              {loadingCv ? (
                <div className="flex items-center gap-2 text-blue-600 py-4">
                  <Spinner size="sm" />
                  <span className="text-sm font-bold">Localizando documento...</span>
                </div>
              ) : cvUrl ? (
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border-2 border-slate-100 overflow-hidden h-96 bg-slate-50 flex flex-col justify-center">
                    {!isOnline ? (
                      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 text-center space-y-3">
                        <div className="p-3 bg-amber-50 rounded-full text-amber-600">
                          <AlertCircle className="h-6 w-6" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-800">Previsualización No Disponible Sin Conexión</h4>
                        <p className="text-[10px] text-slate-500 max-w-sm">
                          La previsualización interactiva de documentos requiere conexión a internet. Puede descargar el archivo si lo necesita sin conexión.
                        </p>
                      </div>
                    ) : (
                      <iframe 
                        src={cvUrl.toLowerCase().endsWith('.pdf') 
                          ? cvUrl 
                          : `https://docs.google.com/gview?url=${encodeURIComponent(cvUrl)}&embedded=true`
                        } 
                        className="w-full h-full border-none"
                        title="Visor CV"
                      ></iframe>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => window.open(cvUrl, '_blank')}
                      className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Pantalla Completa
                    </Button>
                    <a 
                      href={cvUrl.replace('/upload/', '/upload/fl_attachment/')} 
                      download 
                      className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
                    >
                      Descargar PDF
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Este profesional aún no ha cargado su Currículum Vitae al sistema.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
