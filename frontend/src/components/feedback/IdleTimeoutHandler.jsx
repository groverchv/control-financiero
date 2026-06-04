import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../services/supabase";
import { useAuthStore } from "../../store/authStore";
import { Clock, ShieldAlert } from "lucide-react";

const IDLE_TIME = 14 * 60 * 1000; // 14 minutos de inactividad
const COUNTDOWN_TIME = 60; // 60 segundos de aviso

export const IdleTimeoutHandler = () => {
  const { user, logout } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_TIME);

  const idleTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const lastActiveRef = useRef(null);

  const handleLogout = useCallback(async () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    setShowWarning(false);

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    }
    logout();
    window.location.href = "/login?msg=sesion_expirada";
  }, [logout]);

  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(COUNTDOWN_TIME);
    }, IDLE_TIME);
  }, []);

  const keepSessionAlive = async () => {
    setShowWarning(false);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    try {
      await supabase.auth.getSession();
    } catch (err) {
      console.error("Error refreshing session:", err);
    }

    startIdleTimer();
  };

  useEffect(() => {
    if (!lastActiveRef.current) {
      lastActiveRef.current = Date.now();
    }

    if (!user) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (showWarning) {
        setTimeout(() => setShowWarning(false), 0);
      }
      return;
    }

    const resetTimerOnActivity = () => {
      const now = Date.now();
      const lastActive = lastActiveRef.current || now;
      if (now - lastActive > 2000) {
        lastActiveRef.current = now;
        if (!showWarning) {
          startIdleTimer();
        }
      }
    };

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    startIdleTimer();

    events.forEach((event) => {
      window.addEventListener(event, resetTimerOnActivity);
    });

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimerOnActivity);
      });
    };
  }, [user, showWarning, startIdleTimer]);

  useEffect(() => {
    if (showWarning) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [showWarning, handleLogout]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-4 animate-bounce">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">¿Sigues ahí?</h3>

        <p className="text-slate-600 text-sm mb-6">
          Por motivos de seguridad, tu sesión se cerrará automáticamente en{" "}
          <span className="font-bold text-amber-600 inline-flex items-center gap-1">
            <Clock className="h-4 w-4 animate-pulse" /> {countdown} segundos
          </span>{" "}
          debido a la inactividad.
        </p>

        <div className="flex gap-3 w-full">
          <button
            onClick={handleLogout}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cerrar sesión
          </button>
          <button
            onClick={keepSessionAlive}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-md shadow-blue-200 transition-all hover:scale-[1.02]"
          >
            Seguir conectado
          </button>
        </div>
      </div>
    </div>
  );
};
