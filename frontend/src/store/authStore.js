import { create } from 'zustand';

// Carga inicial desde localStorage para evitar parpadeo de pantalla no autenticada
const loadCachedUser = () => {
  try {
    const cached = localStorage.getItem('control-financiero-auth-user');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('[authStore] Error al leer usuario de localStorage:', e);
  }
  return null;
};

const cachedUser = loadCachedUser();

export const useAuthStore = create((set) => ({
  user: cachedUser || null,
  isAuthenticated: !!cachedUser,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    localStorage.removeItem('control-financiero-auth-user');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
