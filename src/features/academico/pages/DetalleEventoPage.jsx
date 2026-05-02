import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Users, Wallet, CheckCircle2, Share2, Info, GraduationCap, AlertTriangle } from 'lucide-react';
import { academicoApi } from '../api';
import { Spinner, Button, Modal } from '../../../components/ui';
import { useAuthStore } from '../../../store/authStore';

export const DetalleEventoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInscrito, setIsInscrito] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalMessage, setModalMessage] = useState(null); // { title, type, text, action }

  useEffect(() => {
    academicoApi.obtenerEventoPorId(id)
      .then(setEvento)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (isAuthenticated && user?.id && id) {
      academicoApi.verificarInscripcion(user.id, id, 'evento')
        .then(setIsInscrito)
        .catch(console.error);
    }
  }, [isAuthenticated, user?.id, id]);

  const handleInscripcion = async () => {
    if (!isAuthenticated) {
      setModalMessage({
        title: 'Autenticación Requerida',
        type: 'error',
        text: 'Debe iniciar sesión para registrarse en este evento.',
        action: () => navigate('/login')
      });
      return;
    }

    if (evento.cupos <= 0) {
      setModalMessage({
        title: 'Cupos Agotados',
        type: 'error',
        text: 'Lo sentimos, ya no hay cupos disponibles para este evento.'
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmarInscripcion = async () => {
    setShowConfirmModal(false);
    setIsEnrolling(true);
    try {
      await academicoApi.inscribirSocio(user.id, evento.id, 'evento');
      setIsInscrito(true);
      setEvento(prev => ({ ...prev, cupos: prev.cupos - 1 }));
      setModalMessage({
        title: '¡Registro Exitoso!',
        type: 'success',
        text: 'Tu participación ha sido confirmada. Te esperamos en el evento.'
      });
    } catch (error) {
      setModalMessage({
        title: 'Error de Registro',
        type: 'error',
        text: error.message || 'Ocurrió un error al procesar su registro.'
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Spinner size="lg" /></div>;
  if (!evento) return <div className="text-center py-20 text-slate-500">Evento no encontrado</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-20">
      <header>
        <Link to="/eventos" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 mb-6 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al calendario
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Izquierdo: Imagen y Detalles Principales */}
        <div className="lg:col-span-2 space-y-8">
      <div className="relative rounded-2xl sm:rounded-[3rem] overflow-hidden shadow-xl sm:shadow-2xl border-2 sm:border-4 border-white bg-slate-100 flex justify-center">
            {evento.imagen ? (
              <img 
                src={evento.imagen} 
                alt={evento.nombre} 
                className="w-full h-auto max-h-[700px] object-contain" 
              />
            ) : (
              <div className="w-full aspect-video bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center">
                <Calendar className="h-20 w-20 text-white/20" />
              </div>
            )}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-white/50 text-blue-600 font-black uppercase tracking-widest text-[10px] sm:text-xs">
              {evento.estado || 'Programado'}
            </div>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-[3rem] p-5 sm:p-8 md:p-12 shadow-sm border border-slate-100">
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight mb-4 sm:mb-6">{evento.nombre}</h1>
            
            <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-6 sm:mb-10">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50/50">
                <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</p>
                  <p className="font-bold text-slate-900">
                    {new Date(evento.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-black uppercase tracking-tighter">
                      {evento.hora?.substring(0, 5) || '19:00'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50/50">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                  {evento.modalidad === 'virtual' ? <Info className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {evento.modalidad === 'virtual' ? 'Plataforma / Enlace' : 'Ubicación'}
                  </p>
                  <p className="font-bold text-slate-900">{evento.ubicacion || 'Por confirmar'}</p>
                  
                  {evento.modalidad === 'presencial' && evento.latitud && evento.longitud && (
                    <a 
                      href={`https://www.google.com/maps?q=${evento.latitud},${evento.longitud}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors border border-blue-200"
                    >
                      <MapPin className="h-3 w-3" />
                      Ver en Google Maps
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="prose prose-slate max-w-none pb-8 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-blue-600" />
                Acerca de este evento
              </h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {evento.descripcion || 'No hay una descripción detallada disponible. Este evento institucional promete ser una experiencia única para todos nuestros miembros.'}
              </p>
            </div>

            <div className="pt-8">
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-widest mb-6 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Requisitos y Preparación
              </h3>
              <div className="bg-slate-50 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 border border-slate-100">
                <ul className="grid grid-cols-1 gap-3 sm:gap-4">
                  {evento.requisitos ? evento.requisitos.split('\n').map((req, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-3 bg-white p-4 rounded-2xl shadow-sm">
                      <div className="h-2 w-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      {req}
                    </li>
                  )) : (
                    <li className="text-sm text-slate-400 italic">No se requieren requisitos especiales.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Registro y Requisitos */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 text-white shadow-xl sticky top-20 sm:top-8 border border-white/5">
            <div className="flex items-center gap-2 mb-6">
              <div className={`h-2 w-2 rounded-full ${evento.modalidad === 'virtual' ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Evento {evento.modalidad || 'Presencial'}
              </span>
            </div>

            <div className="mb-8">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">INVERSIÓN</p>
              <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black">{evento.costo > 0 ? `Bs. ${evento.costo}` : 'GRATUITO'}</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between text-sm py-3 border-b border-white/10">
                <span className="text-slate-400 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Cupos Disponibles
                </span>
                <span className="font-bold">{evento.cupos || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm py-3 border-b border-white/10">
                <span className="text-slate-400 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> Certificación
                </span>
                <span className="font-bold">{evento.incluye_certificacion ? 'Incluida' : 'No disponible'}</span>
              </div>
            </div>

            <Button 
              onClick={handleInscripcion}
              disabled={isEnrolling || isInscrito || evento.cupos <= 0}
              className={`w-full h-14 rounded-2xl text-base font-black shadow-lg ${
                isInscrito 
                  ? 'bg-slate-700 text-slate-300 cursor-not-allowed shadow-none' 
                  : evento.cupos <= 0
                    ? 'bg-red-600 text-white cursor-not-allowed shadow-red-900/20'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
              }`}
            >
              {isEnrolling ? 'Procesando...' : isInscrito ? 'YA ESTÁS REGISTRADO' : evento.cupos <= 0 ? 'CUPOS AGOTADOS' : 'REGISTRARME AHORA'}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirmar Registro" width="max-w-md">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-2">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <p className="text-slate-600">
            Estás a punto de registrarte en <strong className="text-slate-900">{evento.nombre}</strong>.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-500 w-full">
            <strong>ATENCIÓN:</strong> Una vez registrado, <span className="text-red-500 font-bold">no podrá cancelar su registro</span>. Los cupos son limitados.
          </div>
          <p className="text-slate-900 font-bold">¿Desea confirmar su participación?</p>
          <div className="flex w-full gap-3 mt-6">
            <Button onClick={() => setShowConfirmModal(false)} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white">
              Cancelar
            </Button>
            <Button onClick={confirmarInscripcion} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white">
              Confirmar Registro
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Mensajes (Éxito/Error) */}
      <Modal isOpen={!!modalMessage} onClose={() => {
        const action = modalMessage?.action;
        setModalMessage(null);
        if (action) action();
      }} title={modalMessage?.title || "Información"} width="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-2 ${
            modalMessage?.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
          }`}>
            {modalMessage?.type === 'success' ? <CheckCircle2 className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
          </div>
          <p className="text-slate-600">{modalMessage?.text}</p>
          <Button onClick={() => {
            const action = modalMessage?.action;
            setModalMessage(null);
            if (action) action();
          }} className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white">
            Aceptar
          </Button>
        </div>
      </Modal>
    </div>
  );
};
