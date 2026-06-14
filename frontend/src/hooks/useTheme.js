import { useState, useEffect } from 'react';

/**
 * Hook para gestionar el tema del sistema (Claro, Oscuro, Sistema)
 * Sincroniza con localStorage y escucha cambios del sistema.
 */
export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (currentTheme) => {
      if (currentTheme === 'dark') {
        root.classList.add('dark');
      } else if (currentTheme === 'light') {
        root.classList.remove('dark');
      } else {
        // Modo Sistema
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    // Suscribirse a cambios del tema del sistema operativo
    let mediaQuery;
    let handleSystemThemeChange;
    if (theme === 'system') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      handleSystemThemeChange = () => {
        applyTheme('system');
      };
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    }

    // Suscribirse a cambios en localStorage (sincronización entre layouts/pestañas)
    const handleStorageChange = (e) => {
      if (e.key === 'theme' && e.newValue) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (mediaQuery && handleSystemThemeChange) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [theme]);

  return [theme, setTheme];
};
