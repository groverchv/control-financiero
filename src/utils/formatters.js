export const formatCurrency = (value, currency = 'BS') => {
  const symbol = currency === 'BS' ? 'Bs' : '$';
  return `${symbol} ${value.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
};

export const formatDate = (date, locale = 'es-BO') => {
  return new Date(date).toLocaleDateString(locale);
};

export const formatDateTime = (date, locale = 'es-BO') => {
  return new Date(date).toLocaleString(locale);
};
