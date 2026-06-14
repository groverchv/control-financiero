import casa1 from "../../../assets/images/casa1.jpg";
import {
  Compass,
  Activity,
  MapPin,
  Phone,
  Facebook,
  Scale,
  BookOpen,
  Award,
  ArrowRight,
  Users,
  CheckCircle2,
  Briefcase,
  Check,
} from "lucide-react";

const CONTACT_ITEMS = [
  {
    icon: Phone,
    color: "purple",
    label: "Contáctanos al",
    value: "61553010",
    sub: "WhatsApp Habilitado",
    href: "https://wa.me/59161553010",
  },
  {
    icon: MapPin,
    color: "emerald",
    label: "Dirección Sede",
    value: "Barrio California Calle Santa Ana #239",
    sub: "Santa Cruz, Bolivia",
    href: "https://maps.app.goo.gl/jtJRnNNr1APQeTKr5",
  },
  {
    icon: Facebook,
    color: "blue",
    label: "Redes Sociales",
    value: "APF Santa Cruz (Facebook)",
    sub: "Sigue nuestras publicaciones",
    href: "https://www.facebook.com/share/1R1Cs8nNtm/",
  },
];

const COLOR_MAP = {
  blue: {
    bg: "bg-blue-50/50 dark:bg-blue-950/10",
    text: "text-blue-600 dark:text-blue-450",
    border: "border-blue-100/50 dark:border-blue-950/20",
  },
  purple: {
    bg: "bg-purple-50/50 dark:bg-purple-950/10",
    text: "text-purple-600 dark:text-purple-450",
    border: "border-purple-100/50 dark:border-purple-950/20",
  },
  emerald: {
    bg: "bg-emerald-50/50 dark:bg-emerald-950/10",
    text: "text-emerald-600 dark:text-emerald-450",
    border: "border-emerald-100/50 dark:border-emerald-950/20",
  },
  amber: {
    bg: "bg-amber-50/50 dark:bg-amber-950/10",
    text: "text-amber-600 dark:text-amber-450",
    border: "border-amber-100/50 dark:border-amber-950/20",
  },
};

const ContactItem = ({ icon: Icon, color, label, value, sub, href }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <div className="flex gap-4 items-start group">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${c.bg} ${c.text} transition-transform duration-300 group-hover:scale-110`}
        aria-hidden="true"
      >
        <Icon className="h-5.5 w-5.5" />
      </div>
      <div>
        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {label}
        </h4>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mt-0.5 block"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
            {value}
          </p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-450">{sub}</p>
      </div>
    </div>
  );
};

export const LandingPage = () => {
  return (
    <div className="w-full flex flex-col items-center bg-white dark:bg-slate-950 overflow-hidden">
      {/* ── 1. SECCIÓN HERO (FULL BLEED / EDGE-TO-EDGE) ── */}
      <section className="relative w-full bg-slate-950 text-white min-h-[60vh] md:min-h-[85vh] flex items-center justify-center py-12 md:py-20 px-4 sm:px-8 overflow-hidden">
        {/* Immersive background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(30,41,59,0.9),rgba(9,15,28,1))]" />

        {/* Soft floating blur circles */}
        <div className="absolute top-1/4 left-1/4 h-80 w-80 bg-emerald-500/10 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-blue-500/10 blur-[120px] rounded-full" />

        {/* Custom grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem]" />

        <div className="relative z-10 max-w-4xl mx-auto w-full flex flex-col items-center text-center justify-center">
          <div className="max-w-3xl space-y-8 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20 backdrop-blur-md">
              <Award className="h-4 w-4" /> ASOCIACIÓN DE PROFESIONALES
              FINANCIEROS
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-white">
              Liderando la era de la <br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Excelencia Financiera
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-xl max-w-2xl leading-relaxed">
              Uniendo talento, ética y desarrollo estratégico para guiar el
              crecimiento económico y social de Santa Cruz y toda Bolivia.
            </p>

            <div className="flex flex-wrap gap-4 justify-center pt-2">
              <a
                href="#unete"
                className="inline-flex items-center gap-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 px-8 py-4 text-sm font-bold text-white transition-all shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <span>Afiliarse Ahora</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#bienvenida"
                className="inline-flex items-center gap-2.5 rounded-full bg-slate-900/80 hover:bg-slate-850 px-8 py-4 text-sm font-bold text-slate-200 border border-slate-800 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                Conocer la Asociación
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. BIENVENIDA DEL DIRECTORIO (NATURAL FLOW) ── */}
      <section
        id="bienvenida"
        className="w-full bg-white dark:bg-slate-950 py-6 md:py-16 px-4 sm:px-8 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
              La Voz del Directorio
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
              Bienvenida del Directorio
            </h2>
            <div className="relative text-slate-600 dark:text-slate-350 space-y-6 text-base sm:text-lg leading-relaxed font-light">
              <p className="font-semibold text-slate-800 dark:text-slate-100 italic text-xl border-l-4 border-emerald-500 pl-5">
                "Estimados colegas y aliados del sector financiero..."
              </p>
              <p>
                Es un honor para el Directorio de la Asociación de Profesionales
                Financieros de Santa Cruz presentarles este portafolio, un
                reflejo de nuestra pasión, compromiso y visión para el futuro de
                nuestra profesión en esta vibrante tierra cruceña.
              </p>
              <p>
                Invitamos a cada profesional financiero de Santa Cruz a unirse a
                esta comunidad, donde la colaboración y el desarrollo continuo
                son los pilares de nuestro crecimiento colectivo. Juntos, no
                solo elevaremos los estándares de nuestra profesión, sino que
                también contribuiremos activamente al progreso económico y
                social de nuestra querida Santa Cruz y de toda Bolivia.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
              Valores
            </h3>
            <div className="space-y-6">
              <div className="group">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Excelencia</h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Promover activamente la excelencia y calidad técnica en la gestión corporativa y personal.
                </p>
              </div>

              <div className="group">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Ética e Integridad</h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Fomentar las mejores prácticas éticas y el cumplimiento de normativas financieras con transparencia total.
                </p>
              </div>

              <div className="group">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Innovación Continua</h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Adaptabilidad constante a los cambios globales del mercado y adopción de tecnologías financieras avanzadas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. ¿QUÉ HACEMOS? (INTEGRATED LAYOUT) ── */}
      <section
        id="que-hacemos"
        className="w-full bg-slate-50 dark:bg-slate-900/30 py-6 md:py-16 px-4 sm:px-8 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-16">
          <div className="text-left max-w-3xl space-y-4">
            <span className="text-xs font-black tracking-widest text-emerald-600 dark:text-emerald-450 uppercase">
              ¿Qué Hacemos?
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white leading-tight">
              Impulsar al Futuro Financiero de Santa Cruz
            </h2>
            <p className="text-slate-650 dark:text-slate-350 text-base sm:text-lg font-light leading-relaxed max-w-4xl">
              En la Asociación de Profesionales Financieros de Santa Cruz,
              trabajamos incansablemente para brindar a nuestros miembros y al
              sector herramientas y oportunidades que generen un impacto real.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            {/* Pilar 1 */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Responsabilidad Social y Ética Financiera
                </h3>
              </div>
              <div className="space-y-6">
                <div className="flex gap-3.5 items-start">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      Oferta
                    </span>
                    <p className="text-sm sm:text-base text-slate-650 dark:text-slate-400 font-light mt-0.5">
                      Impulsar programas de educación financiera dirigidos a la
                      comunidad.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      Enfoque
                    </span>
                    <p className="text-sm sm:text-base text-slate-650 dark:text-slate-400 font-light mt-0.5">
                      Formar profesionales con un compromiso social y ambiental,
                      fomentando decisiones de inversión responsables.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      Impacto
                    </span>
                    <p className="text-sm sm:text-base text-slate-650 dark:text-slate-400 font-light mt-0.5">
                      Contribuir al bienestar social y al desarrollo de una
                      economía más consciente y sostenible en Santa Cruz.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pilar 2 */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Scale className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Defensa y Representación Activa
                </h3>
              </div>
              <div className="space-y-6">
                <div className="flex gap-3.5 items-start">
                  <div className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                      Oferta
                    </span>
                    <p className="text-sm sm:text-base text-slate-650 dark:text-slate-400 font-light mt-0.5">
                      Ser la voz unificada de los profesionales financieros ante
                      autoridades, reguladores y la sociedad en general.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start">
                  <div className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                      Enfoque
                    </span>
                    <p className="text-sm sm:text-base text-slate-650 dark:text-slate-400 font-light mt-0.5">
                      Participar activamente en la discusión y construcción de
                      marcos normativos y políticas públicas que beneficien al
                      sector y promuevan un mercado justo y transparente.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start">
                  <div className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                      Impacto
                    </span>
                    <p className="text-sm sm:text-base text-slate-650 dark:text-slate-400 font-light mt-0.5">
                      Proteger los intereses profesionales de nuestros asociados
                      y promover un entorno favorable para el desarrollo
                      financiero.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. SECCIÓN PROPÓSITO INSTITUCIONAL (FLUID / MISIÓN Y VISIÓN) ── */}
      <section 
        id="proposito"
        className="w-full bg-white dark:bg-slate-950 py-6 md:py-16 px-4 sm:px-8 relative scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-16 relative z-10">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-500 border border-blue-500/20">
              <Compass className="h-4 w-4" /> PROPÓSITO
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Nuestra Esencia
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-10 items-stretch">
            {/* Misión */}
            <div className="space-y-3.5 text-left p-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Compass className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Misión
                </h3>
              </div>
              <p className="text-slate-650 dark:text-slate-400 leading-relaxed text-sm sm:text-base font-light">
                Impulsar el desarrollo, la ética y la excelencia de nuestros
                miembros, cimentando las mejores prácticas del sector
                financiero. Nuestro propósito es ser el faro que guíe el
                conocimiento, la integridad y el impacto positivo, contribuyendo
                de forma decisiva al crecimiento sostenible y responsable de la
                economía de Santa Cruz y de Bolivia.
              </p>
            </div>

            {/* Visión */}
            <div className="space-y-3.5 text-left p-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Activity className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Visión
                </h3>
              </div>
              <p className="text-slate-650 dark:text-slate-400 leading-relaxed text-sm sm:text-base font-light">
                Aspiramos a que la Asociación de Profesionales Financieros de
                Santa Cruz sea reconocida como la organización líder y más
                influyente en el ámbito financiero regional y nacional.
                Visualizamos una asociación que no solo eleve el estándar
                profesional, sino que también sea un referente clave en la
                formación de líderes éticos, la promoción de la innovación y la
                defensa proactiva de los intereses del sector, generando una
                confianza invaluable y un valor tangible para la sociedad y el
                progreso económico de nuestra querida Santa Cruz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. HISTORIA (FLUID TIMELINE BANNER) ── */}
      <section
        id="historia"
        className="w-full bg-slate-50 dark:bg-slate-900/30 py-6 md:py-16 px-4 sm:px-8 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-4 text-left">
            <span className="text-xs font-black tracking-widest text-purple-600 dark:text-purple-400 uppercase">
              Orígenes del Programa
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Nuestra Historia
            </h2>
            <div className="h-1 bg-purple-500 w-12 rounded-full" />
          </div>

          <div className="lg:col-span-7 text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed font-light pl-6 border-l-4 border-purple-500/30">
            <p>
              La carrera de <strong>Ingeniería Financiera</strong> se fundó el{" "}
              <strong>11 de Junio de 2002</strong>. Las universidades pioneras
              en lanzar esta disciplina en Santa Cruz fueron la{" "}
              <strong>U.A.G.R.M.</strong> y la <strong>UPSA</strong>,
              integrándose luego prestigiosas instituciones de formación
              superior como NUR, UCB, UTEPSA y UPB. Actualmente es una
              especialidad de gran proyección con profesionales activos en
              puestos clave alrededor del mundo.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. SECCIÓN ÚNETE (LUXURY CARD CTA) ── */}
      <section
        id="unete"
        className="w-full py-8 md:py-16 px-4 sm:px-8 bg-slate-950 text-white scroll-mt-20 relative overflow-hidden"
      >
        {/* Background lights */}
        <div className="absolute -right-20 -bottom-20 h-64 w-64 bg-emerald-500/10 blur-3xl rounded-full" />

        <div className="max-w-6xl mx-auto relative z-10 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <Briefcase className="h-3.5 w-3.5" /> MEMBRESÍA INSTITUCIONAL
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Únete a la Asociación de Profesionales Financieros
            </h2>
            <p className="text-slate-350 text-sm sm:text-base leading-relaxed font-light">
              Tu crecimiento es nuestro motor. Afíliate hoy para expandir tu red
              corporativa, capacitarte continuamente y tener representación ante
              los principales entes financieros.
            </p>

            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm border-l-2 border-emerald-500/30 pl-4">
              <div>
                <span className="block text-[10px] text-slate-450 uppercase tracking-widest">
                  Inscripción
                </span>
                <span className="text-lg font-bold text-emerald-450">
                  150 Bs.
                </span>
              </div>
              <div className="w-[1px] bg-slate-800 self-stretch hidden sm:block" />
              <div>
                <span className="block text-[10px] text-slate-450 uppercase tracking-widest">
                  Mensualidad
                </span>
                <span className="text-lg font-bold text-emerald-450">
                  20 Bs.
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" /> Requisitos
            </h3>
            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Fotocopia de Carnet de Identidad (anverso y reverso).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Fotocopia de Título en Provisión Nacional y/o Académico.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Curriculum Vitae actualizado.</span>
              </li>
            </ul>

            <a
              href="https://wa.me/59161553010?text=Hola,%20quisiera%20afiliarme%20a%20la%20Asociaci%C3%B3n%20de%20Profesionales%20Financieros."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-full bg-emerald-600 hover:bg-emerald-700 px-6 py-4 text-sm font-bold text-white transition-all shadow-lg shadow-emerald-950/20 active:scale-95 cursor-pointer"
            >
              <svg
                className="h-5 w-5 fill-current"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.806-9.8.001-2.618-1.01-5.08-2.848-6.92C16.39 2.045 13.922 1.025 11.99 1.025 6.597 1.025 2.193 5.42 2.19 10.82c-.001 1.516.4 2.993 1.158 4.3l-.993 3.628 3.702-.972zm10.957-7.46c-.3-.15-1.77-.873-2.046-.973-.276-.1-.477-.15-.676.15-.2.3-.77.973-.944 1.173-.175.2-.35.226-.65.076-.3-.15-1.267-.467-2.413-1.488-.892-.796-1.493-1.78-1.668-2.08-.176-.3-.018-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.628-.926-2.228-.243-.584-.49-.505-.676-.514-.175-.008-.375-.01-.576-.01-.2 0-.526.075-.802.375-.276.3-1.052 1.028-1.052 2.506s1.077 2.903 1.228 3.102c.15.2 2.12 3.237 5.136 4.54.717.31 1.277.494 1.714.633.72.228 1.376.196 1.894.118.577-.087 1.77-.724 2.02-1.388.25-.664.25-1.23.175-1.348-.075-.118-.275-.188-.575-.338z" />
              </svg>
              <span>Afiliarse por WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── 7. UBICACIÓN Y CONTACTO ── */}
      <section
        id="contacto"
        className="w-full bg-slate-50 dark:bg-slate-900/30 py-6 md:py-16 px-4 sm:px-8 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <MapPin className="h-4 w-4" /> SEDE CENTRAL
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Contacto y Ubicación
            </h2>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Canales */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[32px] border border-slate-100 dark:border-slate-850 shadow-sm flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Medios de Atención
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                  Puedes contactarte con nosotros mediante nuestros canales
                  autorizados de atención y soporte corporativo.
                </p>
              </div>
              <address className="space-y-6 not-italic">
                {CONTACT_ITEMS.map((item) => (
                  <ContactItem key={item.label} {...item} />
                ))}
              </address>
            </div>

            {/* Mapa premium */}
            <a
              href="https://maps.app.goo.gl/jtJRnNNr1APQeTKr5"
              target="_blank"
              rel="noopener noreferrer"
              className="lg:col-span-7 relative overflow-hidden rounded-[32px] border border-slate-100 dark:border-slate-850 bg-slate-950 p-6 flex flex-col justify-between shadow-inner group cursor-pointer block hover:border-emerald-500/30 transition-colors"
              aria-label="Abrir mapa en Google Maps"
            >
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                  src={casa1}
                  alt="Ubicación"
                  className="w-full h-full object-cover opacity-15 group-hover:scale-105 group-hover:opacity-25 transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-slate-950/60 z-0" />
              </div>

              <div className="relative z-10 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1 text-[10px] text-slate-350 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>GPS ONLINE</span>
                </div>
              </div>

              <div className="relative my-12 flex flex-col items-center z-10">
                <div className="h-14 w-14 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 flex items-center justify-center animate-bounce">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="mt-4 px-5 py-2.5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl text-center backdrop-blur">
                  <p className="text-xs font-bold text-white">
                    Sede Central APF
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Barrio California, Calle Santa Ana #239
                  </p>
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900 pt-4 font-mono">
                <span>LAT: -17.821663</span>
                <span>LNG: -63.215271</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── 8. AGRADECIMIENTO ── */}
      <section className="w-full text-center py-6 md:py-10 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900">
        <div className="max-w-2xl mx-auto px-4 space-y-4">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            ¡Muchas Gracias!
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base italic font-light leading-relaxed">
            "Gracias por su tiempo e interés en construir un futuro financiero
            más sólido y ético en nuestra región"
          </p>
        </div>
      </section>
    </div>
  );
};
