import { FolderSearch } from 'lucide-react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon = FolderSearch,
  title = "No hay registros",
  description = "Aún no se ha encontrado información en esta sección.",
  actionLabel,
  onAction,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in zoom-in duration-300 ${className}`}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50 mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-sm">
          <Icon className="h-7 w-7" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
