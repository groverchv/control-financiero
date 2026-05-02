# ☁️ Integración Cloudinary - Servicio de Gestión de Archivos

## Arquitectura

```mermaid
graph TD
    A["Admin sube imagen Evento/Curso"] -->|academicoApi| C["cloudinaryService"]
    B["Socio/Admin sube foto/documento"] -->|administracionApi| C
    C -->|REST API (Unsigned Upload)| D["Cloudinary Cloud"]
    D -->|Devuelve secure_url| C
    C -->|Guarda URL en Supabase| E["Supabase (tabla archivo)"]
```

## Archivos Creados/Modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/services/cloudinary.js` | **Nuevo** | Servicio principal para subida de archivos a la nube |
| `src/features/academico/api/index.js` | Modificado | Gestiona imágenes de portadas para eventos y actividades académicas |
| `src/features/administracion/api/index.js` | Modificado | Gestiona subida de fotos de perfil y documentos de miembros |

## Funciones del Servicio Cloudinary

| Función | Propósito | Tipo de Archivo | Carpeta por Defecto |
|---------|-----------|-----------------|---------------------|
| `uploadFile` | Subir imágenes y fotos | Imágenes (jpg, png, webp) | `miembros` (se sobreescribe a `eventos`/`actividades`) |
| `uploadDocument` | Subir documentos institucionales | Documentos (pdf, etc) | `documentos` (se sobreescribe con el ID del socio) |

## Flujo de Subida de Archivos

### 1. Subida de Imágenes para Eventos / Cursos
1. El usuario selecciona una imagen en el formulario.
2. Al guardar, se invoca `crearEvento` o `actualizarEvento` (lo mismo para actividades).
3. Si hay una imagen, se sube primero a Cloudinary usando `cloudinaryService.uploadFile(file, 'eventos')`.
4. Cloudinary devuelve una URL segura (`secure_url`).
5. La URL devuelta se guarda en la tabla `archivo` de Supabase relacionada al `evento_id` o `actividad_academica_id`.

### 2. Gestión de Fotos de Perfil y Documentos (Miembros)
1. El socio o administrador carga un archivo en el perfil.
2. Se llama a `administracionApi.subirArchivo(miembroId, file, tipo)`.
3. Según el tipo MIME (`image/`), usa `uploadFile` o `uploadDocument`.
4. El archivo se guarda en Cloudinary en una subcarpeta específica del miembro: `miembros/{miembroId}`.
5. Se inserta o actualiza el registro en la tabla `archivo` relacionándolo al `miembro_id`.

> [!IMPORTANT]
> El servicio utiliza **Unsigned Uploads**. Por ello, requiere que las variables de entorno `VITE_CLOUDINARY_CLOUD_NAME` y `VITE_CLOUDINARY_UPLOAD_PRESET` estén correctamente configuradas en el archivo `.env.local`.

## Ejemplo de Uso Directo

```javascript
import { cloudinaryService } from '../../../services/cloudinary';

// Subir imagen para un evento
const imagenFile = document.getElementById('fileInput').files[0];
const url = await cloudinaryService.uploadFile(imagenFile, 'eventos');
console.log('Imagen subida en:', url);

// Subir documento pdf para un miembro
const pdfFile = document.getElementById('pdfInput').files[0];
const docUrl = await cloudinaryService.uploadDocument(pdfFile, \`miembros/\${miembroId}\`);
```

> [!TIP]
> Los archivos servidos desde Cloudinary se entregan a través de un CDN optimizado globalmente, lo que asegura tiempos de carga muy rápidos para los usuarios finales.
