/**
 * Servicio de gestión de imágenes con Cloudinary.
 *
 * Estándar: Fácil de Mantener — documentación de módulo.
 *
 * Responsabilidades:
 *  1. Compresión de imágenes del lado del cliente (Canvas API)
 *  2. Subida directa a Cloudinary (unsigned upload con preset)
 *  3. Eliminación de imágenes por public_id
 *
 * Variables de entorno requeridas:
 *  - VITE_CLOUDINARY_CLOUD_NAME: Nombre del cloud en Cloudinary
 *  - VITE_CLOUDINARY_UPLOAD_PRESET: Preset de subida (default: 'ml_default')
 *
 * @module services/cloudinary
 */
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

/**
 * Comprime una imagen en el lado del cliente usando un elemento Canvas
 * @param {File} file - El archivo original
 * @param {number} maxQuality - Calidad inicial del JPG (0.1 a 1.0)
 * @returns {Promise<File>} - El archivo comprimido
 */
const compressImage = (file, maxQuality = 0.75) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Limitar dimensiones máximas si la imagen es masiva (ej. > 3000px)
        const MAX_DIM = 2400;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir canvas a Blob en formato JPEG con calidad optimizada
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // Fallback al original si falla el canvas
              return;
            }
            // Crear el nuevo archivo conservando el nombre original
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          maxQuality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

/**
 * Servicio para gestionar la subida de archivos a Cloudinary con compresión local
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
      let fileToUpload = file;
      const TEN_MB = 10 * 1024 * 1024;

      // 2. Compresión automática si supera los 10MB
      if (file.size > TEN_MB && file.type.startsWith('image/')) {
        console.log(`[Cloudinary Service] Archivo original pesa ${(file.size / 1024 / 1024).toFixed(2)}MB. Comprimiendo localmente...`);
        fileToUpload = await compressImage(file, 0.7);
        console.log(`[Cloudinary Service] Archivo comprimido pesa ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB.`);
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);
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
   * Sube un archivo PDF u otros documentos
   */
  uploadDocument: async (file, folder = 'documentos') => {
    try {

      const TEN_MB = 10 * 1024 * 1024;
      if (file.size > TEN_MB) {
        // Mensaje preventivo sobre PDFs demasiado pesados
        console.warn(`[Cloudinary Service] Advertencia: El documento ${file.name} pesa más de 10MB. Puede tardar o ser rechazado por la red.`);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
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
