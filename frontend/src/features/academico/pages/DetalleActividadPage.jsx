import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, MapPin, Users, CheckCircle2, Info, GraduationCap, AlertTriangle, CalendarDays, Clock } from 'lucide-react';
import { academicoApi } from '../api';
import { Spinner, Button, Modal } from '../../../components/ui';
import { LoadingOverlay } from '../../../components/feedback';
import { useAuthStore } from '../../../store/authStore';

export const DetalleActividadPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [actividad, setActividad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInscrito, setIsInscrito] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Estados para el Flujo Transaccional Premium
  const [loadingModal, setLoadingModal] = useState({ open: false, text: '' });
  const [generalConfirmModal, setGeneralConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: '',
    actionType: 'primary',
    onConfirm: null
  });
  const [resultModal, setResultModal] = useState({
    open: false,
    type: 'success',
    text: '',
    details: '',
    action: null
  });
  const [currentEstado, setCurrentEstado] = useState('programado');
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!actividad?.fecha || !actividad?.hora) return;

    const calculateTime = () => {
      const startStr = `${actividad.fecha}T${actividad.hora}`;
      const courseStart = new Date(startStr);
      if (isNaN(courseStart.getTime())) {
        setCurrentEstado('programado');
        setTimeLeft('');
        return;
      }

      const now = new Date();
      const oneHour = 60 * 60 * 1000; // 1 hour in ms
      const courseEndEnrollment = new Date(courseStart.getTime() + oneHour);

      if (now < courseStart) {
        setCurrentEstado('programado');
        setTimeLeft('');
      } else if (now >= courseStart && now <= courseEndEnrollment) {
        setCurrentEstado('en_curso');
        const diffMs = courseEndEnrollment - now;
        const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      } else {
        setCurrentEstado('finalizado');
        setTimeLeft('');
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [actividad]);

  useEffect(() => {
    academicoApi.obtenerActividadPorId(id)
      .then(setActividad)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (isAuthenticated && user?.id && id) {
      academicoApi.verificarInscripcion(user.id, id)
        .then(setIsInscrito)
        .catch(console.error);
    }
  }, [isAuthenticated, user?.id, id]);

  const handleInscripcion = async () => {
    if (!isAuthenticated) {
      setResultModal({
        open: true,
        type: 'error',
        text: 'Autenticación Requerida',
        details: 'Debe iniciar sesión para inscribirse en esta actividad.',
        action: () => navigate('/login')
      });
      return;
    }

    if (currentEstado === 'finalizado') {
      setResultModal({
        open: true,
        type: 'error',
        text: 'Actividad Finalizada',
        details: 'Lo sentimos, ya no es posible inscribirse en esta actividad porque ha finalizado.'
      });
      return;
    }

    if (Number(actividad.cupos) <= 0) {
      setResultModal({
        open: true,
        type: 'error',
        text: 'Cupos Agotados',
        details: 'Lo sentimos, ya no hay cupos disponibles para esta actividad.'
      });
      return;
    }

    setGeneralConfirmModal({
      open: true,
      title: 'Confirmar Inscripción',
      message: `Estás a punto de inscribirte en "${actividad.nombre}". Una vez inscrito, no podrá cancelar su inscripción debido a que las plazas son limitadas y se realiza una reserva de cupo.`,
      confirmText: 'Sí, inscribirme',
      actionType: 'primary',
      onConfirm: confirmarInscripcion
    });
  };

  const confirmarInscripcion = async () => {
    setGeneralConfirmModal(prev => ({ ...prev, open: false }));
    setLoadingModal({ open: true, text: 'Procesando su inscripción y reservando su plaza en el cronograma institucional...' });
    setIsEnrolling(true);
    try {
      await academicoApi.inscribirSocio(user.id, actividad.id);
      setIsInscrito(true);
      setActividad(prev => ({ 
        ...prev, 
        cupos: Math.max(0, prev.cupos - 1) 
      }));
      setLoadingModal({ open: false, text: '' });
      setResultModal({
        open: true,
        type: 'success',
        text: '¡Inscripción Exitosa!',
        details: 'Tu participación ha sido confirmada con éxito. Te esperamos en la actividad.'
      });
    } catch (error) {
      setLoadingModal({ open: false, text: '' });
      setResultModal({
        open: true,
        type: 'error',
        text: 'Error de Inscripción',
        details: error.message || 'Ocurrió un error al procesar su inscripción.'
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Spinner size="lg" /></div>;
  if (!actividad) return <div className="text-center py-20 text-slate-500">Actividad no encontrada</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-20">
      <header>
        <Link to="/actividades" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 mb-6 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver a la agenda de actividades
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Izquierdo: Imagen y Detalles Principales */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative rounded-2xl sm:rounded-[3rem] overflow-hidden shadow-xl sm:shadow-2xl border-2 sm:border-4 border-white bg-slate-100 flex justify-center">
            {actividad.imagen ? (
              <img 
                src={actividad.imagen} 
                alt={actividad.nombre} 
                className="w-full h-auto max-h-[700px] object-contain" 
              />
            ) : (
              <div className="w-full aspect-video bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center">
                <GraduationCap className="h-20 w-20 text-white/20" />
              </div>
            )}
            <div className={`absolute top-4 right-4 sm:top-6 sm:right-6 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-white/50 font-black uppercase tracking-widest text-[10px] sm:text-xs ${
              currentEstado === 'finalizado' ? 'text-slate-500' : 'text-emerald-600'
            }`}>
              {currentEstado === 'en_curso' ? 'En proceso' : currentEstado === 'finalizado' ? 'Finalizado' : 'Programada'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[3rem] p-5 sm:p-8 md:p-12 shadow-none border border-slate-100 dark:border-slate-700">
            <div className="flex flex-wrap gap-2 items-center mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                <BookOpen className="h-3.5 w-3.5" />
                {actividad.tipo_nombre || 'Actividad Institucional'}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight mb-4 sm:mb-6">{actividad.nombre}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 sm:mb-10">
              <div className="box-emerald flex items-start gap-4 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/10 border border-transparent dark:border-emerald-500/10">
                <div className="icon-emerald h-10 w-10 rounded-xl bg-emerald-600 dark:bg-emerald-500/20 flex items-center justify-center text-white dark:text-emerald-400 shrink-0">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fecha del Evento</p>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {new Date(actividad.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="box-blue flex items-start gap-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-500/10 border border-transparent dark:border-blue-500/10">
                <div className="icon-blue h-10 w-10 rounded-xl bg-blue-600 dark:bg-blue-500/20 flex items-center justify-center text-white dark:text-blue-400 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Horario / Hora de Inicio</p>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {actividad.hora?.substring(0, 5) || '19:00'} Hrs
                  </p>
                </div>
              </div>

              <div className="box-teal flex items-start gap-4 p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-500/10 border border-transparent dark:border-teal-500/10 md:col-span-2">
                <div className="icon-teal h-10 w-10 rounded-xl bg-teal-600 dark:bg-teal-500/20 flex items-center justify-center text-white dark:text-teal-400 shrink-0">
                  {actividad.modalidad === 'virtual' ? <Info className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {actividad.modalidad === 'virtual' ? 'Plataforma / Enlace' : 'Lugar / Dirección'}
                  </p>
                  {actividad.modalidad === 'virtual' && actividad.ubicacion && (actividad.ubicacion.startsWith('http') || actividad.ubicacion.includes('.')) ? (
                    <a 
                      href={actividad.ubicacion.startsWith('http') ? actividad.ubicacion : `https://${actividad.ubicacion}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline break-all"
                    >
                      {actividad.ubicacion}
                    </a>
                  ) : (
                    <p className="font-bold text-slate-900 dark:text-white">{actividad.ubicacion || 'Por confirmar'}</p>
                  )}

                  {actividad.modalidad === 'presencial' && actividad.latitud && actividad.longitud && (
                    <a 
                      href={`https://www.google.com/maps?q=${actividad.latitud},${actividad.longitud}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-900/30 px-3 py-1.5 rounded-full transition-colors border border-emerald-200 dark:border-emerald-800/50"
                    >
                      <MapPin className="h-3 w-3" />
                      Ver en Google Maps
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none pb-8 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Descripción de la Actividad
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-lg">
                {actividad.descripcion || 'Esta capacitación académica está diseñada para brindar herramientas prácticas y teóricas a nuestros miembros. Aprovecha esta oportunidad de crecimiento profesional.'}
              </p>
            </div>

            {actividad.jurados && actividad.jurados.length > 0 && (
              <div className="pt-8 border-b border-slate-100 dark:border-slate-700 pb-8">
                <h3 className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Jurado Evaluador Designado
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {actividad.jurados.map((jurado, i) => {
                    const isObj = typeof jurado === 'object' && jurado !== null;
                    const isExterno = isObj ? jurado.isExterno : (typeof jurado === 'string' && jurado.includes('Externo'));
                    const rawName = isObj ? jurado.nombre : jurado;
                    let nombre = typeof rawName === 'string' ? rawName.replace(/\[JURADO EXTERNO:\s*(.*?)\]/, '$1').trim() : 'Jurado';
                    
                    if (!nombre || nombre === 'Jurado Externo' || nombre === 'Invitado') {
                      nombre = 'Jurado Invitado';
                    }
                    
                    // Subtítulo:
                    // 1. Si es externo y el nombre NO es "Jurado Invitado", muestra "Invitado"
                    // 2. Si es socio, muestra su profesión registrada (si la tiene). Si no la tiene, NO MUESTRA NINGÚN SUBTÍTULO.
                    let subtitle = null;
                    if (isExterno) {
                      if (nombre !== 'Jurado Invitado') {
                        subtitle = 'Invitado';
                      }
                    } else if (isObj && jurado.profesion && jurado.profesion !== 'Socio' && jurado.profesion !== 'Socio Institucional') {
                      subtitle = jurado.profesion;
                    }

                    return (
                      <div key={i} className="flex items-center gap-3 bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/20 p-4 rounded-2xl shadow-none">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 dark:bg-indigo-500/20 flex items-center justify-center text-white dark:text-indigo-400 shrink-0">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{nombre}</p>
                          {subtitle && (
                            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{subtitle}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-8">
              <h3 className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-widest mb-6 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Requisitos Previos
              </h3>
              <div className="bg-slate-50 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 border border-slate-100">
                <ul className="grid grid-cols-1 gap-3 sm:gap-4">
                  {actividad.requisitos ? actividad.requisitos.split('\n').map((req, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-3 bg-white p-4 rounded-2xl shadow-sm">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      {req}
                    </li>
                  )) : (
                    <li className="text-sm text-slate-400 italic">No se requieren conocimientos previos específicos.</li>
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
              <div className={`h-2 w-2 rounded-full ${actividad.modalidad === 'virtual' ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Actividad {actividad.modalidad || 'Presencial'}
              </span>
            </div>

            <div className="mb-8">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">COSTO DE INSCRIPCIÓN</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black">{actividad.costo > 0 ? `Bs. ${actividad.costo}` : 'SIN COSTO'}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">* Exclusivo para socios activos</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between text-sm py-3 border-b border-white/10">
                <span className="text-slate-400 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Cupos Disponibles
                </span>
                <span className="font-bold">
                  {`${actividad.cupos || 0} plazas`}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm py-3 border-b border-white/10">
                <span className="text-slate-400 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> Certificación
                </span>
                <span className="font-bold">{actividad.incluye_certificacion ? 'Incluida' : 'No disponible'}</span>
              </div>
            </div>

            {currentEstado === 'en_curso' && !isInscrito && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center animate-pulse flex flex-col items-center justify-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">
                  TIEMPO LÍMITE DE INSCRIPCIÓN
                </span>
                <p className="text-sm font-bold text-amber-200">
                  Aún puede inscribirse, quedan <span className="font-mono text-base font-black text-amber-400 bg-slate-950 px-2 py-0.5 rounded-md border border-white/5 ml-1">{timeLeft}</span> min
                </p>
              </div>
            )}

            <Button 
              onClick={handleInscripcion}
              disabled={isEnrolling || isInscrito || Number(actividad.cupos) <= 0 || currentEstado === 'finalizado'}
              className={`w-full h-14 rounded-2xl text-base font-black shadow-lg ${
                isInscrito 
                  ? 'bg-slate-700 text-slate-300 cursor-not-allowed shadow-none' 
                  : currentEstado === 'finalizado'
                    ? 'bg-slate-700 text-slate-300 cursor-not-allowed shadow-none'
                    : Number(actividad.cupos) <= 0
                      ? 'bg-red-600 text-white cursor-not-allowed shadow-red-900/20'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
              }`}
            >
              {isEnrolling 
                ? 'Procesando...' 
                : isInscrito 
                  ? 'YA ESTÁS INSCRITO' 
                  : currentEstado === 'finalizado'
                    ? 'CURSO FINALIZADO'
                    : Number(actividad.cupos) <= 0
                      ? 'CUPOS AGOTADOS' 
                      : 'INSCRIBIRME AHORA'}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal General de Confirmación */}
      <Modal
        isOpen={generalConfirmModal.open}
        onClose={() => setGeneralConfirmModal((prev) => ({ ...prev, open: false }))}
        title={
          <div className="flex items-center gap-2.5 text-blue-600">
            <Info className="h-5.5 w-5.5 stroke-[2.5]" />
            <span>{generalConfirmModal.title}</span>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-sm">
            <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <span>{generalConfirmModal.message}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setGeneralConfirmModal((prev) => ({ ...prev, open: false }))}
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={generalConfirmModal.onConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {generalConfirmModal.confirmText}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Resultado */}
      <Modal
        isOpen={resultModal.open}
        onClose={() => {
          const action = resultModal?.action;
          setResultModal((prev) => ({ ...prev, open: false }));
          if (action) action();
        }}
        title={resultModal.type === "success" ? "Operación Exitosa" : "Error en Operación"}
        width="max-w-md"
      >
        <div className="flex flex-col items-center text-center space-y-4 py-2">
          {resultModal.type === "success" ? (
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          ) : (
            <div className="rounded-full bg-rose-100 p-3 text-rose-600">
              <AlertTriangle className="h-12 w-12" />
            </div>
          )}
          <h4 className={`text-lg font-bold ${resultModal.type === "success" ? "text-slate-900" : "text-rose-900"}`}>
            {resultModal.text}
          </h4>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
            {resultModal.details}
          </p>
          <div className="pt-2 w-full">
            <Button
              className="w-full"
              variant={resultModal.type === "success" ? "primary" : "danger"}
              onClick={() => {
                const action = resultModal?.action;
                setResultModal((prev) => ({ ...prev, open: false }));
                if (action) action();
              }}
            >
              Entendido
            </Button>
          </div>
        </div>
      </Modal>

      <LoadingOverlay open={loadingModal.open} text={loadingModal.text} />
    </div>
  );
};
