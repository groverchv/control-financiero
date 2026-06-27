import { useEffect, useState } from "react";
import {
  CalendarDays,
  ArrowLeft,
  Users,
  Clock,
  ArrowRight,
  CheckCircle2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { academicoApi } from "../api";
import { useAuthStore } from "../../../store/authStore";
import { getDynamicEstado } from "../../../utils/formatters";
import { supabase } from "../../../services/supabase";

const formatHora = (hora) => {
  if (!hora) return "--:--";
  const parts = hora.split(":");
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${ampm}`;
};

export const PublicCursosPage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12; // Compatible with 2, 3, and 4 columns

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [acts, insc] = await Promise.all([
          academicoApi.obtenerActividades(),
          isAuthenticated && user?.id
            ? academicoApi.obtenerInscripcionesUsuario(user.id)
            : Promise.resolve([]),
        ]);

        const enrolledIds = new Set(insc.map((i) => i.actividad_id));

        const processed = acts
          .filter((a) => {
            // Hide activities explicitly unpublished by admin
            if (a.publicado === false) return false;

            // Hide activities after 1 hour of finalizing (i.e. 2 hours after their start time)
            if (a.fecha && a.hora) {
              const startStr = `${a.fecha}T${a.hora}`;
              const courseStart = new Date(startStr);
              if (!isNaN(courseStart.getTime())) {
                const now = new Date();
                const hideTime = new Date(
                  courseStart.getTime() + 2 * 60 * 60 * 1000,
                ); // 2 hours after start (1 hour after finalizing)
                if (now > hideTime) return false;
              }
            }

            // Hide activities whose date passed more than 7 days ago
            if (a.fecha) {
              const actDate = new Date(a.fecha + "T00:00:00");
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              // Normalize sevenDaysAgo to start of day for accurate comparison
              sevenDaysAgo.setHours(0, 0, 0, 0);
              if (actDate < sevenDaysAgo) return false;
            }
            return true;
          })
          .map((a) => {
            const dynamicEstado = getDynamicEstado(a.fecha, a.hora);
            return {
              ...a,
              estado: dynamicEstado,
              isEnrolled: enrolledIds.has(a.id),
            };
          });

        processed.sort((a, b) => {
          // 1. Inscritos primero
          if (a.isEnrolled && !b.isEnrolled) return -1;
          if (!a.isEnrolled && b.isEnrolled) return 1;

          // 2. Finalizados al último
          if (a.estado === "finalizado" && b.estado !== "finalizado") return 1;
          if (a.estado !== "finalizado" && b.estado === "finalizado") return -1;

          // 3. Orden por fecha
          return (
            new Date(a.fecha + "T00:00:00") - new Date(b.fecha + "T00:00:00")
          );
        });

        setActividades(processed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const canalActividades = supabase
      .channel("public-actividades-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "actividad" },
        async (payload) => {
          // Invalidar caché local al recibir cualquier actualización en la tabla
          const { apiCache } = await import("../../../utils/apiCache");
          apiCache.invalidate("academico");

          if (payload.eventType === "DELETE") {
            setActividades((prev) =>
              prev.filter((a) => a.id !== payload.old.id),
            );
          } else if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            try {
              const updatedAct = await academicoApi.obtenerActividadPorId(
                payload.new.id,
              );

              const isEnrolled =
                isAuthenticated && user?.id
                  ? await academicoApi.verificarInscripcion(
                      user.id,
                      payload.new.id,
                    )
                  : false;

              const dynamicEstado = getDynamicEstado(
                updatedAct.fecha,
                updatedAct.hora,
              );
              const processedAct = {
                ...updatedAct,
                estado: dynamicEstado,
                isEnrolled,
              };

              setActividades((prev) => {
                const filtered = prev.filter((a) => a.id !== processedAct.id);
                if (processedAct.publicado === false) return filtered;

                if (processedAct.fecha && processedAct.hora) {
                  const startStr = `${processedAct.fecha}T${processedAct.hora}`;
                  const courseStart = new Date(startStr);
                  if (!isNaN(courseStart.getTime())) {
                    const now = new Date();
                    const hideTime = new Date(
                      courseStart.getTime() + 2 * 60 * 60 * 1000,
                    );
                    if (now > hideTime) return filtered;
                  }
                }
                if (processedAct.fecha) {
                  const actDate = new Date(processedAct.fecha + "T00:00:00");
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  sevenDaysAgo.setHours(0, 0, 0, 0);
                  if (actDate < sevenDaysAgo) return filtered;
                }

                const updatedList = [processedAct, ...filtered];
                updatedList.sort((a, b) => {
                  if (a.isEnrolled && !b.isEnrolled) return -1;
                  if (!a.isEnrolled && b.isEnrolled) return 1;
                  if (a.estado === "finalizado" && b.estado !== "finalizado")
                    return 1;
                  if (a.estado !== "finalizado" && b.estado === "finalizado")
                    return -1;
                  return (
                    new Date(a.fecha + "T00:00:00") -
                    new Date(b.fecha + "T00:00:00")
                  );
                });
                return updatedList;
              });
            } catch (err) {
              console.error(
                "Error procesando actualización en tiempo real:",
                err,
              );
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalActividades);
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (loading || actividades.length === 0) return;

    const reevaluateStates = () => {
      setActividades((prev) => {
        const now = new Date();
        const filtered = prev.filter((a) => {
          if (a.fecha && a.hora) {
            const startStr = `${a.fecha}T${a.hora}`;
            const courseStart = new Date(startStr);
            if (!isNaN(courseStart.getTime())) {
              const hideTime = new Date(
                courseStart.getTime() + 2 * 60 * 60 * 1000,
              );
              if (now > hideTime) return false;
            }
          }
          return true;
        });

        const updated = filtered.map((a) => {
          const dynamicEstado = getDynamicEstado(a.fecha, a.hora);
          if (a.estado === dynamicEstado) return a;
          return { ...a, estado: dynamicEstado };
        });

        const hasChanges =
          updated.length !== prev.length ||
          updated.some((a, idx) => a.estado !== prev[idx].estado);
        if (!hasChanges) return prev;

        const sorted = [...updated];
        sorted.sort((a, b) => {
          if (a.isEnrolled && !b.isEnrolled) return -1;
          if (!a.isEnrolled && b.isEnrolled) return 1;

          if (a.estado === "finalizado" && b.estado !== "finalizado") return 1;
          if (a.estado !== "finalizado" && b.estado === "finalizado") return -1;

          return (
            new Date(a.fecha + "T00:00:00") - new Date(b.fecha + "T00:00:00")
          );
        });
        return sorted;
      });
    };

    const interval = setInterval(reevaluateStates, 10000); // Re-evaluate every 10 seconds

    return () => clearInterval(interval);
  }, [loading, actividades.length]);

  const filteredActividades = actividades.filter((act) => {
    const query = searchQuery.toLowerCase();
    return (
      act.nombre?.toLowerCase().includes(query) ||
      act.descripcion?.toLowerCase().includes(query) ||
      (act.estado && act.estado.toLowerCase().includes(query)) ||
      (act.fecha &&
        new Date(act.fecha + "T00:00:00")
          .toLocaleDateString("es-ES")
          .includes(query))
    );
  });

  const totalPages = Math.ceil(filteredActividades.length / ITEMS_PER_PAGE);
  const paginatedActividades = filteredActividades.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link
            to="/inicio"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Participa de Nuestras Actividades
          </h1>
        </div>
      </header>

      {/* buscador premium */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Buscar actividad por nombre, descripción..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[350px] sm:h-[400px] animate-pulse rounded-2xl sm:rounded-3xl bg-slate-100 shadow-inner"
            />
          ))
        ) : paginatedActividades.length > 0 ? (
          paginatedActividades.map((act) => (
            <Link
              key={act.id}
              to={`/actividades/${act.id}`}
              className="group relative flex flex-col rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden hover:-translate-y-2"
            >
              {/* Imagen de Cabecera */}
              <div className="relative h-32 sm:h-44 md:h-48 w-full overflow-hidden">
                {act.imagen ? (
                  <img
                    src={act.imagen}
                    alt={act.nombre}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                    <span className="text-white/20 font-black text-4xl italic uppercase truncate">
                      ACTIVIDAD
                    </span>
                  </div>
                )}
                {/* Badges de Tipo y Estado apilados para evitar solapamiento */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg bg-emerald-500/90 text-white backdrop-blur-md border border-white/10">
                    {act.tipo_nombre}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md border border-white/20 text-white ${
                      act.estado === "finalizado" || act.estado === "finalizada"
                        ? "bg-slate-900/60"
                        : "bg-emerald-500/80"
                    }`}
                  >
                    {act.estado === "en_curso"
                      ? "En proceso"
                      : act.estado === "finalizado"
                        ? "Finalizado"
                        : "Programada"}
                  </span>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-3.5 sm:p-5 flex flex-col flex-1">
                <div className="flex flex-col gap-1 items-start mb-1.5">
                  {act.isEnrolled && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md uppercase tracking-widest">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Inscrito
                    </span>
                  )}
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-tight">
                    {act.nombre}
                  </h3>
                </div>

                {/* Metadata compacta (apilada en móvil/tablet y horizontal en desktop) */}
                <div className="mt-1 flex flex-col gap-y-1 items-start md:flex-row md:items-center md:gap-x-3 text-slate-500 text-[10px] sm:text-xs">
                  <div
                    className="flex items-center gap-1 min-w-0"
                    title="Fecha"
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-700 truncate">
                      {new Date(act.fecha + "T00:00:00").toLocaleDateString(
                        "es-ES",
                        { day: "numeric", month: "long" },
                      )}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-1 min-w-0"
                    title="Horario"
                  >
                    <Clock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-700 truncate">
                      {formatHora(act.hora)}
                    </span>
                  </div>
                </div>

                {/* Footer divisor con botón */}
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs sm:text-sm font-black text-emerald-600 group-hover:gap-3 transition-all">
                    MÁS DETALLES <ArrowRight className="h-4 w-4" />
                  </span>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-16 sm:py-32 flex flex-col items-center justify-center bg-white rounded-2xl sm:rounded-[40px] border border-dashed border-slate-200">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
              <Users className="h-12 w-12 text-slate-300" />
            </div>
            <p className="text-slate-500 text-lg font-medium italic">
              No se encontraron actividades.
            </p>
          </div>
        )}
      </div>

      {/* paginacion responsive */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-500">
            Mostrando{" "}
            <span className="font-semibold text-slate-900">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            a{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(
                currentPage * ITEMS_PER_PAGE,
                filteredActividades.length,
              )}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-900">
              {filteredActividades.length}
            </span>{" "}
            actividades
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
