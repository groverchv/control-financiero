import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, width = 'max-w-4xl' }) => {
  const modalRef = useRef(null);

  // Escuchar la tecla Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap (Atrapar foco del teclado en Tabulación)
  useEffect(() => {
    if (!isOpen) return;

    const focusableElementsSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const modalElement = modalRef.current;
    
    if (!modalElement) return;

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      const focusables = modalElement.querySelectorAll(focusableElementsSelector);
      if (focusables.length === 0) return;

      const firstElement = focusables[0];
      const lastElement = focusables[focusables.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleTabKey);

    // Auto-enfocar el primer elemento al abrir
    const focusables = modalElement.querySelectorAll(focusableElementsSelector);
    if (focusables.length > 0) {
      setTimeout(() => {
        focusables[0].focus();
      }, 50);
    }

    return () => window.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div ref={modalRef} className={`w-full ${width} rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh] transition-all animate-in fade-in zoom-in duration-200`}>
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

