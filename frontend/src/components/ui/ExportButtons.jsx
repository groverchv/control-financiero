import { useState, useMemo } from 'react';
import { FileSpreadsheet, FileText, FileType, Filter } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const parseLocalDate = (val) => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return new Date(val + 'T00:00:00');
    }
    const parts = val.split('/');
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    if (val.includes('T')) {
      return new Date(val);
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      return new Date(val.replace(/^(\d{4}-\d{2}-\d{2})/, '$1T00:00:00'));
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
};

const getLocalTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const ExportButtons = ({ data, filename = 'reporte', title = 'Reporte Institucional', customLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const allHeaders = useMemo(() => {
    if (!data || data.length === 0) return [];
    const headers = new Set();
    data.forEach(item => Object.keys(item).forEach(k => headers.add(k)));
    return Array.from(headers);
  }, [data]);

  const [prevHeaders, setPrevHeaders] = useState(allHeaders);
  const [selectedColumns, setSelectedColumns] = useState(() => allHeaders.reduce((acc, h) => ({ ...acc, [h]: false }), {}));
  const [filters, setFilters] = useState(() => allHeaders.reduce((acc, h) => ({ ...acc, [h]: { mode: 'all', value1: '', value2: '' } }), {}));
  const [sortColumn, setSortColumn] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // Custom empty columns state (Up to 3)
  const [customCol1Enabled, setCustomCol1Enabled] = useState(false);
  const [customCol1Name, setCustomCol1Name] = useState('Firma');
  const [customCol2Enabled, setCustomCol2Enabled] = useState(false);
  const [customCol2Name, setCustomCol2Name] = useState('Observaciones');
  const [customCol3Enabled, setCustomCol3Enabled] = useState(false);
  const [customCol3Name, setCustomCol3Name] = useState('Nota');

  if (allHeaders !== prevHeaders) {
    setPrevHeaders(allHeaders);
    setSelectedColumns(allHeaders.reduce((acc, h) => ({ ...acc, [h]: false }), {}));
    setFilters(allHeaders.reduce((acc, h) => ({ ...acc, [h]: { mode: 'all', value1: '', value2: '' } }), {}));
  }

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
      } else if (values.length > 0 && values.every(v => {
        const strVal = String(v).trim();
        if (strVal === '') return false;
        const originalCleaned = strVal.replace(/(Bs\.?|\$|\s)/gi, '').trim();
        if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g.test(originalCleaned)) return false;
        const cleaned = strVal.replace(/[^0-9.-]/g, '').trim();
        return cleaned !== '' && !isNaN(Number(cleaned));
      })) {
        type = 'number';
      }

      let uniqueYears = [];
      if (type === 'date') {
        uniqueYears = Array.from(new Set(values.map(v => {
          let d = parseLocalDate(v);
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

  const filteredHeaders = useMemo(() => {
    return allHeaders.filter(h => {
      const lower = h.toLowerCase();
      return !lower.includes('blockchain') && !lower.includes('tx');
    });
  }, [allHeaders]);

  const toggleColumn = (col) => {
    setSelectedColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const activeHeaders = useMemo(() => {
    const active = filteredHeaders.filter(h => selectedColumns[h]);
    if (customCol1Enabled && customCol1Name.trim()) {
      active.push(customCol1Name.trim());
    }
    if (customCol2Enabled && customCol2Name.trim()) {
      active.push(customCol2Name.trim());
    }
    if (customCol3Enabled && customCol3Name.trim()) {
      active.push(customCol3Name.trim());
    }
    return active;
  }, [filteredHeaders, selectedColumns, customCol1Enabled, customCol1Name, customCol2Enabled, customCol2Name, customCol3Enabled, customCol3Name]);

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
        const filterState = filters[header];
        if (!filterState || filterState.mode === 'all') return true;
        
        const cellVal = row[header];
        if (cellVal === undefined || cellVal === null) return false;

        const meta = columnMetadata[header];

        if (meta.type === 'date') {
          let d = parseLocalDate(cellVal);
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
            const start = filterState.value1 ? parseLocalDate(filterState.value1) : null;
            const end = filterState.value2 ? parseLocalDate(filterState.value2) : null;
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
    let processed = filtered.map(row => {
      const newRow = {};
      activeHeaders.forEach(h => {
        newRow[h] = row[h] === undefined ? '' : row[h];
      });
      return newRow;
    });

    // Sorting
    if (sortColumn) {
      processed.sort((a, b) => {
        const valA = a[sortColumn] !== undefined && a[sortColumn] !== null ? String(a[sortColumn]) : '';
        const valB = b[sortColumn] !== undefined && b[sortColumn] !== null ? String(b[sortColumn]) : '';
        
        const numA = Number(valA.replace(/[^0-9.-]+/g,""));
        const numB = Number(valB.replace(/[^0-9.-]+/g,""));
        
        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
           return sortOrder === 'asc' ? numA - numB : numB - numA;
        }
        
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

    if (format === 'csv' || format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(processedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
      
      const max_width = processedData.reduce((w, r) => {
        activeHeaders.forEach(key => {
          const v = r[key] ? r[key].toString() : "";
          w[key] = Math.max(w[key] || key.length, v.length);
        });
        return w;
      }, {});
      
      worksheet['!cols'] = activeHeaders.map(key => ({ wch: max_width[key] + 2 }));
      
      XLSX.writeFile(workbook, `${filename}_${getLocalTodayString()}.xlsx`);
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
      link.download = `${filename}_${getLocalTodayString()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    else if (format === 'pdf') {
      const doc = new jsPDF({ orientation: activeHeaders.length > 5 ? 'landscape' : 'portrait' });
      
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text(title, 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total registros: ${processedData.length}`, 14, 36);
      
      const tableData = processedData.map(row => activeHeaders.map(h => row[h] !== null && row[h] !== undefined ? String(row[h]) : ''));
      
      autoTable(doc, {
        startY: 45,
        head: [activeHeaders.map(h => h.toUpperCase())],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
        margin: { top: 45, left: 14, right: 14, bottom: 20 },
        didDrawPage: function () {
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          const str = 'Página ' + doc.internal.getNumberOfPages();
          const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
          doc.text(str, pageWidth - 14 - doc.getStringUnitWidth(str) * doc.internal.getFontSize() / doc.internal.scaleFactor, doc.internal.pageSize.height - 10);
          doc.text('Asociación de Profesionales Financieros - Reporte Oficial', 14, doc.internal.pageSize.height - 10);
        }
      });
      
      doc.save(`${filename}_${getLocalTodayString()}.pdf`);
    }
  };

  const processedCount = getProcessedData().length;

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 flex-1 sm:flex-none whitespace-nowrap"
      >
        <Filter className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">{customLabel || 'Generar Reporte'}</span>
        <span className="sm:hidden text-xs text-blue-700 font-bold">{customLabel || 'Generar'}</span>
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Generar Reporte" width="max-w-5xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-6">
              {/* Selección de Columnas */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <FileText className="h-4 w-4 text-blue-600" /> Atributos a exportar
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedColumns(filteredHeaders.reduce((acc, h) => ({ ...acc, [h]: true }), {}))}
                      className="text-[10px] text-blue-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      Todos
                    </button>
                    <span className="text-[10px] text-slate-350">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedColumns(filteredHeaders.reduce((acc, h) => ({ ...acc, [h]: false }), {}))}
                      className="text-[10px] text-blue-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {filteredHeaders.map(header => (
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

                {/* Columnas Vacías Personalizadas */}
                <div className="pt-3 border-t border-slate-250/50 space-y-2">
                  <span className="block text-xs font-bold text-slate-700">Columnas vacías adicionales (máx. 3)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-850 rounded border border-slate-200 shadow-sm">
                      <input 
                        type="checkbox" 
                        checked={customCol1Enabled}
                        onChange={(e) => setCustomCol1Enabled(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <input 
                        type="text" 
                        placeholder="Columna 1"
                        value={customCol1Name}
                        onChange={(e) => setCustomCol1Name(e.target.value)}
                        disabled={!customCol1Enabled}
                        className="w-full bg-transparent border-0 p-0 text-xs text-slate-700 dark:text-slate-200 focus:ring-0 disabled:opacity-50 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-850 rounded border border-slate-200 shadow-sm">
                      <input 
                        type="checkbox" 
                        checked={customCol2Enabled}
                        onChange={(e) => setCustomCol2Enabled(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <input 
                        type="text" 
                        placeholder="Columna 2"
                        value={customCol2Name}
                        onChange={(e) => setCustomCol2Name(e.target.value)}
                        disabled={!customCol2Enabled}
                        className="w-full bg-transparent border-0 p-0 text-xs text-slate-700 dark:text-slate-200 focus:ring-0 disabled:opacity-50 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-850 rounded border border-slate-200 shadow-sm">
                      <input 
                        type="checkbox" 
                        checked={customCol3Enabled}
                        onChange={(e) => setCustomCol3Enabled(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <input 
                        type="text" 
                        placeholder="Columna 3"
                        value={customCol3Name}
                        onChange={(e) => setCustomCol3Name(e.target.value)}
                        disabled={!customCol3Enabled}
                        className="w-full bg-transparent border-0 p-0 text-xs text-slate-700 dark:text-slate-200 focus:ring-0 disabled:opacity-50 focus:outline-none"
                      />
                    </div>
                  </div>
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
                      {filteredHeaders.map(header => (
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
                {filteredHeaders.map(header => {
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
                })}
              </div>
            </div>
          </div>

          {/* Vista Previa en Tiempo Real */}
          {processedCount > 0 && activeHeaders.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 shadow-inner space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vista previa (primeros 3 registros)</h4>
              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      {activeHeaders.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-bold text-slate-700 dark:text-slate-250 capitalize tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-850 divide-y divide-slate-200">
                    {getProcessedData().slice(0, 3).map((row, idx) => (
                      <tr key={idx}>
                        {activeHeaders.map(h => (
                          <td key={h} className="px-3 py-2 text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{row[h] !== null && row[h] !== undefined ? String(row[h]) : '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="p-3 rounded-md text-sm text-slate-700 dark:text-slate-200 flex justify-between items-center border border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
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
