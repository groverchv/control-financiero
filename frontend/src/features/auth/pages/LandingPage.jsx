import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../services/supabase';
import { 
  BadgeCheck, ChevronRight, ShieldCheck, Heart, Compass, Activity,
  Building, MapPin, Phone, Mail, Clock, Loader2, AlertTriangle
} from 'lucide-react';

// ─── Constantes de Contenido Institucional ───────────────────────────────────
const TIMELINE_DATA = [
  {
    year: '2015',
    title: 'La Fundación',
    color: 'blue',
    description: 'Nace la asociación en la ciudad de Cochabamba de la inquietud de 15 fundadores egresados y destacados profesionales, quienes buscaban estructurar un entorno formal de desarrollo profesional continuo y apoyo solidario de recursos.'
  },
  {
    year: '2020',
    title: 'Consolidación',
    color: 'purple',
    description: 'Superamos los 250 socios activos y establecemos los módulos formales de capacitación académica continua. Firmamos alianzas con centros de postgrado e impulsamos más de 40 eventos académicos anuales de alto impacto gremial.'
  },
  {
    year: '2026',
    title: 'Integración Tecnológica',
    color: 'emerald',
    description: 'Lanzamiento de nuestra Plataforma Institucional v2.0, integrando sistemas automatizados de control de caja, notificaciones por correo y un registro de auditoría transparente e incorruptible basado en tecnología Hyperledger Fabric Blockchain.'
  }
];

const CONTACT_ITEMS = [
  { icon: MapPin, color: 'blue', label: 'Dirección', value: 'Av. Las Américas Nº 450, Edificio El Prado, Piso 3', sub: 'Cochabamba, Bolivia' },
  { icon: Phone, color: 'purple', label: 'Teléfono / Fax', value: '+591 4 4567890', sub: 'Lun-Vie: 08:30 - 18:30' },
  { icon: Mail, color: 'emerald', label: 'Email Oficial', value: 'contacto@asociacion-control.org', sub: 'Soporte y Consultas 24/7' },
  { icon: Clock, color: 'amber', label: 'Horario de Atención', value: 'Lunes a Viernes', sub: '08:30 - 12:30 | 14:30 - 18:30' }
];

const COLOR_MAP = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', dot: 'bg-blue-100 text-blue-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', dot: 'bg-purple-100 text-purple-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-100 text-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', dot: 'bg-amber-100 text-amber-600' }
};

// ─── Hook: Estadísticas públicas en tiempo real ──────────────────────────────
const useLandingStats = () => {
  const [stats, setStats] = useState({ socios: 0, eventos: 0, cobertura: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!cancelled) setLoading(true);
        if (!cancelled) setError(null);

        const [miembrosRes, actividadesRes, selladosRes, totalRes] = await Promise.all([
          supabase.from('miembro').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
          supabase.from('actividad').select('id', { count: 'exact', head: true }),
          supabase.from('ingreso').select('id', { count: 'exact', head: true }).not('hash_actual', 'is', null),
          supabase.from('ingreso').select('id', { count: 'exact', head: true })
        ]);

        if (cancelled) return;

        const totalMiembros = miembrosRes.count ?? 0;
        const totalActividades = actividadesRes.count ?? 0;
        const totalSellados = selladosRes.count ?? 0;
        const totalRegistros = totalRes.count ?? 0;
        const cobertura = totalRegistros > 0 ? Math.round((totalSellados / totalRegistros) * 100) : 100;

        setStats({ socios: totalMiembros, eventos: totalActividades, cobertura });
      } catch (err) {
        console.error('[LandingStats] Error:', err);
        if (!cancelled) setError('No se pudieron cargar las estadísticas.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [retryKey]);

  const retry = () => setRetryKey(k => k + 1);

  return { stats, loading, error, retry };
};

// ─── Sub-Componentes Reutilizables ───────────────────────────────────────────

/** Indicador numérico con estado de carga */
const StatCard = ({ value, label, color, loading }) => (
  <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 text-center" role="figure" aria-label={`${label}: ${value}`}>
    {loading ? (
      <Loader2 className={`h-6 w-6 mx-auto animate-spin ${COLOR_MAP[color]?.text || 'text-blue-600'}`} />
    ) : (
      <span className={`block text-2xl sm:text-3xl font-extrabold ${COLOR_MAP[color]?.text || 'text-blue-600'}`}>
        {typeof value === 'number' ? value.toLocaleString('es-BO') : value}
      </span>
    )}
    <span className="text-xs text-slate-500 font-medium">{label}</span>
  </div>
);

/** Tarjeta de Misión / Visión */
const MissionCard = ({ icon: Icon, title, description, color }) => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-all group">
    <div className={`absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 ${color === 'blue' ? 'bg-blue-500/5' : 'bg-emerald-500/5'} rounded-full group-hover:scale-125 transition-transform`} aria-hidden="true" />
    <div className={`mb-4 inline-flex items-center justify-center h-10 w-10 rounded-lg ${COLOR_MAP[color].bg} ${COLOR_MAP[color].text}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </div>
    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
  </div>
);

/** Ítem de la línea de tiempo */
const TimelineItem = ({ index, year, title, description, color }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <div className="relative pl-6 md:pl-10">
      <div className={`absolute -left-3.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full ${c.dot} border-4 border-white shadow-sm font-bold text-xs`} aria-hidden="true">
        {index + 1}
      </div>
      <div className="grid md:grid-cols-12 gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="md:col-span-3">
          <span className={`text-lg font-extrabold ${c.text} font-mono`}>{year}</span>
          <h4 className="text-base font-bold text-slate-900">{title}</h4>
        </div>
        <div className="md:col-span-9 text-slate-500 text-sm leading-relaxed">{description}</div>
      </div>
    </div>
  );
};

/** Ítem de contacto */
const ContactItem = ({ icon: Icon, color, label, value, sub }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <div className="flex gap-4 items-start">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.bg} ${c.text}`} aria-hidden="true">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</h4>
        <p className="text-sm font-semibold text-slate-700 mt-1">{value}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </div>
  );
};

// ─── Componente Principal ────────────────────────────────────────────────────
export const LandingPage = () => {
  const { stats, loading, error, retry } = useLandingStats();

  const statsCards = useMemo(() => [
    { value: loading ? '...' : `${stats.socios}+`, label: 'Socios Activos', color: 'blue' },
    { value: loading ? '...' : `${stats.eventos}+`, label: 'Eventos Dictados', color: 'emerald' },
    { value: loading ? '...' : `${stats.cobertura}%`, label: 'Transparente', color: 'purple' }
  ], [stats, loading]);

  return (
    <main className="flex flex-col gap-12 sm:gap-16 md:gap-24 pb-10 sm:pb-20" role="main">
      
      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 px-5 sm:px-8 py-14 sm:py-24 text-white lg:px-16 shadow-xl" aria-labelledby="hero-heading">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-400 border border-blue-500/20">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            ASOCIACIÓN CONTROL FINANCIERO
          </div>
          <h1 id="hero-heading" className="text-3xl sm:text-5xl font-extrabold tracking-tight lg:text-6xl leading-tight">
            Bienvenidos a la <br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Nueva Era Institucional</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-lg">
            Un portal unificado para socios y profesionales, diseñado para potenciar la transparencia, el desarrollo profesional y la trazabilidad criptográfica de nuestros recursos.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/login"
              className="group flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              aria-label="Acceder al portal institucional"
            >
              Acceso Institucional
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <a
              href="#historia"
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-6 py-3.5 text-sm font-bold text-slate-300 transition-all hover:bg-slate-700 border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Conocer Historia
            </a>
          </div>
        </div>
        
        {/* Decorative Blockchain Widget */}
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-15 sm:opacity-25 lg:opacity-100 hidden md:block" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-transparent z-10" />
          <div className="absolute inset-0 bg-blue-600/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3" />
          <div className="h-full w-full flex items-center justify-center p-8">
            <div className="relative border border-slate-800/80 rounded-2xl p-6 bg-slate-950/60 backdrop-blur-md shadow-2xl max-w-sm w-full space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-slate-400 font-mono">blockchain_audit_live</span>
                </div>
                <ShieldCheck className="h-4 w-4 text-blue-400" />
              </div>
              <div className="space-y-2 text-xs font-mono text-slate-300">
                <p className="text-slate-500">// Última transacción sellada</p>
                <p className="text-emerald-400">TX_ID: 0x8a9f24c08832e1...</p>
                <p>Concepto: Pago Cuota Ordinaria</p>
                <p>Estado: SECURE_LEDGER</p>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-3/4 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BIENVENIDA Y NÚMEROS CLAVE (DINÁMICOS) ── */}
      <section className="grid md:grid-cols-12 gap-8 md:gap-12 items-center" aria-labelledby="welcome-heading">
        <div className="md:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600">
            <Heart className="h-4 w-4" aria-hidden="true" />
            MENSAJE DE BIENVENIDA
          </div>
          <h2 id="welcome-heading" className="text-2xl sm:text-4xl font-bold text-slate-900 leading-tight">
            Comprometidos con la excelencia profesional y la integridad
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Es un verdadero honor darles la bienvenida a la plataforma oficial de nuestra Asociación. Nos erigimos como una institución consagrada a congregar a los profesionales más talentosos, construyendo un entorno sólido para el desarrollo continuo, el intercambio de conocimientos científicos y sociales, y la gobernanza óptima de nuestras finanzas.
          </p>
          <p className="text-slate-600 leading-relaxed">
            A través de esta plataforma digital avanzada, cada miembro puede consultar su historial de aportes, acceder a certificaciones de eventos académicos y certificar la transparencia institucional mediante nuestro innovador libro contable inmutable sellado en la Blockchain.
          </p>
          
          {/* Estadísticas Dinámicas */}
          {error ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
              <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
              <button onClick={retry} className="ml-auto text-xs font-bold underline hover:no-underline focus:outline-none focus:ring-1 focus:ring-amber-400 rounded">
                Reintentar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100" role="group" aria-label="Estadísticas institucionales">
              {statsCards.map((s) => (
                <StatCard key={s.label} value={s.value} label={s.label} color={s.color} loading={loading} />
              ))}
            </div>
          )}
        </div>

        {/* MISIÓN Y VISIÓN CARDS */}
        <div className="md:col-span-5 space-y-6">
          <MissionCard
            icon={Compass}
            title="Nuestra Misión"
            color="blue"
            description="Fomentar el crecimiento integral, ético e innovador de nuestros profesionales mediante capacitaciones de vanguardia, creando una comunidad colaborativa y garantizando la pulcritud financiera institucional."
          />
          <MissionCard
            icon={Activity}
            title="Nuestra Visión"
            color="emerald"
            description="Consolidarnos para el año 2030 como la asociación gremial referente a nivel nacional en innovación tecnológica, transparencia administrativa y aporte educativo a la sociedad civil."
          />
        </div>
      </section>

      {/* ── HISTORIA (TIMELINE) ── */}
      <section id="historia" className="space-y-12 scroll-mt-24" aria-labelledby="history-heading">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-600">
            <Building className="h-4 w-4" aria-hidden="true" />
            NUESTRA HISTORIA
          </div>
          <h2 id="history-heading" className="text-2xl sm:text-3xl font-bold text-slate-900">Una década de constante evolución</h2>
          <p className="text-slate-500 text-sm sm:text-base">
            El camino recorrido por la Asociación refleja el esfuerzo conjunto de cada profesional y socio.
          </p>
        </div>

        <div className="relative border-l border-slate-200 ml-4 md:ml-12 space-y-12" role="list" aria-label="Línea de tiempo institucional">
          {TIMELINE_DATA.map((item, i) => (
            <div key={item.year} role="listitem">
              <TimelineItem index={i} {...item} />
            </div>
          ))}
        </div>
      </section>

      {/* ── UBICACIÓN Y CONTACTO ── */}
      <section id="contacto" className="space-y-12 scroll-mt-24" aria-labelledby="contact-heading">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            ENCUÉNTRANOS
          </div>
          <h2 id="contact-heading" className="text-2xl sm:text-3xl font-bold text-slate-900">Nuestra Sede y Canales de Atención</h2>
          <p className="text-slate-500 text-sm sm:text-base">
            Visite nuestras oficinas administrativas o contáctenos mediante cualquiera de nuestros canales oficiales.
          </p>
        </div>

        <div className="grid md:grid-cols-12 gap-8 items-stretch">
          
          {/* Card de Información */}
          <div className="md:col-span-5 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Oficina Central</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Nuestras instalaciones cuentan con salas de juntas, auditorio de capacitación y oficinas de gestión administrativa y auditoría.
              </p>
              
              <address className="space-y-4 not-italic">
                {CONTACT_ITEMS.map((item) => (
                  <ContactItem key={item.label} {...item} />
                ))}
              </address>
            </div>
            
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium font-mono">
              <span>NIT: 3840291024</span>
              <span>R.A. 204/2015</span>
            </div>
          </div>

          {/* Mapa Visual Premium */}
          <div className="md:col-span-7 relative overflow-hidden rounded-3xl border border-slate-100 bg-slate-950 p-6 flex flex-col justify-between shadow-inner group" aria-label="Ubicación de la sede central en Cochabamba, Bolivia">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))] pointer-events-none" aria-hidden="true" />
            <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" aria-hidden="true" />
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1 text-xs text-slate-300 font-mono">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                <span>Ubicación GPS Satelital</span>
              </div>
              <div className="flex gap-2" aria-hidden="true">
                <span className="h-7 w-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold select-none">+</span>
                <span className="h-7 w-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold select-none">-</span>
              </div>
            </div>

            {/* Radar / Pulse location visualization */}
            <div className="relative my-8 sm:my-12 flex items-center justify-center" aria-hidden="true">
              <div className="absolute h-40 w-40 rounded-full border border-blue-500/10 animate-ping" />
              <div className="absolute h-24 w-24 rounded-full border border-blue-500/20 animate-ping" />
              <div className="absolute h-12 w-12 rounded-full bg-blue-500/10 border border-blue-500/40" />
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/35 border border-blue-400/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MapPin className="h-6 w-6 animate-bounce" />
                </div>
                <div className="mt-4 px-4 py-2 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl text-center backdrop-blur">
                  <p className="text-xs font-bold text-white">Sede Central - Control Financiero</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Cochabamba, Bolivia</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[10px] sm:text-xs text-slate-400 border-t border-slate-900 pt-4 font-mono">
              <span>LAT: -17.393527</span>
              <span>LNG: -66.156944</span>
              <span>zoom: 16.5</span>
            </div>
          </div>

        </div>
      </section>

    </main>
  );
};
