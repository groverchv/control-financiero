export const Modal = ({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-md bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        <div className="px-6 py-4">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          {footer ? footer : (
            <button
              type="button"
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={onClose}
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
