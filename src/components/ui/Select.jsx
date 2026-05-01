export const Select = ({
  label,
  id,
  error,
  className = '',
  children,
  ...props
}) => {
  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <select
        id={id}
        className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
};
