import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'dossier-files';

/**
 * Upload an image file (or canvas blob) to Supabase Storage.
 * Returns the public URL.
 */
export async function uploadImage(
  file: File | Blob,
  folder: string,
  fileName?: string,
): Promise<string> {
  const name = fileName || `${crypto.randomUUID()}.jpg`;
  const path = `${folder}/${name}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Resize an image File on a canvas and return it as a Blob (not base64).
 */
export function resizeImageToBlob(
  file: File,
  maxSize: number,
  quality = 0.7,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          const ratio = Math.min(maxSize / w, maxSize / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob failed'));
          },
          'image/jpeg',
          quality,
        );
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Delete a file from storage by its public URL.
 */
export async function deleteStorageFile(publicUrl: string): Promise<void> {
  // Extract path after /object/public/dossier-files/
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return; // not a storage URL, skip
  const path = decodeURIComponent(publicUrl.substring(idx + marker.length));
  await supabase.storage.from(BUCKET).remove([path]);
}

/**
 * Check if a URL is a Supabase Storage URL (vs legacy base64).
 */
export function isStorageUrl(url: string): boolean {
  return url.startsWith('http') && url.includes(BUCKET);
}
