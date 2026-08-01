import { EmptyState } from '../ui/EmptyState';

export const Table = ({ columns, rows, emptyMessage = 'Sin registros', emptyIcon, emptyAction, emptyActionLabel }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.length === 0 ? (
            <tr>
              <td className="p-0" colSpan={columns.length}>
                <EmptyState 
                  title={emptyMessage} 
                  icon={emptyIcon}
                  onAction={emptyAction}
                  actionLabel={emptyActionLabel}
                />
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id || index} className="hover:bg-slate-50 transition-colors">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-slate-700">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
