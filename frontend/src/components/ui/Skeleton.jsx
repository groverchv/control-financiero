import React from 'react';

export const Skeleton = ({ variant = 'text', className = '' }) => {
  const baseClass = "animate-pulse bg-slate-200 dark:bg-slate-700 rounded";

  if (variant === 'kpi') {
    return (
      <div className={`h-24 w-full p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center gap-4 ${className}`}>
        <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2.5 min-w-0">
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
          <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded animate-pulse w-1/3" />
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`space-y-3 w-full ${className}`}>
        <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse w-full" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-pulse w-full flex items-center justify-between px-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/6" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/5" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'text') {
    return <div className={`${baseClass} h-4 w-full ${className}`} />;
  }

  return <div className={`${baseClass} ${className}`} />;
};
