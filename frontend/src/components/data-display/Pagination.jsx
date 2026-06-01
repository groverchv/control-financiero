export const Pagination = ({
  page,
  totalPages,
  onChange,
}) => {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center justify-between text-sm">
      <button
        type="button"
        className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        onClick={() => onChange(page - 1)}
        disabled={!canPrev}
      >
        Anterior
      </button>
      <span className="text-slate-500">Pagina {page} de {totalPages}</span>
      <button
        type="button"
        className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        onClick={() => onChange(page + 1)}
        disabled={!canNext}
      >
        Siguiente
      </button>
    </div>
  );
};
