export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  return phone.length >= 7;
};

export const isValidCurrency = (value) => {
  return typeof value === 'number' && value >= 0;
};
