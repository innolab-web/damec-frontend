/**
 * Módulo de compresión y normalización de imágenes para DAMEC
 * Convierte fotografías a WebP (máx 1280px, calidad 0.75) con tamaño objetivo < 150 KB.
 * Decodifica asíncronamente vía createImageBitmap para evitar bloquear el hilo principal.
 */

export interface CompressionResult {
  blob: Blob;
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
}

export async function compressImageToWebP(
  file: File,
  maxWidth = 1280,
  quality = 0.75
): Promise<CompressionResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida.');
  }

  // createImageBitmap permite decodificar de forma asíncrona fuera del render loop
  const imageBitmap = await createImageBitmap(file);

  // Proporciones preservando aspect-ratio
  let width = imageBitmap.width;
  let height = imageBitmap.height;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  // Render en Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto 2D de Canvas.');
  }

  ctx.drawImage(imageBitmap, 0, 0, width, height);

  // Exportar a Blob WebP (con fallback a JPEG si el navegador no soporta WebP toBlob)
  const mimeType = 'image/webp';

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) {
          // Fallback a JPEG si WebP no fue producido
          canvas.toBlob(
            (fallbackBlob) => {
              if (fallbackBlob) resolve(fallbackBlob);
              else reject(new Error('Fallo al exportar el canvas a Blob.'));
            },
            'image/jpeg',
            quality
          );
        } else {
          resolve(b);
        }
      },
      mimeType,
      quality
    );
  });

  // Generar Data URL para previsualización inmediata en UI
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  return {
    blob,
    dataUrl,
    originalSizeBytes: file.size,
    compressedSizeBytes: blob.size,
    width,
    height
  };
}
