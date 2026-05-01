export const Tooltip = ({ text, children }) => {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
};
