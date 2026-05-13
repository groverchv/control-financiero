import { useState, useMemo, useEffect } from 'react';
import { FileSpreadsheet, FileText, FileType, Filter } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  const [sortColumn, setSortColumn] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  const columnMetadata = useMemo(() => {
    if (!data || data.length === 0) return {};
    const metadata = {};
    
    allHeaders.forEach(header => {
      const values = data.map(item => item[header]).filter(val => val !== null && val !== undefined && val !== '');
      const uniqueValues = Array.from(new Set(values));
      
      let type = 'text';
      const headerLower = header.toLowerCase();
      if (headerLower.includes('fecha') || headerLower.includes('date') || headerLower.includes('creacion') || headerLower.includes('tiempo')) {
        type = 'date';
      } else if (values.length > 0 && values.every(v => !isNaN(Number(String(v).replace(/[^0-9.-]+/g, ""))))) {
        type = 'number';
      }

      let uniqueYears = [];
      if (type === 'date') {
        uniqueYears = Array.from(new Set(values.map(v => {
          let d = new Date(v);
          if (isNaN(d.getTime()) && typeof v === 'string') {
            const parts = v.split('/');
            if (parts.length === 3) d = new Date(parts[2], parts[1]-1, parts[0]);
          }
          return d.getFullYear();
        }).filter(y => !isNaN(y)))).sort();
      }
      
      metadata[header] = {
        uniqueValues: uniqueValues.sort(),
        type,
        uniqueYears
      };
    });
    return metadata;
  }, [data, allHeaders]);

  useEffect(() => {
    setSelectedColumns(allHeaders.reduce((acc, h) => ({ ...acc, [h]: true }), {}));
    setFilters(allHeaders.reduce((acc, h) => ({ ...acc, [h]: { mode: 'all', value1: '', value2: '' } }), {}));
  }, [allHeaders]);

  const toggleColumn = (col) => {
    setSelectedColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const handleFilterModeChange = (col, mode) => {
    setFilters(prev => ({ ...prev, [col]: { ...prev[col], mode, value1: '', value2: '' } }));
  };

  const handleFilterValueChange = (col, key, value) => {
    setFilters(prev => ({ ...prev, [col]: { ...prev[col], [key]: value } }));
  };

  const getProcessedData = () => {
    if (!data) return [];
    
    // Filter
    const filtered = data.filter(row => {
      return allHeaders.every(header => {
        // Solo aplicar filtro si la columna está seleccionada
        if (!selectedColumns[header]) return true;

        const filterState = filters[header];
        if (!filterState || filterState.mode === 'all') return true;
        
        const cellVal = row[header];
        if (cellVal === undefined || cellVal === null) return false;

        const meta = columnMetadata[header];

        if (meta.type === 'date') {
          let d = new Date(cellVal);
          if (isNaN(d.getTime()) && typeof cellVal === 'string') {
            const parts = cellVal.split('/');
            if (parts.length === 3) d = new Date(parts[2], parts[1]-1, parts[0]);
          }
          if (isNaN(d.getTime())) return false;
          
          const y = String(d.getFullYear());
          const m = d.getMonth() + 1;
          
          if (filterState.mode === 'year') {
            if (!filterState.value1) return true;
            return y === filterState.value1;
          }
          if (filterState.mode === 'month') {
            if (!filterState.value1) return true;
            const mm = String(m).padStart(2, '0');
            return `${y}-${mm}` === filterState.value1;
          }
          if (filterState.mode === 'quarter') {
            if (!filterState.value1 || !filterState.value2) return true;
            const q = Math.ceil(m / 3);
            return y === filterState.value1 && String(q) === filterState.value2;
          }
          if (filterState.mode === 'semester') {
             if (!filterState.value1 || !filterState.value2) return true;
             const sem = m <= 6 ? '1' : '2';
             return y === filterState.value1 && sem === filterState.value2;
          }
          if (filterState.mode === 'range') {
            const start = filterState.value1 ? new Date(filterState.value1) : null;
            const end = filterState.value2 ? new Date(filterState.value2) : null;
            if (end) end.setHours(23, 59, 59, 999);
            
            if (start && end && !isNaN(start) && !isNaN(end)) return d >= start && d <= end;
            if (start && !isNaN(start)) return d >= start;
            if (end && !isNaN(end)) return d <= end;
            return true;
          }
        } else if (meta.type === 'number') {
           let numStr = String(cellVal).replace(/[^0-9.-]+/g, "");
           const num = Number(numStr);
           if (isNaN(num)) return false;

           if (filterState.mode === 'exact') {
              if (!filterState.value1) return true;
              return num === Number(filterState.value1);
           }
           if (filterState.mode === 'greater') {
              if (!filterState.value1) return true;
              return num > Number(filterState.value1);
           }
           if (filterState.mode === 'less') {
              if (!filterState.value1) return true;
              return num < Number(filterState.value1);
           }
           if (filterState.mode === 'range') {
              const min = filterState.value1 ? Number(filterState.value1) : -Infinity;
              const max = filterState.value2 ? Number(filterState.value2) : Infinity;
              return num >= min && num <= max;
           }
        } else {
           const str = String(cellVal).toLowerCase();
           if (filterState.mode === 'exact') {
             if (!filterState.value1) return true;
             return str === String(filterState.value1).toLowerCase();
           }
           if (filterState.mode === 'contains') {
             if (!filterState.value1) return true;
             return str.includes(String(filterState.value1).toLowerCase());
           }
        }
        return true;
      });
    });

    // Select columns
    const activeHeaders = allHeaders.filter(h => selectedColumns[h]);
    
    let processed = filtered.map(row => {
      const newRow = {};
      activeHeaders.forEach(h => {
        newRow[h] = row[h];
      });
      return newRow;
    });

    // Sorting
    if (sortColumn) {
      processed.sort((a, b) => {
        const valA = a[sortColumn] !== undefined && a[sortColumn] !== null ? String(a[sortColumn]) : '';
        const valB = b[sortColumn] !== undefined && b[sortColumn] !== null ? String(b[sortColumn]) : '';
        
        // Try numeric sort first
        const numA = Number(valA.replace(/[^0-9.-]+/g,""));
        const numB = Number(valB.replace(/[^0-9.-]+/g,""));
        
        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
           return sortOrder === 'asc' ? numA - numB : numB - numA;
        }
        
        // Fallback to alphabetical sort
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    return processed;
  };

  const executeExport = (format) => {
    const processedData = getProcessedData();
    if (processedData.length === 0) {
      alert("No hay datos para exportar con los filtros actuales.");
      return;
    }

    const activeHeaders = Object.keys(processedData[0]);

    if (format === 'csv' || format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(processedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
      
      // Auto-size columns based on content
      const max_width = processedData.reduce((w, r) => {
        activeHeaders.forEach(key => {
          const v = r[key] ? r[key].toString() : "";
          w[key] = Math.max(w[key] || key.length, v.length);
        });
        return w;
      }, {});
      
      worksheet['!cols'] = activeHeaders.map(key => ({ wch: max_width[key] + 2 }));
      
      XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    else if (format === 'pdf') {
      const doc = new jsPDF({ orientation: activeHeaders.length > 5 ? 'landscape' : 'portrait' });
      
      // Title
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(title, 14, 22);
      
      // Metadata
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total registros: ${processedData.length}`, 14, 36);
      
      // Table
      const tableData = processedData.map(row => activeHeaders.map(h => row[h] !== null && row[h] !== undefined ? String(row[h]) : ''));
      
      autoTable(doc, {
        startY: 45,
        head: [activeHeaders.map(h => h.toUpperCase())],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255 }, // slate-900 header
        alternateRowStyles: { fillColor: [241, 245, 249] }, // slate-100 alternate rows
        styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
        margin: { top: 45, left: 14, right: 14, bottom: 20 },
        didDrawPage: function (data) {
          // Footer
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184); // slate-400
          const str = 'Página ' + doc.internal.getNumberOfPages();
          const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
          doc.text(str, pageWidth - 14 - doc.getStringUnitWidth(str) * doc.internal.getFontSize() / doc.internal.scaleFactor, doc.internal.pageSize.height - 10);
          doc.text('Control Financiero Institucional - Reporte Oficial', 14, doc.internal.pageSize.height - 10);
        }
      });
      
      doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
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

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Configuración de Reporte" width="max-w-5xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-6">
              {/* Selección de Columnas */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" /> Atributos a exportar
                </h3>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
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

              {/* Ordenamiento */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-orange-600" /> Ordenar datos
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Ordenar por</label>
                    <select
                      value={sortColumn}
                      onChange={(e) => setSortColumn(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="">(Sin orden específico)</option>
                      {allHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Dirección</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      disabled={!sortColumn}
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:opacity-50"
                    >
                      <option value="asc">Ascendente (A-Z, Menor-Mayor)</option>
                      <option value="desc">Descendente (Z-A, Mayor-Menor)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros Dinámicos */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4 text-emerald-600" /> Filtros dinámicos
              </h3>
              <div className="space-y-4 max-h-[340px] overflow-y-auto pr-2">
                {allHeaders.filter(h => selectedColumns[h]).length === 0 ? (
                  <p className="text-sm text-slate-500 italic py-4">Seleccione atributos para habilitar sus opciones de filtrado.</p>
                ) : (
                  allHeaders.filter(h => selectedColumns[h]).map(header => {
                    const meta = columnMetadata[header];
                    const filterState = filters[header] || { mode: 'all', value1: '', value2: '' };
                    
                    return (
                      <div key={header} className="p-3 bg-white rounded border border-slate-200 shadow-sm space-y-2">
                        <label className="block text-xs font-bold text-slate-700 capitalize">
                          {header} <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-1 uppercase">{meta.type === 'date' ? 'Fecha' : meta.type === 'number' ? 'Número' : 'Texto'}</span>
                        </label>
                        
                        <select
                          value={filterState.mode}
                          onChange={(e) => handleFilterModeChange(header, e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 text-slate-700"
                        >
                          <option value="all">(Mostrar Todos)</option>
                          {meta.type === 'date' && (
                            <>
                              <option value="year">Por Año</option>
                              <option value="month">Por Mes</option>
                              <option value="quarter">Por Trimestre</option>
                              <option value="semester">Por Semestre</option>
                              <option value="range">Rango de Fechas</option>
                            </>
                          )}
                          {meta.type === 'number' && (
                            <>
                              <option value="exact">Valor Exacto</option>
                              <option value="greater">Mayor que</option>
                              <option value="less">Menor que</option>
                              <option value="range">Rango Numérico</option>
                            </>
                          )}
                          {meta.type === 'text' && (
                            <>
                              <option value="exact">Selección Estricta</option>
                              <option value="contains">Contiene el texto</option>
                            </>
                          )}
                        </select>
                        
                        {/* Dynamic Inputs */}
                        {filterState.mode !== 'all' && (
                          <div className="pt-1 mt-1 border-t border-slate-100">
                            {/* Text Inputs */}
                            {meta.type === 'text' && filterState.mode === 'exact' && (
                              <select 
                                value={filterState.value1} 
                                onChange={(e) => handleFilterValueChange(header, 'value1', e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                              >
                                <option value="">Seleccione un valor...</option>
                                {meta.uniqueValues.map(v => <option key={v} value={String(v)}>{String(v)}</option>)}
                              </select>
                            )}
                            {meta.type === 'text' && filterState.mode === 'contains' && (
                              <input type="text" placeholder="Texto a buscar..." value={filterState.value1} onChange={(e) => handleFilterValueChange(header, 'value1', e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                            )}

                            {/* Number Inputs */}
                            {meta.type === 'number' && ['exact', 'greater', 'less'].includes(filterState.mode) && (
                              <input type="number" placeholder="Ingrese valor numérico" value={filterState.value1} onChange={(e) => handleFilterValueChange(header, 'value1', e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                            )}
                            {meta.type === 'number' && filterState.mode === 'range' && (
                              <div className="flex gap-2">
                                <input type="number" placeholder="Mínimo" value={filterState.value1} onChange={(e) => handleFilterValueChange(header, 'value1', e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                                <input type="number" placeholder="Máximo" value={filterState.value2} onChange={(e) => handleFilterValueChange(header, 'value2', e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                              </div>
                            )}

                            {/* Date Inputs */}
                            {meta.type === 'date' && filterState.mode === 'year' && (
                              <select value={filterState.value1} onChange={(e) => handleFilterValueChange(header, 'value1', e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                                <option value="">Seleccione Año...</option>
                                {meta.uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                              </select>
                            )}
                            {meta.type === 'date' && filterState.mode === 'month' && (
                              <input type="month" value={filterState.value1} onChange={(e) => handleFilterValueChange(header, 'value1', e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                            )}
                            {meta.type === 'date' && (filterState.mode === 'quarter' || filterState.mode === 'semester') && (
                              <div className="flex gap-2">
                                <select value={filterState.value1} onChange={(e) => handleFilterValueChange(header, 'value1', e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                                  <option value="">Año...</option>
                                  {meta.uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                {filterState.mode === 'quarter' ? (
                                  <select value={filterState.value2} onChange={(e) => handleFilterValueChange(header, 'value2', e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                                    <option value="">Trimestre...</option>
                                    <option value="1">Q1 (Ene-Mar)</option>
                                    <option value="2">Q2 (Abr-Jun)</option>
                                    <option value="3">Q3 (Jul-Sep)</option>
                                    <option value="4">Q4 (Oct-Dic)</option>
                                  </select>
                                ) : (
                                  <select value={filterState.value2} onChange={(e) => handleFilterValueChange(header, 'value2', e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                                    <option value="">Semestre...</option>
                                    <option value="1">S1 (Ene-Jun)</option>
                                    <option value="2">S2 (Jul-Dic)</option>
                                  </select>
                                )}
                              </div>
                            )}
                            {meta.type === 'date' && filterState.mode === 'range' && (
                              <div className="flex gap-2 items-center">
                                <input type="date" value={filterState.value1} onChange={(e) => handleFilterValueChange(header, 'value1', e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600" />
                                <span className="text-slate-400 text-[10px] font-bold uppercase">A</span>
                                <input type="date" value={filterState.value2} onChange={(e) => handleFilterValueChange(header, 'value2', e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
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
