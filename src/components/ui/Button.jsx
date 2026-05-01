export const Button = ({
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2';
  const variants = {
    primary: 'bg-blue-700 text-white hover:bg-blue-800',
    secondary: 'border border-slate-200 text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
