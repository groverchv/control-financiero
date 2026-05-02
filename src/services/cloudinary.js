const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

/**
 * Servicio para gestionar la subida de archivos a Cloudinary
 */
export const cloudinaryService = {
  /**
   * Sube un archivo a Cloudinary usando el API REST (Unsigned Upload)
   * @param {File} file - El archivo a subir
   * @param {string} folder - Carpeta de destino opcional
   * @returns {Promise<string>} - La URL del archivo subido
   */
  uploadFile: async (file, folder = 'miembros') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al subir a Cloudinary');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);
      throw error;
    }
  },

  /**
   * Sube un archivo PDF u otros documentos (usando endpoint de imagen para mejor compatibilidad con visores)
   */
  uploadDocument: async (file, folder = 'documentos') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al subir documento a Cloudinary');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary Document Upload Error:', error);
      throw error;
    }
  }
};
