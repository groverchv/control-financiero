import CryptoJS from 'crypto-js';

const SECRET_KEY = 'nobleve-key-safe-3129847129';

export const encryptPassword = (password) => {
  if (!password) return '';
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};

export const decryptPassword = (encryptedPassword) => {
  if (!encryptedPassword) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error('Error decrypting password:', error);
    return '';
  }
};
