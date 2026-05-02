import { useState, useMemo } from 'react';
import { FileSpreadsheet, FileText, FileType, Filter } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

export const ExportButtons = ({ data, filename = 'reporte', title = 'Reporte Institucional' }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const allHeaders = useMemo(() => {
    if (!data || data.length === 0) return [];
    const headers = new Set();
    data.forEach(item => Object.keys(item).forEach(k => headers.add(k)));
    return Array.from(headers);
  }, [data]);

  const [selectedColumns, setSelectedColumns] = useState({});
  const [filters, setFilters] = useState({});

  useMemo(() => {
    setSelectedColumns(allHeaders.reduce((acc, h) => ({ ...acc, [h]: true }), {}));
    setFilters(allHeaders.reduce((acc, h) => ({ ...acc, [h]: '' }), {}));
  }, [allHeaders]);

  const toggleColumn = (col) => {
    setSelectedColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const handleFilterChange = (col, value) => {
    setFilters(prev => ({ ...prev, [col]: value }));
  };

  const getProcessedData = () => {
    if (!data) return [];
    
    // Filter
    const filtered = data.filter(row => {
      return allHeaders.every(header => {
        const filterVal = filters[header];
        if (!filterVal) return true; 
        const cellVal = row[header] !== undefined && row[header] !== null ? String(row[header]).toLowerCase() : '';
        return cellVal.includes(filterVal.toLowerCase());
      });
    });

    // Select columns
    const activeHeaders = allHeaders.filter(h => selectedColumns[h]);
    
    return filtered.map(row => {
      const newRow = {};
      activeHeaders.forEach(h => {
        newRow[h] = row[h];
      });
      return newRow;
    });
  };

  const downloadFile = (content, mimeType, extension) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const executeExport = (format) => {
    const processedData = getProcessedData();
    if (processedData.length === 0) {
      alert("No hay datos para exportar con los filtros actuales.");
      return;
    }

    const activeHeaders = Object.keys(processedData[0]);

    if (format === 'csv') {
      const csvContent = [
        activeHeaders.join(','),
        ...processedData.map(row => activeHeaders.map(h => {
          const val = row[h] === null || row[h] === undefined ? '' : row[h];
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(','))
      ].join('\n');
      downloadFile(csvContent, 'text/csv;charset=utf-8;', 'csv');
    } 
    else if (format === 'txt') {
      const txtContent = [
        title.toUpperCase(),
        '='.repeat(title.length),
        `Fecha: ${new Date().toLocaleString()}`,
        '',
        activeHeaders.join('\t'),
        '-'.repeat(activeHeaders.join('\t').length),
        ...processedData.map(row => activeHeaders.map(h => row[h]).join('\t'))
      ].join('\n');
      downloadFile(txtContent, 'text/plain;charset=utf-8;', 'txt');
    }
    else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      const html = `
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #333; }
              h1 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
              th { background-color: #f8fafc; color: #64748b; text-align: left; padding: 10px; border: 1px solid #e2e8f0; }
              td { padding: 10px; border: 1px solid #e2e8f0; }
              tr:nth-child(even) { background-color: #f1f5f9; }
              .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <p>Generado el: ${new Date().toLocaleString()}</p>
            <table>
              <thead>
                <tr>${activeHeaders.map(h => `<th>${h.toUpperCase()}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${processedData.map(row => `
                  <tr>${activeHeaders.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>
                `).join('')}
              </tbody>
            </table>
            <div className="footer">Control Financiero Institucional - Reporte Oficial</div>
            <script>window.print();</script>
          </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
    }
    setIsOpen(false);
  };

  if (!data || data.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled className="flex items-center gap-2">
        <Filter className="h-4 w-4" /> Configurar Reporte
      </Button>
    );
  }

  const processedCount = getProcessedData().length;

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
      >
        <Filter className="h-4 w-4" />
        Configurar Reporte
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Configuración de Reporte" width="max-w-3xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Selección de Columnas */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" /> Atributos a incluir
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {allHeaders.map(header => (
                  <label key={header} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded">
                    <input 
                      type="checkbox" 
                      checked={selectedColumns[header] || false}
                      onChange={() => toggleColumn(header)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="truncate">{header}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4 text-emerald-600" /> Filtros de datos
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {allHeaders.map(header => (
                  <div key={header}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{header}</label>
                    <input
                      type="text"
                      placeholder={`Filtrar por ${header.toLowerCase()}...`}
                      value={filters[header] || ''}
                      onChange={(e) => handleFilterChange(header, e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 flex justify-between items-center border border-blue-100">
            <span>Se exportarán <strong>{processedCount}</strong> registros de {data.length} en total.</span>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button 
              onClick={() => executeExport('pdf')}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              disabled={processedCount === 0}
            >
              <FileType className="h-4 w-4" /> PDF
            </Button>
            <Button 
              onClick={() => executeExport('csv')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
              disabled={processedCount === 0}
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button 
              onClick={() => executeExport('txt')}
              className="bg-slate-700 hover:bg-slate-800 text-white flex items-center gap-2"
              disabled={processedCount === 0}
            >
              <FileText className="h-4 w-4" /> TXT
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
