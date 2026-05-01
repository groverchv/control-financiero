export const Toast = ({
  title,
  message,
  variant = 'info',
}) => {
  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    error: 'border-red-200 bg-red-50 text-red-700',
  };

  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${styles[variant]}`}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {message ? <p className="mt-1">{message}</p> : null}
    </div>
  );
};
