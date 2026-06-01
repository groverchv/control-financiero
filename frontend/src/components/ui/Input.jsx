export const Input = ({
  label,
  id,
  type = 'text',
  error,
  className = '',
  ...props
}) => {
  const baseClasses = `w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all ${className}`;

  const handleOnChange = (e) => {
    if (type === 'number' && e.target.value) {
      const val = e.target.value;
      if (val.startsWith('0') && !val.startsWith('0.') && !isNaN(Number(val))) {
        e.target.value = String(Number(val));
      } else if (val.startsWith('-0') && !val.startsWith('-0.') && !isNaN(Number(val))) {
        e.target.value = String(Number(val));
      }
    }
    if (props.onChange) {
      props.onChange(e);
    }
  };

  return (
    <div className="space-y-2 w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea
          id={id}
          className={`${baseClasses} min-h-[100px] resize-none`}
          {...props}
          onChange={handleOnChange}
        />
      ) : (
        <input
          id={id}
          type={type}
          className={baseClasses}
          {...props}
          onChange={handleOnChange}
        />
      )}
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
};
