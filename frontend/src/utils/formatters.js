export const formatCurrency = (value, currency = 'BS') => {
  const symbol = currency === 'BS' ? 'Bs' : '$';
  return `${symbol} ${value.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
};

export const formatDate = (date, locale = 'es-BO') => {
  if (!date) return '';
  let parsedDate = date;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    parsedDate = date + 'T00:00:00';
  }
  return new Date(parsedDate).toLocaleDateString(locale);
};

export const formatDateTime = (date, locale = 'es-BO') => {
  if (!date) return '';
  let parsedDate = date;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    parsedDate = date + 'T00:00:00';
  }
  return new Date(parsedDate).toLocaleString(locale);
};

export const getDynamicEstado = (fecha, hora) => {
  if (!fecha || !hora) return 'programado';
  
  // Concatenate date and time as YYYY-MM-DDTHH:mm:ss
  const startStr = `${fecha}T${hora}`;
  const courseStart = new Date(startStr);
  
  if (isNaN(courseStart.getTime())) return 'programado';
  
  const now = new Date();
  const oneHour = 60 * 60 * 1000; // 1 hour in ms
  const courseEndEnrollment = new Date(courseStart.getTime() + oneHour);
  
  if (now < courseStart) {
    return 'programado';
  } else if (now >= courseStart && now <= courseEndEnrollment) {
    return 'en_curso';
  } else {
    return 'finalizado';
  }
};

