/**
 * Servicio de gestión de imágenes y documentos con Cloudinary.
 *
 * Estándar: Fácil de Mantener — documentación de módulo.
 *
 * Responsabilidades:
 *  1. Subida directa a Cloudinary (unsigned upload con preset) con indicador de progreso en tiempo real (%)
 *  2. Gestión de imágenes y documentos (PDF, etc.)
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
 * Descarga un archivo CV asignando automáticamente el nombre con el formato "[Nombre_Socio]-CV.pdf"
 * @param {string} url - La URL del archivo en Cloudinary o backend
 * @param {string} nombreSocio - El nombre completo del socio
 */
export const downloadCvFile = async (url, nombreSocio = 'Socio') => {
  if (!url) return;

  // Sanitizar el nombre del socio para el archivo de descarga (ej: Grover_Chavez)
  const cleanName = (nombreSocio || 'Socio')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Eliminar caracteres especiales
    .trim()
    .replace(/\s+/g, '_'); // Reemplazar espacios por guion bajo

  const ext = url.toLowerCase().endsWith('.doc') ? '.doc' : url.toLowerCase().endsWith('.docx') ? '.docx' : '.pdf';
  const filename = `${cleanName}-CV${ext}`;

  try {
    // 1. Usar Fetch + Blob local para forzar a Windows y Chrome a mostrar "[Nombre_Socio]-CV.pdf" en el cuadro "Guardar como"
    const response = await fetch(url);
    if (!response.ok) throw new Error('Respuesta de red no ok');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch (err) {
    console.warn('[Cloudinary Service] Fallback de descarga por fl_attachment:', err);
    // 2. Fallback mediante Cloudinary fl_attachment
    const downloadUrl = url.includes('/upload/') 
      ? url.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(cleanName + '-CV')}/`)
      : url;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

/**
 * Helper para realizar peticiones de subida XHR reportando eventos de progreso en tiempo real
 */
const uploadWithXHR = (url, formData, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (xhr.upload && typeof onProgress === 'function') {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.error?.message || 'Error al subir a Cloudinary'));
        } catch {
          reject(new Error(`Error de subida HTTP (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Error de conexión de red al subir el archivo.'));
    xhr.send(formData);
  });
};

/**
 * Servicio para gestionar la subida de archivos a Cloudinary con reporte de avance
 */
export const cloudinaryService = {
  /**
   * Sube una imagen a Cloudinary usando el API REST (Unsigned Upload)
   * @param {File} file - El archivo a subir
   * @param {string} folder - Carpeta de destino opcional
   * @param {Function} onProgress - Callback opcional para reportar % de avance (0-100)
   * @returns {Promise<string>} - La URL del archivo subido
   */
  uploadFile: async (file, folder = 'miembros', onProgress) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', folder);

      const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
      const data = await uploadWithXHR(endpoint, formData, onProgress);
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);
      throw error;
    }
  },

  /**
   * Sube un archivo PDF u otros documentos a Cloudinary
   * @param {File} file - El archivo a subir
   * @param {string} folder - Carpeta de destino opcional
   * @param {Function} onProgress - Callback opcional para reportar % de avance (0-100)
   * @returns {Promise<string>} - La URL del documento subido
   */
  uploadDocument: async (file, folder = 'documentos', onProgress) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', folder);

      const autoEndpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
      try {
        const data = await uploadWithXHR(autoEndpoint, formData, onProgress);
        return data.secure_url;
      } catch {
        const rawEndpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;
        const data = await uploadWithXHR(rawEndpoint, formData, onProgress);
        return data.secure_url;
      }
    } catch (error) {
      console.error('Cloudinary Document Upload Error:', error);
      throw error;
    }
  }
};
