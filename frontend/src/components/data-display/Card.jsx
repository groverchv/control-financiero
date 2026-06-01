export const Card = ({
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <div className={`rounded-md bg-white p-6 shadow-sm ${className}`}>
      {title ? <h3 className="text-base font-semibold text-slate-900">{title}</h3> : null}
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
};
