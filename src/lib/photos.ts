import { createClient } from '@/lib/supabase/client';

/**
 * Fotos de producto: se comprimen en el navegador y se suben a Supabase Storage.
 *
 * La compresión no es un lujo: una foto de celular pesa entre 3 y 12 MB, y el
 * almacén las va a sacar con datos móviles desde el mostrador. Bajarlas a
 * ~1200px de lado largo deja archivos de 150-300 KB — sube rápido, no consume
 * el plan de datos y el catálogo carga liviano en el celular del cliente.
 */

const BUCKET = 'product-photos';

/** Lado largo máximo. Alcanza de sobra para la grilla y la ficha del producto. */
const LADO_MÁXIMO = 1200;

/** Sweet spot de JPEG: arriba de esto el archivo crece sin que se note la mejora. */
const CALIDAD = 0.82;

/**
 * Redimensiona y recomprime a JPEG.
 *
 * Va por `<img>` y no por `createImageBitmap` a propósito: los navegadores
 * aplican la orientación EXIF al renderizar un `<img>`, así que una foto
 * sacada con el celular de costado llega derecha al canvas. Con
 * `createImageBitmap` hay que pedir esa orientación a mano y el soporte es
 * más disparejo.
 */
async function comprimir(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);

  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const escala = Math.min(1, LADO_MÁXIMO / Math.max(img.naturalWidth, img.naturalHeight));
    const ancho = Math.round(img.naturalWidth * escala);
    const alto = Math.round(img.naturalHeight * escala);

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo procesar la imagen en este navegador.');

    // Fondo blanco: si el original es un PNG con transparencia, sin esto las
    // zonas transparentes salen negras al pasar a JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(img, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', CALIDAD),
    );
    if (!blob) throw new Error('No se pudo comprimir la imagen.');

    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * `crypto.randomUUID` pide Safari 15.4+; el respaldo cubre el celular viejo
 * del que carga los productos, donde si no la subida rompería sin explicación.
 */
function nombreAlAzar(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const azar = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${Date.now().toString(36)}-${azar}`;
}

/** `true` si la URL apunta a nuestro bucket (y no a Open Food Facts, por ejemplo). */
export function esFotoPropia(url: string): boolean {
  return url.includes(`/${BUCKET}/`);
}

/**
 * Saca el path dentro del bucket a partir de la URL pública.
 * `…/object/public/product-photos/abc.jpg` → `abc.jpg`
 */
function pathDesdeUrl(url: string): string | null {
  const marca = `/${BUCKET}/`;
  const i = url.indexOf(marca);
  if (i === -1) return null;

  const path = url.slice(i + marca.length).split('?')[0];
  return path || null;
}

/** Sube la foto ya comprimida y devuelve su URL pública. */
export async function uploadProductPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Ese archivo no es una imagen.');
  }

  const blob = await comprimir(file);

  // Nombre al azar y no derivado del producto: al dar de alta todavía no hay
  // id definitivo, y así reemplazar una foto nunca pisa la anterior a mitad
  // de camino.
  const nombre = `${nombreAlAzar()}.jpg`;

  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(nombre, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
  });

  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nombre);
  return data.publicUrl;
}

/**
 * Borra una foto del bucket. Silencioso a propósito: si falla, el producto ya
 * quedó guardado con la foto nueva y lo único que pasa es que sobra un archivo
 * viejo. No vale la pena frenar al usuario por eso.
 */
export async function deleteProductPhoto(url: string): Promise<void> {
  const path = pathDesdeUrl(url);
  if (!path) return;

  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error('No se pudo borrar la foto anterior:', error.message);
}
